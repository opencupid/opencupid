<script setup lang="ts">
import { onMounted, onBeforeUnmount, onActivated, ref, watch, nextTick, type Component } from 'vue'
import type { Ref } from 'vue'
import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

import type { MapPoi, MapBounds } from './OsmPoiMap.types'
import {
  isValidLatLng,
  computeViewportMultiplier,
  createClusterIcon,
  hydratePoiIcon,
  clearIconCache,
} from './mapUtils'

const props = withDefaults(
  defineProps<{
    items: MapPoi[]
    iconComponent: Component
    popupComponent?: Component
    center?: [number, number]
    zoom?: number
    selectedId?: string | number
    fitToPois?: boolean
  }>(),
  {
    zoom: 7,
    fitToPois: false,
  }
)

const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds-changed', bounds: MapBounds): void
}>()

const mapEl: Ref<HTMLDivElement | null> = ref(null)
let map: LMap | null = null
let markers = new Map<string | number, LMarker>()
let itemsById = new Map<string | number, MapPoi>()
// Tracks the zoom level from the last completed zoom animation. Used by the
// center watcher to avoid capturing a mid-flyTo intermediate zoom value.
let lastStableZoom: number = props.zoom
let isMapReady = false
let pendingCenter: [number, number] | null = null
let boundsDebounceTimer: ReturnType<typeof setTimeout> | null = null
let suppressBoundsEmit = false
let resizeObserver: ResizeObserver | null = null

// Spiderfy hover region
type MCCluster = any

const SPIDER_HOVER_PADDING_PX = 40

let activeSpiderCluster: MCCluster | null = null
let activeSpiderHoverBounds: L.LatLngBounds | null = null
const spiderClickHandlers = new WeakMap<L.Marker, (ev: Event) => void>()

// Suppress child-marker popup during spiderfy animation triggered by tap/click
// so the same gesture doesn't ghost-click a child marker.
let spiderfyCooldown = false
// Tracks whether the current spiderfy was triggered by hover (no cooldown needed)
let spiderfyViaHover = false

function computeSpiderHoverBounds(
  map: LMap,
  cluster: MCCluster,
  paddingPx = SPIDER_HOVER_PADDING_PX
): L.LatLngBounds {
  const children: LMarker[] = cluster.getAllChildMarkers?.() ?? []
  if (!children.length) {
    // Defensive guard: if plugin reports no children (transient state / API mismatch),
    // return a valid bounds around the cluster center (avoids Infinity bounds).
    const ll = cluster.getLatLng?.() ?? map.getCenter()
    return L.latLngBounds(ll, ll)
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const m of children) {
    const p = map.latLngToLayerPoint(m.getLatLng())
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  minX -= paddingPx
  minY -= paddingPx
  maxX += paddingPx
  maxY += paddingPx

  // Convert back to LatLng bounds.
  // y grows downward in layer points: (minX, maxY) is bottom-left, (maxX, minY) is top-right.
  const sw = map.layerPointToLatLng(L.point(minX, maxY))
  const ne = map.layerPointToLatLng(L.point(maxX, minY))
  return L.latLngBounds(sw, ne)
}

function closeSpider() {
  if (activeSpiderCluster) {
    activeSpiderCluster.unspiderfy?.()
  }
  activeSpiderCluster = null
  activeSpiderHoverBounds = null
}

let clusterGroup: any = null

function emitBounds() {
  if (boundsDebounceTimer) clearTimeout(boundsDebounceTimer)
  boundsDebounceTimer = setTimeout(() => {
    boundsDebounceTimer = null
    if (suppressBoundsEmit) return
    if (!map) return
    // Suppress bounds-changed while a popup is open — autopan from popup open
    // would trigger a data fetch → rerender → close the popup the user just opened.
    if (popupTarget.value) return
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) return
    const b = map.getBounds()
    emit('bounds-changed', {
      south: b.getSouth(),
      north: b.getNorth(),
      west: b.getWest(),
      east: b.getEast(),
    })
  }, 300)
}

// --- map init orchestration -------------------------------------------------

function ensureMap() {
  if (map || !mapEl.value) return

  map = createLeafletMap(mapEl.value)
  initBaseLayer(map)
  initClusters(map)
}

function createLeafletMap(el: HTMLDivElement): LMap {
  const m = L.map(el, {
    center: props.center ?? [0, 0],
    zoom: props.center ? props.zoom : 2,
    maxZoom: 14,
    preferCanvas: true,
    trackResize: false,
  })

  // ResizeObserver pattern from Leaflet v2 (#9010): skip resize when the
  // container is hidden (zero dimensions) to prevent NaN in projection math.
  // When dimensions return (e.g. KeepAlive reactivation), invalidateSize and
  // replay any deferred flyTo.
  resizeObserver = new ResizeObserver(() => {
    const size = m.getSize()
    if (size.x === 0 || size.y === 0) return
    m.invalidateSize({ debounceMoveend: true })
    if (pendingCenter) {
      m.flyTo(pendingCenter, lastStableZoom, { duration: 1 })
      pendingCenter = null
    }
  })
  resizeObserver.observe(el)

  return m
}

function initBaseLayer(map: LMap): void {
  // Keep lastStableZoom in sync with the map so the center watcher always
  // uses the zoom from the last *completed* animation, never a mid-flyTo value.
  map.on('zoomend', () => {
    if (map) lastStableZoom = map.getZoom()
  })

  map.on('moveend', emitBounds)

  const tileLayer = L.tileLayer(
    `https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=${__APP_CONFIG__.MAPTILER_API_KEY}`,
    { maxZoom: 14, attribution: '© MapTiler © OpenStreetMap contributors' }
  ).addTo(map)
  tileLayer.once('load', () => onMapReady())
}

// --- clusters + spider hover region ----------------------------------------

function initClusters(map: LMap) {
  clusterGroup = (L as any).markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 40,
    spiderfyDistanceMultiplier: 1.5,
    iconCreateFunction: createClusterIcon,
  })

  // Desktop: hover to spiderfy
  clusterGroup.on('clustermouseover', onClusterMouseOver)
  clusterGroup.on('spiderfied', onClusterSpiderfied)
  clusterGroup.on('unspiderfied', onClusterUnspiderfied)

  // Both: mousemove (desktop) and touchstart (touch) to close spider
  map.on('mousemove', onMapMouseMove)
  map.on('touchstart', onMapTouchStart)
  map.on('zoomstart', closeSpider)

  map.addLayer(clusterGroup)
}

function onClusterMouseOver(e: any) {
  // Ignore hover on other clusters while a spider is already open —
  // the user must move away from the active spider to close it first.
  if (activeSpiderCluster || !map) return

  // scale spiderfy distance with viewport
  clusterGroup.options.spiderfyDistanceMultiplier = computeViewportMultiplier(map.getSize())

  spiderfyViaHover = true
  e.layer.spiderfy()
}

function onMapTouchStart(ev: L.LeafletEvent) {
  if (!activeSpiderCluster || !activeSpiderHoverBounds || !map) return
  if (popupTarget.value) return
  // touchstart doesn't carry latlng — extract from the raw TouchEvent
  const touch = ((ev as any).originalEvent as TouchEvent)?.touches?.[0]
  if (!touch) return
  const pt = map.containerPointToLatLng(
    L.point(
      touch.clientX - map.getContainer().getBoundingClientRect().left,
      touch.clientY - map.getContainer().getBoundingClientRect().top
    )
  )
  if (!activeSpiderHoverBounds.contains(pt)) closeSpider()
}

function onClusterSpiderfied(e: any) {
  if (!map) return
  activeSpiderCluster = e.cluster
  activeSpiderHoverBounds = computeSpiderHoverBounds(
    map,
    activeSpiderCluster,
    SPIDER_HOVER_PADDING_PX
  )

  // When spiderfy was triggered by a tap/click (not hover), suppress popup
  // opens briefly so the same gesture doesn't ghost-click a child marker.
  if (!spiderfyViaHover) {
    spiderfyCooldown = true
    setTimeout(() => (spiderfyCooldown = false), 400)
  }
  spiderfyViaHover = false

  // Prevent clicks on spiderfied child markers from bubbling to the map
  // (which would trigger markercluster's _unspiderfyWrapper and collapse
  // the spider). stopPropagation also blocks Leaflet's own 'click' event,
  // so we open the popup directly from the same DOM handler.
  for (const marker of e.markers) {
    const el = marker.getElement?.()
    if (!el) continue
    const handler = (ev: Event) => {
      if (spiderfyCooldown) return
      L.DomEvent.stopPropagation(ev as any)
      marker.openPopup()
    }
    spiderClickHandlers.set(marker, handler)
    L.DomEvent.on(el, 'click', handler)
  }
}

function onClusterUnspiderfied(e: any) {
  // Remove click handlers added in onClusterSpiderfied
  // to prevent accumulation across spiderfy cycles (especially with KeepAlive)
  if (e?.markers) {
    for (const marker of e.markers) {
      const el = marker.getElement?.()
      const handler = spiderClickHandlers.get(marker)
      if (el && handler) {
        L.DomEvent.off(el, 'click', handler)
        spiderClickHandlers.delete(marker)
      }
    }
  }
  activeSpiderCluster = null
  activeSpiderHoverBounds = null
}

function onMapMouseMove(ev: L.LeafletMouseEvent) {
  if (!activeSpiderCluster || !activeSpiderHoverBounds) return
  // Keep spider open while a popup is visible (user is interacting with a profile card)
  if (popupTarget.value) return
  if (!activeSpiderHoverBounds.contains(ev.latlng)) closeSpider()
}

const popupTarget = ref<HTMLElement | null>(null)
const popupItem = ref<MapPoi | null>(null)

function onMapReady() {
  if (!map) return
  isMapReady = true
  emit('map:ready', map)
  updateMarkers(true)
}

function createMarker(item: MapPoi): LMarker {
  const isSelected = item.id === props.selectedId
  const m = L.marker([item.location.lat, item.location.lon], {
    title: item.title,
    icon: hydratePoiIcon(props.iconComponent, {
      image: item.image,
      isSelected,
      isHighlighted: item.highlighted ?? false,
    }),
    keyboard: true,
  })

  if (props.popupComponent) {
    m.bindPopup('', {
      maxWidth: 420,
      autoPan: true,
      autoPanPadding: L.point(20, 20),
      className: item.highlighted ? 'item-popup item-popup-highlighted' : 'item-popup',
    })

    m.on('popupopen', (e: L.PopupEvent) => {
      const target = e.popup
        .getElement()
        ?.querySelector('.leaflet-popup-content') as HTMLElement | null
      popupTarget.value = target
      popupItem.value = item
      nextTick(() => e.popup.update())
    })
    m.on('popupclose', () => {
      popupTarget.value = null
      popupItem.value = null
    })

    m.on('click', () => m.openPopup())
  } else {
    m.on('click', () => emit('item:select', item.id))
  }
  return m
}

function updateMarkers(forceRebuild = false) {
  if (!map || !clusterGroup || !isMapReady) return
  const size = map.getSize()
  if (size.x === 0 || size.y === 0) return

  if (forceRebuild) {
    clusterGroup.clearLayers()
    markers.clear()
    itemsById.clear()
  }

  const incoming = new Map<string | number, MapPoi>()
  for (const item of props.items) {
    incoming.set(item.id, item)
  }

  // Remove markers no longer in the incoming list
  const toRemove: LMarker[] = []
  for (const [id, marker] of markers) {
    if (!incoming.has(id)) {
      toRemove.push(marker)
      markers.delete(id)
      itemsById.delete(id)
    }
  }

  // Add new markers or update changed ones in-place
  const toAdd: LMarker[] = []
  for (const [id, item] of incoming) {
    const existing = itemsById.get(id)
    if (!existing) {
      const marker = createMarker(item)
      markers.set(id, marker)
      itemsById.set(id, item)
      toAdd.push(marker)
    } else if (existing.highlighted !== item.highlighted || existing.image !== item.image) {
      const marker = markers.get(id)!
      marker.setIcon(
        hydratePoiIcon(props.iconComponent, {
          image: item.image,
          isSelected: id === props.selectedId,
          isHighlighted: item.highlighted ?? false,
        })
      )
      itemsById.set(id, item)
    }
  }

  if (toRemove.length) clusterGroup.removeLayers(toRemove)
  if (toAdd.length) clusterGroup.addLayers(toAdd)

  // Only fitBounds on initial load (all markers are new, none removed)
  if (
    toAdd.length > 0 &&
    toRemove.length === 0 &&
    markers.size === toAdd.length &&
    (props.fitToPois || !props.center) &&
    props.items.length > 0
  ) {
    const latlngs = props.items.map(
      (item) => [item.location.lat, item.location.lon] as [number, number]
    )
    const bounds = L.latLngBounds(latlngs)
    suppressBoundsEmit = true
    map.fitBounds(bounds, { padding: [24, 24] })
    map.once('moveend', () => {
      suppressBoundsEmit = false
    })
  }
}

function highlightSelected() {
  if (!map) return
  for (const [id, marker] of markers) {
    const item = itemsById.get(id)
    if (!item) continue
    marker.setIcon(
      hydratePoiIcon(props.iconComponent, {
        image: item.image,
        isSelected: id === props.selectedId,
        isHighlighted: item.highlighted ?? false,
      })
    )
  }
  if (props.selectedId != null) {
    const m = markers.get(props.selectedId)
    if (m) {
      // Center and open its popup
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 12))
      m.openPopup()
    }
  }
}

onMounted(() => {
  ensureMap()
})

function destroyMap() {
  if (!map) return
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (boundsDebounceTimer) {
    clearTimeout(boundsDebounceTimer)
    boundsDebounceTimer = null
  }
  clearIconCache()
  map.off('moveend', emitBounds)
  map.off('mousemove', onMapMouseMove)
  map.off('touchstart', onMapTouchStart)
  map.off('zoomstart movestart', closeSpider)

  clusterGroup?.off('clustermouseover', onClusterMouseOver)
  clusterGroup?.off('spiderfied', onClusterSpiderfied)
  clusterGroup?.off('unspiderfied', onClusterUnspiderfied)

  map.remove()
  map = null
  clusterGroup = null
}

onBeforeUnmount(() => {
  destroyMap()
})

onActivated(() => {
  if (!map) return
  map.invalidateSize()
  const size = map.getSize()
  if (size.x === 0 || size.y === 0) return
  if (pendingCenter) {
    map.flyTo(pendingCenter, lastStableZoom, { duration: 1 })
    pendingCenter = null
  }
  updateMarkers(true)
})

watch(
  () => props.items,
  () => {
    updateMarkers()
  }
)

watch(
  () => props.selectedId,
  () => {
    highlightSelected()
  }
)

watch(
  () => props.center,
  (newCenter) => {
    if (!map || !isValidLatLng(newCenter)) return
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) {
      pendingCenter = newCenter
      return
    }
    map.flyTo(newCenter, lastStableZoom, { duration: 1 })
  }
)
</script>

<template>
  <div>
    <div
      class="osm-poi-map"
      ref="mapEl"
    />

    <Teleport
      v-if="popupComponent && popupTarget && popupItem"
      :to="popupTarget"
    >
      <component
        :is="popupComponent"
        :item="popupItem.source"
        @click="$emit('item:select', popupItem.id)"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.osm-poi-map {
  /* Set an explicit height, or it won't be visible */
  height: 100%;
  width: 100%;
}

/* Cluster badge */
:deep(.poi-cluster-icon) {
  background: transparent;
  border: none;
}

:deep(.poi-cluster-badge) {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #3a86ff;
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* Hide default markercluster styles we don't use */
:deep(.marker-cluster) {
  background: transparent !important;
  border: none !important;
}

:deep(.marker-cluster div) {
  background: transparent !important;
}

/* Remove default Leaflet icon images spacing */
:deep(.leaflet-div-icon) {
  background: transparent;
  border: none;
}

/* Fade-in for markers appearing on the map */
:deep(.poi-cluster-icon) {
  z-index: 5000; /* above regular markers but below hovered avatar icons */
}

/* Avatar marker hover feedback — scale the inner img, not the icon wrapper
   (Leaflet uses transform on the wrapper for positioning) */
:deep(.poi-avatar-icon img) {
  transition:
    transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 0.15s ease;
}

:deep(.poi-avatar-icon:hover) {
  z-index: 10000 !important;
}

:deep(.poi-avatar-icon:hover img) {
  transform: scale(1.3);
  border-color: #3a86ff;
}

:deep(.item-popup-highlighted .leaflet-popup-content-wrapper) {
  /* TODO remove hardcoded color - replace with semantic value */
  box-shadow: 0 3px 13px rgba(217, 83, 79, 0.9);
}

:deep(.item-popup-highlighted .leaflet-popup-tip) {
  /* TODO remove hardcoded color - replace with semantic value */
  box-shadow: 0 3px 14px rgba(217, 83, 79, 0.3);
}

:deep(.leaflet-popup) {
  width: 15rem !important;
}

:deep(.leaflet-popup-content-wrapper) {
  padding: 0;
  border-radius: 0.375rem;
  overflow: hidden;
  background: transparent;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.5);
  border: 1px solid transparent;
  transition:
    box-shadow 1.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 0.15s ease;
}

:deep(.leaflet-popup-content-wrapper:hover) {
  box-shadow: 0 3px 18px rgba(0, 0, 0, 0.7);
  border: 1px solid white;
}

:deep(.leaflet-popup-content) {
  margin: 0;
  line-height: 1.3;
  min-height: 1px;
}

/* Override Bootstrap's card hover lift inside map popups */
:deep(.leaflet-popup .card.cursor-pointer:hover),
:deep(.leaflet-popup .card[role='button']:hover) {
  box-shadow: none;
  transform: none;
}

:deep(.leaflet-control-attribution) {
  opacity: 0.4;
  pointer-events: none;
}

@media (max-width: 767.98px) {
  :deep(.leaflet-control-attribution) {
    display: none;
  }
}
</style>

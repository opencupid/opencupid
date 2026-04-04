import { onMounted, onBeforeUnmount, onActivated, onDeactivated, watch, type Ref } from 'vue'
import type { Component } from 'vue'
import type { Map as LMap } from 'leaflet'

import { MapController } from './MapController'
import type { MapPoi, MapCluster, BoundsWithZoom } from './OsmPoiMap.types'

export interface MapProps {
  items: MapPoi[]
  clusters: MapCluster[]
  iconComponent: Component
  iconResolver?: (poi: MapPoi) => Component
  popupComponent?: Component
  center?: [number, number]
  zoom: number
  fitToPois: boolean
  boundsDebounce: number
  fetchPopupData?: (id: string | number) => Promise<unknown>
}

export interface MapControllerCallbacks {
  'bounds:changed': (payload: BoundsWithZoom) => void
  'item:select': (id: string | number) => void
  'map:ready': (map: LMap) => void
  'popup:open': (item: MapPoi, target: HTMLElement) => void
  'popup:close': () => void
}

export function useMapController(
  mapEl: Ref<HTMLDivElement | null>,
  props: MapProps,
  callbacks: MapControllerCallbacks
): { flyToMarker: (poi: MapPoi) => void } {
  let controller: MapController | null = null

  function resolveIcon(poi: MapPoi): Component {
    return props.iconResolver ? props.iconResolver(poi) : props.iconComponent
  }

  function markerConfig() {
    return {
      resolveIcon,
      popupComponent: props.popupComponent,
      fetchPopupData: props.fetchPopupData,
    }
  }

  onMounted(() => {
    if (!mapEl.value) return
    controller = new MapController(
      mapEl.value,
      {
        center: props.center,
        zoom: props.zoom,
        tileUrl: __APP_CONFIG__.MAP_TILE_URL,
        attribution: __APP_CONFIG__.MAP_ATTRIBUTION,
        boundsDebounce: props.boundsDebounce,
        fitToPois: props.fitToPois,
      },
      {
        onBoundsChanged: (payload) => callbacks['bounds:changed'](payload),
        onItemSelect: (id) => callbacks['item:select'](id),
        onMapReady: (map) => callbacks['map:ready'](map),
        onPopupOpen: (item, target) => callbacks['popup:open'](item, target),
        onPopupClose: () => callbacks['popup:close'](),
      }
    )
    controller.init()
  })

  onBeforeUnmount(() => {
    controller?.destroy()
    controller = null
  })

  onActivated(() => controller?.reactivate())
  onDeactivated(() => controller?.suspend())

  watch(
    () => props.items,
    (items) => controller?.updateMarkers(items, markerConfig())
  )

  watch(
    () => props.clusters,
    (clusters) => controller?.updateClusters(clusters)
  )

  watch(
    () => props.center,
    (center) => {
      if (center) controller?.flyToCenter(center)
    }
  )

  return {
    flyToMarker: (poi: MapPoi) => controller?.flyToMarker(poi),
  }
}

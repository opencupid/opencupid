import L from 'leaflet'
import { type Component, render, h } from 'vue'
import type { PoiIconProps } from './OsmPoiMap.types'

/** Validates that a coordinate pair contains finite numbers (rejects NaN, Infinity, null, undefined). */
export function isValidLatLng(center: [number, number] | undefined): center is [number, number] {
  return !!center && Number.isFinite(center[0]) && Number.isFinite(center[1])
}

/** Scales spiderfy distance multiplier based on the smaller viewport dimension. */
export function computeViewportMultiplier(mapSize: { x: number; y: number }): number {
  const minDim = Math.min(mapSize.x, mapSize.y)
  return Math.max(0.8, Math.min(4, minDim / 400))
}

export const MAP_MAX_ZOOM = 12
export const CLUSTER_ICON_SIZE = 35
export const POI_ICON_SIZE = 40

/** Creates a Leaflet DivIcon for a marker cluster badge. */
export function createClusterIcon(cluster: { getChildCount(): number }): L.DivIcon {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `<div class="poi-cluster-badge" style="width:${CLUSTER_ICON_SIZE}px;height:${CLUSTER_ICON_SIZE}px">${count}</div>`,
    className: 'poi-cluster-icon',
    iconSize: [CLUSTER_ICON_SIZE, CLUSTER_ICON_SIZE],
    iconAnchor: [CLUSTER_ICON_SIZE / 2, CLUSTER_ICON_SIZE / 2],
  })
}

const iconCache = new Map<string, L.DivIcon>()

function getIconCacheKey(props: PoiIconProps): string {
  const url = props.image?.variants?.[0]?.url ?? 'none'
  return `${url}_${props.isSelected}_${props.isHighlighted}`
}

/** Renders a Vue component into a Leaflet DivIcon for use as a POI marker. */
export function hydratePoiIcon(component: Component, iconProps: PoiIconProps): L.DivIcon {
  const key = getIconCacheKey(iconProps)
  const cached = iconCache.get(key)
  if (cached) return cached

  const container = document.createElement('span')
  render(h(component, iconProps), container)
  // Cache the rendered HTML string, not the live element — Leaflet's DivIcon
  // uses appendChild for element nodes, which *moves* them between markers
  // instead of cloning. Passing a string lets Leaflet parse fresh DOM per marker.
  const html = container.innerHTML
  const icon = L.divIcon({
    className: 'poi-avatar-icon',
    html,
    iconSize: [POI_ICON_SIZE, POI_ICON_SIZE],
    iconAnchor: [POI_ICON_SIZE / 2, POI_ICON_SIZE / 2],
  })
  iconCache.set(key, icon)
  return icon
}

export function clearIconCache(): void {
  iconCache.clear()
}

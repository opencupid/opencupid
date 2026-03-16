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

/** Checks for WebGL support in the current browser. */
export function webGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

/** Creates a Leaflet DivIcon for a marker cluster badge. */
export function createClusterIcon(cluster: { getChildCount(): number }): L.DivIcon {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `<div class="poi-cluster-badge">${count}</div>`,
    className: 'poi-cluster-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const POI_ICON_SIZE = 32

/** Renders a Vue component into a Leaflet DivIcon for use as a POI marker. */
export function hydratePoiIcon(component: Component, iconProps: PoiIconProps): L.DivIcon {
  const container = document.createElement('span')
  render(h(component, iconProps), container)
  return L.divIcon({
    className: 'poi-avatar-icon',
    html: container,
    iconSize: [POI_ICON_SIZE, POI_ICON_SIZE],
    iconAnchor: [POI_ICON_SIZE / 2, POI_ICON_SIZE / 2],
  })
}

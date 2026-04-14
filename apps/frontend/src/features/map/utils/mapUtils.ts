import L from 'leaflet'
import { type Component, render, h } from 'vue'
import type { PoiIconProps } from '../types/map.types'
import type { GeoPoint, LocationDTO } from '@zod/dto/location.dto'

/** Validates that a coordinate pair contains finite numbers (rejects NaN, Infinity, null, undefined). */
export function isValidLatLng(center: [number, number] | undefined): center is [number, number] {
  return !!center && Number.isFinite(center[0]) && Number.isFinite(center[1])
}

/** Extracts a Leaflet-compatible [lat, lon] tuple from a LocationDTO, or undefined if coords are absent. */
export function toLatLng(loc?: LocationDTO): [number, number] | undefined {
  if (loc?.lat != null && loc?.lon != null) return [loc.lat, loc.lon]
}

/** Extracts a GeoPoint from a LocationDTO, or undefined if input or coords are absent. */
export function toGeoPoint(loc: LocationDTO | null | undefined): GeoPoint | undefined {
  if (loc?.lat != null && loc?.lon != null) return { lat: loc.lat, lon: loc.lon }
}

export { MAP_MAX_ZOOM } from '@shared/maps'
export const CLUSTER_ICON_SIZE = 35
export const POI_ICON_SIZE = 40

/** Creates a Leaflet DivIcon for a server-computed cluster (takes count directly). */
export function createServerClusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    html: `<div class="poi-cluster-badge" style="width:${CLUSTER_ICON_SIZE}px;height:${CLUSTER_ICON_SIZE}px">${count}</div>`,
    className: 'poi-cluster-icon',
    iconSize: [CLUSTER_ICON_SIZE, CLUSTER_ICON_SIZE],
    iconAnchor: [CLUSTER_ICON_SIZE / 2, CLUSTER_ICON_SIZE / 2],
  })
}

function getIconCacheKey(component: Component, props: PoiIconProps): string {
  const name = (component as any).name ?? (component as any).__name ?? 'anon'
  const url = props.image?.variants?.[0]?.url ?? 'none'
  return `${name}_${url}_${props.isSelected}_${props.isHighlighted}`
}

/** Renders a Vue component into a Leaflet DivIcon for use as a POI marker.
 *  @param cache - per-instance Map so icons are never shared across map instances. */
export function hydratePoiIcon(
  component: Component,
  iconProps: PoiIconProps,
  cache: Map<string, L.DivIcon>
): L.DivIcon {
  const key = getIconCacheKey(component, iconProps)
  const cached = cache.get(key)
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
  cache.set(key, icon)
  return icon
}

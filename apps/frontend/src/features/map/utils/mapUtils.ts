import L from 'leaflet'
import type { IconRenderer, PoiIconProps } from '../types/map.types'
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

// Renderers are identity-keyed via this WeakMap so cache keys stay short
// and don't risk collisions across renderers with the same `name`.
const rendererIds = new WeakMap<IconRenderer, number>()
let nextRendererId = 0
function rendererId(renderer: IconRenderer): number {
  let id = rendererIds.get(renderer)
  if (id === undefined) {
    id = nextRendererId++
    rendererIds.set(renderer, id)
  }
  return id
}

function getIconCacheKey(renderer: IconRenderer, props: PoiIconProps): string {
  const url = props.image?.url ?? 'none'
  return `${rendererId(renderer)}_${url}_${props.isSelected}_${props.isHighlighted}_${props.hasPost ?? false}`
}

/** Builds a Leaflet DivIcon for a POI marker via a pure HTML renderer.
 *  No Vue render() / vDOM round-trip — the renderer returns a string directly.
 *  @param cache - per-instance Map so icons are never shared across map instances. */
export function hydratePoiIcon(
  renderer: IconRenderer,
  iconProps: PoiIconProps,
  cache: Map<string, L.DivIcon>
): L.DivIcon {
  const key = getIconCacheKey(renderer, iconProps)
  const cached = cache.get(key)
  if (cached) return cached

  const html = renderer(iconProps)
  const icon = L.divIcon({
    className: 'poi-avatar-icon',
    html,
    iconSize: [POI_ICON_SIZE, POI_ICON_SIZE],
    iconAnchor: [POI_ICON_SIZE / 2, POI_ICON_SIZE / 2],
  })
  cache.set(key, icon)
  return icon
}

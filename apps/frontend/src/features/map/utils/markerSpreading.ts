import L, { type Map as LMap } from 'leaflet'

/**
 * Minimal shape a marker must expose for the spreading algorithm. Decoupled
 * from `MapPoi` so the utilities are reusable for any lat/lng-bearing record.
 * `lng` is intentionally aligned with Leaflet's own LatLng (not the project's
 * `lon` field) so projection calls don't need a per-record adapter.
 */
export interface MarkerInput {
  id: string | number
  lat: number
  lng: number
}

/**
 * Spreading configuration. All distances are container-pixel units —
 * the projection-aware unit is what overlap actually looks like to the user,
 * independent of latitude or projection distortions.
 */
export interface SpreadConfig {
  /**
   * Two markers whose container-pixel positions fall within this distance are
   * considered overlapping and merged into a spread group. A value around the
   * marker's visual radius (≈ POI_ICON_SIZE / 2) keeps the threshold aligned
   * with what the user perceives as a touch-collision.
   */
  overlapThresholdPx: number
  /**
   * Base spread radius (px) used at `referenceZoom`. Per-zoom radius scales
   * inversely with zoom: a marker drift that's natural at city view should
   * compress at street view, where the underlying geography itself supplies
   * separation.
   */
  baseOffsetPx: number
  /** Zoom level at which the spread radius equals `baseOffsetPx`. */
  referenceZoom: number
  /**
   * At and above this zoom, spreading is bypassed entirely — markers render
   * at their true coordinates. Allows the user to drill into true positions
   * once they've zoomed far enough that overlap is unlikely.
   */
  disableAtZoom: number
}

export const DEFAULT_SPREAD_CONFIG: SpreadConfig = {
  overlapThresholdPx: 20,
  baseOffsetPx: 50,
  referenceZoom: 11,
  disableAtZoom: 15,
}

/** Planned position for a single marker — the result the renderer applies. */
export interface PositionPlan<T> {
  marker: T
  lat: number
  lng: number
  /** True iff the marker has been displaced from its original geocoded position. */
  spread: boolean
}

/**
 * Spread radius (px) for a given zoom, scaling inversely with zoom from
 * `baseOffsetPx` at `referenceZoom`. Each zoom-out doubles the radius;
 * each zoom-in halves it.
 */
export function offsetForZoom(zoom: number, config: SpreadConfig): number {
  return config.baseOffsetPx * Math.pow(2, config.referenceZoom - zoom)
}

/**
 * Group markers whose container-pixel positions fall within `thresholdPx`
 * via transitive proximity (single-link clustering). Singletons (no
 * neighbours) are not returned — only groups of 2 or more need spreading.
 *
 * Complexity is O(n²) in the marker count. For the on-screen budget the
 * pipeline emits (well under a few hundred markers per viewport) this
 * outperforms the bookkeeping of a spatial index.
 */
export function detectOverlapGroups<T extends MarkerInput>(
  markers: readonly T[],
  map: LMap,
  thresholdPx: number
): T[][] {
  if (markers.length < 2) return []
  const points = markers.map((m) => map.latLngToContainerPoint(L.latLng(m.lat, m.lng)))
  const threshold2 = thresholdPx * thresholdPx
  const visited = new Uint8Array(markers.length)
  const groups: T[][] = []

  for (let i = 0; i < markers.length; i++) {
    if (visited[i]) continue
    const stack: number[] = [i]
    const group: T[] = []
    while (stack.length) {
      const k = stack.pop() as number
      if (visited[k]) continue
      visited[k] = 1
      group.push(markers[k]!)
      const pk = points[k]!
      for (let j = 0; j < markers.length; j++) {
        if (visited[j]) continue
        const pj = points[j]!
        const dx = pk.x - pj.x
        const dy = pk.y - pj.y
        if (dx * dx + dy * dy <= threshold2) stack.push(j)
      }
    }
    if (group.length > 1) groups.push(group)
  }
  return groups
}

/**
 * Deterministic pixel offsets for placing `count` markers in a Vogel
 * (sunflower) spiral within a disc of `radius` pixels. The same `count`
 * always produces the same offsets in the same order — necessary so
 * markers don't dance around between recomputations.
 *
 * The 0.5 phase shift on `t` keeps every marker off the centre, so even
 * a 2-element group has both ends visibly displaced from the colocation
 * point (and from each other).
 */
export function calculateSpiralOffsets(
  count: number,
  radius: number
): { dx: number; dy: number }[] {
  if (count <= 0) return []
  const golden = Math.PI * (3 - Math.sqrt(5))
  const offsets: { dx: number; dy: number }[] = []
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count
    const r = radius * Math.sqrt(t)
    const a = (i + 1) * golden
    offsets.push({ dx: r * Math.cos(a), dy: r * Math.sin(a) })
  }
  return offsets
}

/**
 * Compute the spread plan for the given marker set at the given zoom.
 * Markers not in any overlapping group are returned at their original
 * coordinates (`spread: false`); overlapping markers are arranged in a
 * spiral around the group's container-pixel centroid (`spread: true`).
 *
 * Centroid is computed in pixel space — averaging lat/lng directly would
 * skew north for groups spanning high-latitude tiles.
 */
export function spreadMarkers<T extends MarkerInput>(
  markers: readonly T[],
  map: LMap,
  zoom: number,
  config: SpreadConfig = DEFAULT_SPREAD_CONFIG
): PositionPlan<T>[] {
  const plan: PositionPlan<T>[] = markers.map((m) => ({
    marker: m,
    lat: m.lat,
    lng: m.lng,
    spread: false,
  }))
  if (markers.length === 0 || zoom >= config.disableAtZoom) return plan

  const groups = detectOverlapGroups(markers, map, config.overlapThresholdPx)
  if (groups.length === 0) return plan

  const offsetPx = offsetForZoom(zoom, config)
  const planById = new Map<string | number, PositionPlan<T>>()
  for (const p of plan) planById.set(p.marker.id, p)

  for (const group of groups) {
    const groupPoints = group.map((m) => map.latLngToContainerPoint(L.latLng(m.lat, m.lng)))
    let cx = 0
    let cy = 0
    for (const p of groupPoints) {
      cx += p.x
      cy += p.y
    }
    cx /= groupPoints.length
    cy /= groupPoints.length

    const offsets = calculateSpiralOffsets(group.length, offsetPx)
    for (let i = 0; i < group.length; i++) {
      const off = offsets[i]!
      const member = group[i]!
      const ll = map.containerPointToLatLng(L.point(cx + off.dx, cy + off.dy))
      const entry = planById.get(member.id)!
      entry.lat = ll.lat
      entry.lng = ll.lng
      entry.spread = true
    }
  }
  return plan
}

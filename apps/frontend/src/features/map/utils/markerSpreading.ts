import L, { type Map as LMap } from 'leaflet'

import { POI_ICON_SIZE } from './mapUtils'

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
 *
 * The grid cell pitch is `markerSizePx + gapPx`, which guarantees that no
 * two spread markers visually overlap as long as the icon diameter doesn't
 * exceed `markerSizePx`. The bounding rectangle is then derived from the
 * leaf count (cols × cellPitch, rows × cellPitch) rather than the other way
 * round, so dense clusters naturally fan out further than sparse ones.
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
   * Visual diameter of a marker icon, in container pixels. Sets the minimum
   * cell pitch so adjacent markers in a spread group don't visually collide.
   */
  markerSizePx: number
  /**
   * Edge-to-edge gap between adjacent markers in a spread group. Larger gaps
   * push markers further apart at the cost of taking more screen real estate.
   */
  gapPx: number
  /**
   * At and above this zoom, spreading is bypassed entirely — markers render
   * at their true coordinates. Allows the user to drill into true positions
   * once they've zoomed far enough that overlap is unlikely.
   */
  disableAtZoom: number
}

export const DEFAULT_SPREAD_CONFIG: SpreadConfig = {
  overlapThresholdPx: 20,
  markerSizePx: POI_ICON_SIZE,
  gapPx: 10,
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
 * Deterministic pixel offsets for placing `count` markers on a grid centred
 * on the origin. Cell pitch is `cellSize` in both axes, so the enclosing
 * invisible rectangle has size `cols * cellSize × rows * cellSize` where
 * `cols = ceil(sqrt(count))` and `rows = ceil(count / cols)`. Markers
 * occupy cell centres in row-major order.
 *
 * Same `count` always produces the same offsets in the same order, so
 * markers don't dance around between recomputations. Sizing the bounding
 * box from the leaf count (rather than fixing it ahead of time) means
 * every member of a cluster fits at non-overlapping pitch, no matter how
 * dense the cluster is.
 */
export function calculateGridOffsets(
  count: number,
  cellSize: number
): { dx: number; dy: number }[] {
  if (count <= 0) return []
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)))
  const rows = Math.max(1, Math.ceil(count / cols))
  const xOrigin = -((cols - 1) * cellSize) / 2
  const yOrigin = -((rows - 1) * cellSize) / 2
  const offsets: { dx: number; dy: number }[] = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    offsets.push({
      dx: xOrigin + col * cellSize,
      dy: yOrigin + row * cellSize,
    })
  }
  return offsets
}

/**
 * Compute the spread plan for the given marker set at the given zoom.
 * Markers not in any overlapping group are returned at their original
 * coordinates (`spread: false`); overlapping markers are arranged on a
 * grid centred on the group's container-pixel centroid, with cell pitch
 * `markerSizePx + gapPx` so no two leaves visually overlap (`spread: true`).
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

  const cellSize = config.markerSizePx + config.gapPx
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

    const offsets = calculateGridOffsets(group.length, cellSize)
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

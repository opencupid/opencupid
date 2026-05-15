import type { Map as LMap, LatLng } from 'leaflet'

/**
 * Density-based marker spreading.
 *
 * Given a set of geocoded points and a Leaflet map, group points that
 * overlap in pixel space and lay each group out on a deterministic grid
 * centered on the cluster centroid. Replaces the previous supercluster +
 * overlapping-marker-spiderfier combination: no server-side index, no
 * click-to-expand badges, no per-zoom rebuild.
 *
 * The pixel-space test is what makes this zoom-responsive — far apart at
 * country zoom, indistinguishable at city zoom, naturally tight at street
 * zoom. At zoom levels where the algorithm can't usefully resolve overlap
 * (above `minZoomToSpread + maxZoomCutoffOffset`) the spread is disabled
 * outright and markers render at their true coordinates.
 */

export interface LatLngLike {
  lat: number
  lng: number
}

/**
 * Minimal marker shape the spreader operates on. The caller decides what
 * `data` carries — the algorithm only reads ids and original coordinates.
 */
export interface SpreadMarker<T = unknown> {
  id: string
  /** True geocoded coordinates, never overwritten. */
  original: LatLngLike
  /** Display coordinates after spreading; equals `original` when not spread. */
  current: LatLngLike
  /** Caller-supplied metadata (POI fields, kind, etc.). */
  data: T
  /** True when `current` was offset from `original` by the spreader. */
  isSpread?: boolean
}

export interface SpreadingConfig {
  /** Pixel radius within which two markers count as overlapping. Default 5. */
  pixelThreshold?: number
  /**
   * Zoom level at which spreading begins to take effect. Below this zoom
   * the spread is at its widest; above it the spread shrinks geometrically
   * until `maxZoomCutoffOffset` zoom steps later, at which point spreading
   * is disabled entirely. Default 11.
   */
  minZoomToSpread?: number
  /**
   * Number of zoom levels above `minZoomToSpread` at which spreading is
   * disabled (markers render at their true coordinates). Default 4 — so
   * with `minZoomToSpread = 11` spreading turns off at zoom 15+.
   */
  maxZoomCutoffOffset?: number
  /**
   * Cell spacing in pixels at the lowest zoom — distance between adjacent
   * markers in the grid. Should be at least `pixelThreshold * 2` so spread
   * markers don't visually re-overlap. Default 50.
   */
  maxSpreadRadius?: number
}

interface ResolvedConfig {
  pixelThreshold: number
  minZoomToSpread: number
  maxZoomCutoffOffset: number
  maxSpreadRadius: number
}

export const DEFAULT_SPREADING_CONFIG: ResolvedConfig = {
  pixelThreshold: 5,
  minZoomToSpread: 11,
  maxZoomCutoffOffset: 4,
  maxSpreadRadius: 50,
}

export function resolveConfig(config?: SpreadingConfig): ResolvedConfig {
  return { ...DEFAULT_SPREADING_CONFIG, ...config }
}

/**
 * A density group: a cluster of markers tight enough in pixel space to
 * overlap. `centroid` is the unweighted screen-space midpoint, used as
 * the anchor for the grid layout.
 */
export interface OverlapGroup<T> {
  groupId: string
  markers: SpreadMarker<T>[]
  /** Cluster centroid in screen pixels. */
  centroid: { x: number; y: number }
}

interface PixelPoint {
  x: number
  y: number
}

/**
 * Detect groups of markers whose screen-space positions are within
 * `pixelThreshold` of each other, using a single-link clustering pass on
 * a spatial hash. Singletons are excluded — only colocated (2+) groups
 * are returned.
 *
 * Complexity is O(n) average for uniform distributions thanks to the
 * cellSize == threshold hash. Worst case (every marker in a single bucket)
 * degrades to O(n²) but n is bounded by the visible viewport.
 */
export function detectOverlapGroups<T>(
  markers: SpreadMarker<T>[],
  map: LMap,
  pixelThreshold: number = DEFAULT_SPREADING_CONFIG.pixelThreshold
): OverlapGroup<T>[] {
  if (markers.length < 2) return []

  const pts: PixelPoint[] = markers.map((m) => {
    const p = map.latLngToContainerPoint([m.original.lat, m.original.lng])
    return { x: p.x, y: p.y }
  })

  const thresholdSq = pixelThreshold * pixelThreshold
  const cell = Math.max(1, pixelThreshold)
  const buckets = new Map<string, number[]>()
  const bucketKey = (cx: number, cy: number) => `${cx}|${cy}`

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!
    const cx = Math.floor(p.x / cell)
    const cy = Math.floor(p.y / cell)
    const key = bucketKey(cx, cy)
    let arr = buckets.get(key)
    if (!arr) {
      arr = []
      buckets.set(key, arr)
    }
    arr.push(i)
  }

  // Union-find for single-link clustering. Int32Array elements are always
  // numbers (no holes), so direct indexing is safe under
  // noUncheckedIndexedAccess.
  const parent = new Int32Array(pts.length)
  for (let i = 0; i < pts.length; i++) parent[i] = i
  const find = (i: number): number => {
    let r = i
    while (parent[r]! !== r) r = parent[r]!
    while (parent[i]! !== r) {
      const next = parent[i]!
      parent[i] = r
      i = next
    }
    return r
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }

  for (let i = 0; i < pts.length; i++) {
    const pi = pts[i]!
    const cx = Math.floor(pi.x / cell)
    const cy = Math.floor(pi.y / cell)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = buckets.get(bucketKey(cx + dx, cy + dy))
        if (!arr) continue
        for (const j of arr) {
          if (j <= i) continue
          const pj = pts[j]!
          const ddx = pi.x - pj.x
          const ddy = pi.y - pj.y
          if (ddx * ddx + ddy * ddy <= thresholdSq) union(i, j)
        }
      }
    }
  }

  const byRoot = new Map<number, number[]>()
  for (let i = 0; i < pts.length; i++) {
    const r = find(i)
    let arr = byRoot.get(r)
    if (!arr) {
      arr = []
      byRoot.set(r, arr)
    }
    arr.push(i)
  }

  const groups: OverlapGroup<T>[] = []
  for (const [, idxs] of byRoot) {
    if (idxs.length < 2) continue
    let sx = 0
    let sy = 0
    for (const i of idxs) {
      const p = pts[i]!
      sx += p.x
      sy += p.y
    }
    const centroid = { x: sx / idxs.length, y: sy / idxs.length }
    // Deterministic groupId: sorted ids joined. Same composition → same id
    // → stable transitions when the set is unchanged.
    const groupMarkers = idxs.map((i) => markers[i]!)
    const ids = groupMarkers.map((m) => m.id).sort()
    groups.push({
      groupId: ids.join('|'),
      markers: groupMarkers,
      centroid,
    })
  }

  return groups
}

/**
 * Deterministic square-ish grid layout in pixel space.
 *
 * The grid is built with `cols = ceil(sqrt(count))` and `rows =
 * ceil(count / cols)`, then centered on (0, 0). Cells are spaced
 * `cellSize` pixels apart on both axes. The trailing row may have empty
 * slots when `count` doesn't fill the grid exactly — markers fill in
 * row-major order, top-down, left-to-right. The pattern is purely
 * geometric — no randomness — so the same input always renders the same
 * layout.
 */
export function calculateGridOffsets(count: number, cellSize: number): { x: number; y: number }[] {
  if (count <= 0) return []
  if (count === 1) return [{ x: 0, y: 0 }]

  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  // Center the grid on (0, 0): the leftmost column sits at
  // -(cols - 1) / 2 * cellSize, the topmost row at -(rows - 1) / 2.
  const xOrigin = -((cols - 1) * cellSize) / 2
  const yOrigin = -((rows - 1) * cellSize) / 2

  const offsets: { x: number; y: number }[] = []
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols
    offsets.push({ x: xOrigin + col * cellSize, y: yOrigin + row * cellSize })
  }
  return offsets
}

/**
 * Spread radius in pixels at a given zoom level. Halves with each zoom
 * step above `minZoomToSpread`, so `offsetDistance = maxRadius * 2^-(zoom - minZoom)`.
 * Capped at `maxRadius` from below the inflection so very zoomed-out views
 * stay readable.
 */
export function spreadRadiusForZoom(zoom: number, config: ResolvedConfig): number {
  const delta = zoom - config.minZoomToSpread
  if (delta <= 0) return config.maxSpreadRadius
  return config.maxSpreadRadius / Math.pow(2, delta)
}

/**
 * Apply density-based spreading to a marker set in place of a new
 * collection — never mutating the originals. Markers that don't overlap
 * keep their original coordinates and `isSpread: false`. Markers in
 * overlap groups have `current` reprojected to a grid position around
 * the cluster centroid and `isSpread: true`.
 */
export function spreadMarkers<T>(
  markers: SpreadMarker<T>[],
  map: LMap,
  zoomLevel: number,
  config?: SpreadingConfig
): SpreadMarker<T>[] {
  const cfg = resolveConfig(config)

  // No-op above the cutoff: tight markers at high zoom read fine without
  // help, and spreading them visually disconnects them from the underlying
  // place.
  if (zoomLevel >= cfg.minZoomToSpread + cfg.maxZoomCutoffOffset) {
    return markers.map((m) =>
      m.isSpread || m.current.lat !== m.original.lat || m.current.lng !== m.original.lng
        ? { ...m, current: { ...m.original }, isSpread: false }
        : m
    )
  }

  const groups = detectOverlapGroups(markers, map, cfg.pixelThreshold)
  if (groups.length === 0) {
    // Reset any markers that were previously spread.
    return markers.map((m) =>
      m.isSpread ? { ...m, current: { ...m.original }, isSpread: false } : m
    )
  }

  const idToSpread = new Map<string, LatLngLike>()
  // Cell spacing for the grid at the current zoom. No implicit floor:
  // callers are responsible for choosing `maxSpreadRadius` large enough
  // that adjacent grid cells don't visually re-overlap (rule of thumb:
  // at least `pixelThreshold * 2`).
  const cellSize = spreadRadiusForZoom(zoomLevel, cfg)

  for (const group of groups) {
    const offsets = calculateGridOffsets(group.markers.length, cellSize)
    // Sort group members by id so the offset assignment is deterministic
    // across renders, irrespective of input array order.
    const sorted = [...group.markers].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i]!
      const offset = offsets[i]!
      const point = map.latLngToContainerPoint([m.original.lat, m.original.lng])
      const spread = map.containerPointToLatLng([point.x + offset.x, point.y + offset.y])
      idToSpread.set(m.id, { lat: spread.lat, lng: (spread as LatLng).lng })
    }
  }

  return markers.map((m) => {
    const spread = idToSpread.get(m.id)
    if (spread) {
      return { ...m, current: spread, isSpread: true }
    }
    if (m.isSpread) {
      return { ...m, current: { ...m.original }, isSpread: false }
    }
    return m
  })
}

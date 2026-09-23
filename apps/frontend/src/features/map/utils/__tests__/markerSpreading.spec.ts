import { describe, expect, it, vi } from 'vitest'

// Mock leaflet before importing markerSpreading.
vi.mock('leaflet', () => {
  const latLng = vi.fn((lat: number, lng: number) => ({ lat, lng }))
  const point = vi.fn((x: number, y: number) => ({ x, y }))
  return {
    default: { latLng, point },
    latLng,
    point,
  }
})

import type { Map as LMap } from 'leaflet'
import {
  DEFAULT_SPREAD_CONFIG,
  calculateGridOffsets,
  detectOverlapGroups,
  spreadMarkers,
  type SpreadConfig,
} from '../markerSpreading'

/**
 * Pixel-projection stub: degrees-to-pixels is just a uniform scale. Adequate
 * for testing pixel-space proximity since the algorithm only consumes
 * `map.latLngToContainerPoint` results.
 */
function makeFakeMap(scale = 10): LMap {
  return {
    latLngToContainerPoint: vi.fn((latlng: { lat: number; lng: number }) => ({
      x: latlng.lng * scale,
      y: latlng.lat * scale,
    })),
    containerPointToLatLng: vi.fn((p: { x: number; y: number }) => ({
      lat: p.y / scale,
      lng: p.x / scale,
    })),
  } as unknown as LMap
}

describe('calculateGridOffsets', () => {
  it('returns an empty array for non-positive counts', () => {
    expect(calculateGridOffsets(0, 50)).toEqual([])
    expect(calculateGridOffsets(-3, 50)).toEqual([])
  })

  it('separates adjacent cells by exactly cellSize', () => {
    const cellSize = 50
    const offsets = calculateGridOffsets(4, cellSize)
    // 2x2 grid: row 0 has the first two cells.
    expect(
      Math.hypot(offsets[1]!.dx - offsets[0]!.dx, offsets[1]!.dy - offsets[0]!.dy)
    ).toBeCloseTo(cellSize, 9)
  })

  it('produces distinct positions for every marker in the group', () => {
    for (const n of [2, 3, 4, 7, 12]) {
      const offsets = calculateGridOffsets(n, 50)
      const keys = offsets.map((o) => `${o.dx},${o.dy}`)
      expect(new Set(keys).size).toBe(n)
    }
  })

  it('centres the grid on the origin', () => {
    // For any count, sums of dx and dy across a full row-major block cancel.
    // Use 4 (a complete 2x2) so the grid is exactly symmetric.
    const offsets = calculateGridOffsets(4, 50)
    const sx = offsets.reduce((s, o) => s + o.dx, 0)
    const sy = offsets.reduce((s, o) => s + o.dy, 0)
    expect(sx).toBeCloseTo(0, 9)
    expect(sy).toBeCloseTo(0, 9)
  })

  it('arranges 4 markers at the corners of a 2x2 grid with pitch cellSize', () => {
    const cellSize = 50
    const offsets = calculateGridOffsets(4, cellSize)
    const half = cellSize / 2
    expect(offsets).toEqual([
      { dx: -half, dy: -half },
      { dx: half, dy: -half },
      { dx: -half, dy: half },
      { dx: half, dy: half },
    ])
  })

  it('is deterministic — identical inputs produce identical offsets', () => {
    const a = calculateGridOffsets(7, 50)
    const b = calculateGridOffsets(7, 50)
    expect(a).toEqual(b)
  })
})

describe('detectOverlapGroups', () => {
  const map = makeFakeMap()

  it('returns empty for fewer than two markers', () => {
    expect(detectOverlapGroups([], map, 20)).toEqual([])
    expect(detectOverlapGroups([{ id: 1, lat: 0, lng: 0 }], map, 20)).toEqual([])
  })

  it('returns empty when no markers fall within threshold', () => {
    // Both at (10, 200) pixels apart with scale=10.
    const markers = [
      { id: 1, lat: 0, lng: 0 },
      { id: 2, lat: 20, lng: 0 },
    ]
    expect(detectOverlapGroups(markers, map, 20)).toEqual([])
  })

  it('groups colocated markers', () => {
    const markers = [
      { id: 1, lat: 47, lng: 19 },
      { id: 2, lat: 47, lng: 19 },
      { id: 3, lat: 60, lng: 30 },
    ]
    const groups = detectOverlapGroups(markers, map, 20)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.map((m) => m.id).sort()).toEqual([1, 2])
  })

  it('merges via transitive proximity (chain within threshold)', () => {
    // A → B (10px) and B → C (10px), with A → C ≈ 20px — connect them all.
    const markers = [
      { id: 'A', lat: 0, lng: 0 },
      { id: 'B', lat: 0, lng: 1 }, // 10px from A
      { id: 'C', lat: 0, lng: 2 }, // 10px from B, 20px from A
    ]
    const groups = detectOverlapGroups(markers, map, 11)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.map((m) => m.id).sort()).toEqual(['A', 'B', 'C'])
  })
})

describe('spreadMarkers', () => {
  const map = makeFakeMap()

  it('returns markers at original coordinates when nothing overlaps', () => {
    const markers = [
      { id: 1, lat: 0, lng: 0 },
      { id: 2, lat: 50, lng: 50 },
    ]
    const plan = spreadMarkers(markers, map, 11, DEFAULT_SPREAD_CONFIG)
    expect(plan).toHaveLength(2)
    expect(plan.every((p) => !p.spread)).toBe(true)
    expect(plan[0]!.lat).toBe(0)
    expect(plan[1]!.lat).toBe(50)
  })

  it('disables spreading at and above disableAtZoom', () => {
    const markers = [
      { id: 1, lat: 0, lng: 0 },
      { id: 2, lat: 0, lng: 0 },
    ]
    const cfg: SpreadConfig = { ...DEFAULT_SPREAD_CONFIG, disableAtZoom: 15 }
    const plan = spreadMarkers(markers, map, 15, cfg)
    expect(plan.every((p) => !p.spread)).toBe(true)
    expect(plan[0]!.lat).toBe(0)
    expect(plan[1]!.lat).toBe(0)
  })

  it('displaces every member of an overlapping group', () => {
    const markers = [
      { id: 1, lat: 47, lng: 19 },
      { id: 2, lat: 47, lng: 19 },
      { id: 3, lat: 47, lng: 19 },
    ]
    const plan = spreadMarkers(markers, map, 11, DEFAULT_SPREAD_CONFIG)
    expect(plan.every((p) => p.spread)).toBe(true)
    // Each marker is now at a unique lat/lng.
    const keys = plan.map((p) => `${p.lat},${p.lng}`)
    expect(new Set(keys).size).toBe(plan.length)
  })

  it('keeps adjacent leaves at least markerSizePx apart in pixel space', () => {
    // 10 colocated markers — the previous fixed-radius layout would squash
    // them inside a 100x100px box (overlap). The leaf-count-driven layout
    // pitches every cell at markerSizePx + gapPx instead.
    const markers = Array.from({ length: 10 }, (_, i) => ({ id: i, lat: 0, lng: 0 }))
    const plan = spreadMarkers(markers, map, 11, DEFAULT_SPREAD_CONFIG)
    expect(plan.every((p) => p.spread)).toBe(true)

    // The fake map projects 1° lat/lng → 10 px, so re-projecting the planned
    // lat/lng lands us back in pixel space for direct distance assertions.
    const positions = plan.map((p) => ({ x: p.lng * 10, y: p.lat * 10 }))
    const minPitch = DEFAULT_SPREAD_CONFIG.markerSizePx
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i]!.x - positions[j]!.x
        const dy = positions[i]!.y - positions[j]!.y
        expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(minPitch - 1e-6)
      }
    }
  })

  it('produces stable plans across calls with the same inputs', () => {
    const markers = [
      { id: 1, lat: 47, lng: 19 },
      { id: 2, lat: 47, lng: 19 },
      { id: 3, lat: 47.0001, lng: 19.0001 },
    ]
    const a = spreadMarkers(markers, map, 11, DEFAULT_SPREAD_CONFIG)
    const b = spreadMarkers(markers, map, 11, DEFAULT_SPREAD_CONFIG)
    expect(a).toEqual(b)
  })

  it('completes 100-marker recompute within 50ms', () => {
    const markers = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      // Spread across a 10x10 grid so most aren't overlapping; introduces some
      // overlap so the spreading branch runs too.
      lat: Math.floor(i / 10),
      lng: i % 10,
    }))
    const start = performance.now()
    spreadMarkers(markers, map, 11, DEFAULT_SPREAD_CONFIG)
    expect(performance.now() - start).toBeLessThan(50)
  })
})

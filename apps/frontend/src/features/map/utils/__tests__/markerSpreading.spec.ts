import { describe, it, expect } from 'vitest'
import type { Map as LMap } from 'leaflet'

import {
  DEFAULT_SPREADING_CONFIG,
  calculateSpiralOffsets,
  detectOverlapGroups,
  spreadMarkers,
  spreadRadiusForZoom,
  type SpreadMarker,
} from '../markerSpreading'

/**
 * Minimal Leaflet map stub. We project lat/lng to pixels with a fixed
 * 10 px/° factor so tests can reason about distances analytically: two
 * markers 0.1° apart sit 1 px apart, which is below the default 5 px
 * threshold and therefore overlap.
 */
function makeMap(pxPerDeg = 10): LMap {
  return {
    latLngToContainerPoint(latlng: [number, number] | { lat: number; lng: number }) {
      const lat = Array.isArray(latlng) ? latlng[0] : latlng.lat
      const lng = Array.isArray(latlng) ? latlng[1] : latlng.lng
      return { x: lng * pxPerDeg, y: -lat * pxPerDeg }
    },
    containerPointToLatLng(point: [number, number] | { x: number; y: number }) {
      const x = Array.isArray(point) ? point[0] : point.x
      const y = Array.isArray(point) ? point[1] : point.y
      return { lat: -y / pxPerDeg, lng: x / pxPerDeg }
    },
  } as unknown as LMap
}

function makeMarker(id: string, lat: number, lng: number): SpreadMarker<{ name: string }> {
  return {
    id,
    original: { lat, lng },
    current: { lat, lng },
    data: { name: id },
  }
}

describe('calculateSpiralOffsets', () => {
  it('returns an empty array for count 0', () => {
    expect(calculateSpiralOffsets(0, 10)).toEqual([])
  })

  it('returns a single zero-offset for count 1', () => {
    expect(calculateSpiralOffsets(1, 10)).toEqual([{ x: 0, y: 0 }])
  })

  it('lays small groups on an evenly-spaced circle', () => {
    const offsets = calculateSpiralOffsets(4, 10, { switchover: 8 })
    expect(offsets).toHaveLength(4)
    for (const o of offsets) {
      expect(Math.sqrt(o.x * o.x + o.y * o.y)).toBeCloseTo(10, 5)
    }
    // First marker points straight up (-y in screen coords)
    expect(offsets[0]!.x).toBeCloseTo(0, 5)
    expect(offsets[0]!.y).toBeCloseTo(-10, 5)
  })

  it('switches to spiral for groups above switchover', () => {
    const offsets = calculateSpiralOffsets(12, 10, { switchover: 8, radiusMultiplier: 2 })
    expect(offsets).toHaveLength(12)
    // Later offsets sit farther from origin than the base radius
    const lastR = Math.hypot(offsets[11]!.x, offsets[11]!.y)
    expect(lastR).toBeGreaterThan(10)
  })

  it('produces deterministic output for the same inputs', () => {
    const a = calculateSpiralOffsets(7, 20)
    const b = calculateSpiralOffsets(7, 20)
    expect(a).toEqual(b)
  })
})

describe('spreadRadiusForZoom', () => {
  const cfg = { ...DEFAULT_SPREADING_CONFIG, minZoomToSpread: 11, maxSpreadRadius: 50 }

  it('returns max radius at and below the inflection zoom', () => {
    expect(spreadRadiusForZoom(11, cfg)).toBe(50)
    expect(spreadRadiusForZoom(8, cfg)).toBe(50)
  })

  it('halves each zoom step above the inflection', () => {
    expect(spreadRadiusForZoom(12, cfg)).toBeCloseTo(25)
    expect(spreadRadiusForZoom(13, cfg)).toBeCloseTo(12.5)
    expect(spreadRadiusForZoom(14, cfg)).toBeCloseTo(6.25)
  })
})

describe('detectOverlapGroups', () => {
  it('returns nothing for fewer than two markers', () => {
    const map = makeMap()
    expect(detectOverlapGroups([], map)).toEqual([])
    expect(detectOverlapGroups([makeMarker('a', 0, 0)], map)).toEqual([])
  })

  it('detects two colocated markers as one group', () => {
    const map = makeMap()
    const markers = [makeMarker('a', 47.5, 19.0), makeMarker('b', 47.5, 19.0)]
    const groups = detectOverlapGroups(markers, map)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.markers).toHaveLength(2)
  })

  it('groups markers within the pixel threshold but not beyond it', () => {
    // 10 px/° → 0.4° = 4 px apart (overlap at threshold 5)
    //          0.7° = 7 px apart (no overlap)
    const map = makeMap()
    const markers = [
      makeMarker('a', 47.5, 19.0),
      makeMarker('b', 47.5, 19.4),
      makeMarker('c', 47.5, 20.1),
    ]
    const groups = detectOverlapGroups(markers, map, 5)
    expect(groups).toHaveLength(1)
    const ids = groups[0]!.markers.map((m) => m.id).sort()
    expect(ids).toEqual(['a', 'b'])
  })

  it('chains overlapping markers via single-link clustering', () => {
    // a-b 4 px, b-c 4 px, a-c 8 px → all in one group via b
    const map = makeMap()
    const markers = [
      makeMarker('a', 47.5, 19.0),
      makeMarker('b', 47.5, 19.4),
      makeMarker('c', 47.5, 19.8),
    ]
    const groups = detectOverlapGroups(markers, map, 5)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.markers).toHaveLength(3)
  })

  it('produces stable groupIds for the same set in different input order', () => {
    const map = makeMap()
    const a = makeMarker('a', 47.5, 19.0)
    const b = makeMarker('b', 47.5, 19.0)
    const c = makeMarker('c', 47.5, 19.0)
    const g1 = detectOverlapGroups([a, b, c], map)[0]
    const g2 = detectOverlapGroups([c, a, b], map)[0]
    expect(g1!.groupId).toBe(g2!.groupId)
  })

  it('places the centroid at the unweighted mean of pixel positions', () => {
    const map = makeMap()
    const markers = [makeMarker('a', 47.5, 19.0), makeMarker('b', 47.5, 19.2)]
    const groups = detectOverlapGroups(markers, map, 5)
    // a at (190, -475), b at (192, -475) → centroid (191, -475)
    expect(groups[0]!.centroid.x).toBeCloseTo(191, 5)
    expect(groups[0]!.centroid.y).toBeCloseTo(-475, 5)
  })
})

describe('spreadMarkers', () => {
  it('leaves non-overlapping markers untouched and reuses input objects', () => {
    const map = makeMap()
    const markers = [makeMarker('a', 47.5, 19.0), makeMarker('b', 46.0, 18.0)]
    const out = spreadMarkers(markers, map, 8)
    expect(out).toHaveLength(2)
    expect(out[0]).toBe(markers[0])
    expect(out[1]).toBe(markers[1])
  })

  it('offsets overlapping markers to distinct positions and marks them spread', () => {
    const map = makeMap()
    const markers = [
      makeMarker('a', 47.5, 19.0),
      makeMarker('b', 47.5, 19.0),
      makeMarker('c', 47.5, 19.0),
    ]
    const out = spreadMarkers(markers, map, 8)
    expect(out.every((m) => m.isSpread === true)).toBe(true)

    const positions = out.map((m) => `${m.current.lat},${m.current.lng}`)
    expect(new Set(positions).size).toBe(3)
    // Originals are preserved
    for (const m of out) {
      expect(m.original).toEqual({ lat: 47.5, lng: 19.0 })
    }
  })

  it('disables spreading at and above the cutoff zoom', () => {
    const map = makeMap()
    const cfg = { minZoomToSpread: 11, maxZoomCutoffOffset: 4 }
    const markers = [makeMarker('a', 47.5, 19.0), makeMarker('b', 47.5, 19.0)]
    const out = spreadMarkers(markers, map, 15, cfg)
    expect(out.every((m) => m.isSpread !== true)).toBe(true)
    expect(out[0]!.current).toEqual({ lat: 47.5, lng: 19.0 })
  })

  it('resets `current` when a previously-spread marker is no longer overlapping', () => {
    const map = makeMap()
    const spread = {
      ...makeMarker('a', 47.5, 19.0),
      current: { lat: 47.6, lng: 19.1 },
      isSpread: true,
    }
    const lone = makeMarker('b', 46.0, 18.0)
    const out = spreadMarkers([spread, lone], map, 8)
    const restored = out.find((m) => m.id === 'a')!
    expect(restored.isSpread).toBe(false)
    expect(restored.current).toEqual({ lat: 47.5, lng: 19.0 })
  })

  it('produces deterministic output for the same input', () => {
    const map = makeMap()
    const markers = [
      makeMarker('a', 47.5, 19.0),
      makeMarker('b', 47.5, 19.0),
      makeMarker('c', 47.5, 19.0),
    ]
    const out1 = spreadMarkers(markers, map, 8)
    const out2 = spreadMarkers(markers, map, 8)
    for (let i = 0; i < out1.length; i++) {
      expect(out1[i]!.current.lat).toBeCloseTo(out2[i]!.current.lat, 10)
      expect(out1[i]!.current.lng).toBeCloseTo(out2[i]!.current.lng, 10)
    }
  })

  it('produces the same offset assignment regardless of input order', () => {
    const map = makeMap()
    const a = makeMarker('a', 47.5, 19.0)
    const b = makeMarker('b', 47.5, 19.0)
    const c = makeMarker('c', 47.5, 19.0)
    const out1 = spreadMarkers([a, b, c], map, 8)
    const out2 = spreadMarkers([c, a, b], map, 8)
    const pos = (xs: typeof out1, id: string) => xs.find((m) => m.id === id)!.current
    expect(pos(out1, 'a').lat).toBeCloseTo(pos(out2, 'a').lat, 10)
    expect(pos(out1, 'b').lat).toBeCloseTo(pos(out2, 'b').lat, 10)
    expect(pos(out1, 'c').lat).toBeCloseTo(pos(out2, 'c').lat, 10)
  })
})

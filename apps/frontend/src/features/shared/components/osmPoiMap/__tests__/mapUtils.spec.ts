import { describe, it, expect, vi } from 'vitest'

// Mock Leaflet before importing mapUtils (hydratePoiIcon and createClusterIcon depend on L.divIcon)
vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn((opts: any) => ({ _type: 'divIcon', ...opts })),
  },
  divIcon: vi.fn((opts: any) => ({ _type: 'divIcon', ...opts })),
}))

import {
  isValidLatLng,
  computeViewportMultiplier,
  webGLSupported,
  createClusterIcon,
} from '../mapUtils'

describe('isValidLatLng', () => {
  it.each([
    [[48.5, 11.5], true],
    [[0, 0], true],
    [[-90, 180], true],
  ] as const)('returns true for valid coordinates %j', (input, expected) => {
    expect(isValidLatLng(input as [number, number])).toBe(expected)
  })

  it.each([
    [undefined, false],
    [[NaN, NaN], false],
    [[NaN, 11.5], false],
    [[48.5, NaN], false],
    [[Infinity, 0], false],
    [[0, -Infinity], false],
  ] as const)('returns false for invalid coordinates %j', (input, expected) => {
    expect(isValidLatLng(input as any)).toBe(expected)
  })
})

describe('computeViewportMultiplier', () => {
  it('returns ~2 for a 800x800 viewport', () => {
    expect(computeViewportMultiplier({ x: 800, y: 800 })).toBe(2)
  })

  it('clamps to floor of 0.8 for tiny viewports', () => {
    expect(computeViewportMultiplier({ x: 100, y: 100 })).toBe(0.8)
  })

  it('clamps to ceiling of 4 for huge viewports', () => {
    expect(computeViewportMultiplier({ x: 3000, y: 3000 })).toBe(4)
  })

  it('uses the smaller dimension when viewport is not square', () => {
    // min(2000, 400) = 400 → 400/400 = 1.0
    expect(computeViewportMultiplier({ x: 2000, y: 400 })).toBe(1)
  })
})

describe('webGLSupported', () => {
  it('returns false when getContext returns null (jsdom default)', () => {
    expect(webGLSupported()).toBe(false)
  })

  it('returns true when webgl context is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as any)
    expect(webGLSupported()).toBe(true)
    vi.restoreAllMocks()
  })

  it('returns false when getContext throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('canvas error')
    })
    expect(webGLSupported()).toBe(false)
    vi.restoreAllMocks()
  })
})

describe('createClusterIcon', () => {
  it('creates a DivIcon with the cluster child count', () => {
    const icon = createClusterIcon({ getChildCount: () => 7 })
    expect(icon).toMatchObject({
      html: '<div class="poi-cluster-badge">7</div>',
      className: 'poi-cluster-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
  })
})

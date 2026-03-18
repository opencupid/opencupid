import { describe, it, expect, vi, afterEach } from 'vitest'

// Mock Leaflet before importing mapUtils (hydratePoiIcon and createClusterIcon depend on L.divIcon)
vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn((opts: any) => ({ _type: 'divIcon', ...opts })),
  },
  divIcon: vi.fn((opts: any) => ({ _type: 'divIcon', ...opts })),
}))

import { defineComponent, h } from 'vue'
import {
  isValidLatLng,
  computeViewportMultiplier,
  createClusterIcon,
  hydratePoiIcon,
  clearIconCache,
  CLUSTER_ICON_SIZE,
} from '../mapUtils'

const DummyIcon = defineComponent({
  props: ['image', 'isSelected', 'isHighlighted'],
  render() {
    return h('img', { src: 'test.jpg' })
  },
})

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

describe('createClusterIcon', () => {
  it('creates a DivIcon with the cluster child count', () => {
    const icon = createClusterIcon({ getChildCount: () => 7 })
    expect(icon).toMatchObject({
      html: `<div class="poi-cluster-badge" style="width:${CLUSTER_ICON_SIZE}px;height:${CLUSTER_ICON_SIZE}px">7</div>`,
      className: 'poi-cluster-icon',
      iconSize: [CLUSTER_ICON_SIZE, CLUSTER_ICON_SIZE],
      iconAnchor: [CLUSTER_ICON_SIZE / 2, CLUSTER_ICON_SIZE / 2],
    })
  })
})

describe('hydratePoiIcon caching', () => {
  afterEach(() => clearIconCache())

  it('returns cached icon for identical props', () => {
    const props = {
      image: { variants: [{ size: 'thumb' as const, url: 'a.jpg' }], blurhash: null },
      isSelected: false,
      isHighlighted: false,
    }
    const icon1 = hydratePoiIcon(DummyIcon, props)
    const icon2 = hydratePoiIcon(DummyIcon, props)
    expect(icon1).toBe(icon2)
  })

  it('returns different icon when highlighted changes', () => {
    const base = {
      image: { variants: [{ size: 'thumb' as const, url: 'a.jpg' }], blurhash: null },
      isSelected: false,
    }
    const icon1 = hydratePoiIcon(DummyIcon, { ...base, isHighlighted: false })
    const icon2 = hydratePoiIcon(DummyIcon, { ...base, isHighlighted: true })
    expect(icon1).not.toBe(icon2)
  })

  it('clearIconCache empties the cache', () => {
    const props = {
      image: { variants: [{ size: 'thumb' as const, url: 'a.jpg' }], blurhash: null },
      isSelected: false,
      isHighlighted: false,
    }
    const icon1 = hydratePoiIcon(DummyIcon, props)
    clearIconCache()
    const icon2 = hydratePoiIcon(DummyIcon, props)
    expect(icon1).not.toBe(icon2)
  })
})

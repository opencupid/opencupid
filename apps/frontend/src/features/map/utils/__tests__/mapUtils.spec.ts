import { describe, it, expect, vi } from 'vitest'

// Mock Leaflet before importing mapUtils (hydratePoiIcon depends on L.divIcon)
vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn((opts: any) => ({ _type: 'divIcon', ...opts })),
  },
  divIcon: vi.fn((opts: any) => ({ _type: 'divIcon', ...opts })),
}))

import type { IconRenderer } from '../../types/map.types'
import { isValidLatLng, hydratePoiIcon } from '../mapUtils'

const DummyIcon: IconRenderer = (props) => `<img src="${props.image?.url ?? ''}"/>`

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

describe('hydratePoiIcon caching', () => {
  it('returns cached icon for identical props', () => {
    const cache = new Map()
    const props = {
      image: { url: 'a.jpg', blurhash: null },
      isSelected: false,
      isHighlighted: false,
    }
    const icon1 = hydratePoiIcon(DummyIcon, props, cache)
    const icon2 = hydratePoiIcon(DummyIcon, props, cache)
    expect(icon1).toBe(icon2)
  })

  it('returns different icon when highlighted changes', () => {
    const cache = new Map()
    const base = {
      image: { url: 'a.jpg', blurhash: null },
      isSelected: false,
    }
    const icon1 = hydratePoiIcon(DummyIcon, { ...base, isHighlighted: false }, cache)
    const icon2 = hydratePoiIcon(DummyIcon, { ...base, isHighlighted: true }, cache)
    expect(icon1).not.toBe(icon2)
  })

  it('fresh cache produces a new icon for the same props', () => {
    const props = {
      image: { url: 'a.jpg', blurhash: null },
      isSelected: false,
      isHighlighted: false,
    }
    const icon1 = hydratePoiIcon(DummyIcon, props, new Map())
    const icon2 = hydratePoiIcon(DummyIcon, props, new Map())
    expect(icon1).not.toBe(icon2)
  })
})

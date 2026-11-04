import { describe, it, expect } from 'vitest'
import type { MapFeature } from '@zod/map/cluster.dto'
import { countFeaturesInBounds } from '../boundsUtils'

const bounds = { south: 47, north: 48, west: 18.5, east: 19.5 }

const point = (id: string, lat: number, lon: number): MapFeature => ({
  type: 'point',
  kind: 'profile',
  id,
  lat,
  lon,
  publicName: id,
  image: null,
  highlighted: false,
})

describe('countFeaturesInBounds', () => {
  it('counts points as one and clusters by their member count', () => {
    const features: MapFeature[] = [
      point('a', 47.5, 19),
      { type: 'cluster', id: 1, lat: 47.2, lon: 18.9, count: 7, expansionZoom: 9 },
    ]
    expect(countFeaturesInBounds(features, bounds)).toBe(8)
  })

  it('ignores features outside the bounds', () => {
    const features: MapFeature[] = [
      point('north', 48.5, 19),
      point('west', 47.5, 18),
      { type: 'cluster', id: 2, lat: 46, lon: 19, count: 3, expansionZoom: 9 },
    ]
    expect(countFeaturesInBounds(features, bounds)).toBe(0)
  })

  it('counts features on the edge as inside', () => {
    expect(countFeaturesInBounds([point('edge', 48, 19.5)], bounds)).toBe(1)
  })
})

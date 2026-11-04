import type { MapBounds } from '@/features/map/types/map.types'
import type { MapFeature } from '@zod/map/cluster.dto'

export function boundsContain(outer: MapBounds, inner: MapBounds): boolean {
  return (
    outer.south <= inner.south &&
    outer.north >= inner.north &&
    outer.west <= inner.west &&
    outer.east >= inner.east
  )
}

export function padBounds(bounds: MapBounds, factor: number): MapBounds {
  const latPad = (bounds.north - bounds.south) * factor
  const lonPad = (bounds.east - bounds.west) * factor
  return {
    south: bounds.south - latPad,
    north: bounds.north + latPad,
    west: bounds.west - lonPad,
    east: bounds.east + lonPad,
  }
}

/**
 * Number of map items inside `bounds`: clusters count for their members,
 * points for one. Cluster positions are centroids, so a cluster on the
 * edge counts as wholly in or out; good enough for the grid button's label.
 */
export function countFeaturesInBounds(features: MapFeature[], bounds: MapBounds): number {
  let count = 0
  for (const f of features) {
    if (
      f.lat < bounds.south ||
      f.lat > bounds.north ||
      f.lon < bounds.west ||
      f.lon > bounds.east
    ) {
      continue
    }
    count += f.type === 'cluster' ? f.count : 1
  }
  return count
}

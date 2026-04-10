import type { PublicProfile } from '@zod/profile/profile.dto'

export type MapBounds = { south: number; north: number; west: number; east: number }

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

export function unionBounds(a: MapBounds, b: MapBounds): MapBounds {
  return {
    south: Math.min(a.south, b.south),
    north: Math.max(a.north, b.north),
    west: Math.min(a.west, b.west),
    east: Math.max(a.east, b.east),
  }
}

export function profileInBounds(profile: PublicProfile, bounds: MapBounds): boolean {
  const lat = profile.location?.lat
  const lon = profile.location?.lon
  if (lat == null || lon == null) return false
  return lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east
}

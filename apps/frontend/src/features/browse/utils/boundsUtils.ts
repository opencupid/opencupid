import type { MapBounds } from '@/features/map/types/map.types'

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

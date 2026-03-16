import type { AvatarImage } from '@/features/publicprofile/components/MapIcon.vue'

/** Location coordinates for a map point */
export interface PoiLocation {
  lat: number
  lon: number
}

/** Viewport bounds emitted by bounds-changed */
export interface MapBounds {
  south: number
  north: number
  west: number
  east: number
}

/** Props contract for custom marker icon components passed via `iconComponent`. */
export interface PoiIconProps {
  image?: AvatarImage
  isSelected: boolean
  isHighlighted: boolean
}

/** A point-of-interest item for the map. Call sites map domain objects into this shape. */
export interface MapPoi {
  id: string | number
  title: string
  location: PoiLocation
  image?: AvatarImage
  highlighted?: boolean
  /** The original domain object, passed through to the popup component as `:item` */
  source: unknown
}

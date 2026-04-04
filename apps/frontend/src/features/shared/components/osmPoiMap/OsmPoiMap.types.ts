import type { AvatarImage } from '@/features/publicprofile/components/ProfileMarker.vue'
import type { Component } from 'vue'

/** Location coordinates for a map point */
export interface PoiLocation {
  lat: number
  lon: number
}

/** Viewport bounds emitted by bounds:changed */
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
  /** Discriminator for icon resolution when multiple POI types share one map. */
  type?: string
  /** The original domain object, passed through to the popup component as `:item` */
  source: unknown
}

/** A server-computed cluster marker. */
export interface MapCluster {
  id: number
  location: PoiLocation
  count: number
  expansionZoom: number
}

/** Bounds + zoom emitted on viewport change for cluster queries. */
export interface BoundsWithZoom {
  bounds: MapBounds
  zoom: number
}

/** Per-render configuration passed from the component to MapController.updateMarkers(). */
export interface MarkerConfig {
  resolveIcon: (poi: MapPoi) => Component
  popupComponent?: Component
  fetchPopupData?: (id: string | number) => Promise<unknown>
}

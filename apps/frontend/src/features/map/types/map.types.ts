import type { Component } from 'vue'
import type { PointFeature } from '@shared/zod/map/map.dto'

/**
 * The map layer renders the bounds-service DTOs directly. Earlier
 * iterations defined a separate `MapPoi` shape that the view-model
 * projected into; that layer earned nothing — it had one consumer, one
 * input shape, and the projection's only architectural job was to
 * manufacture a `source` round-trip for the type info it had just
 * discarded. The DTO type is the single source of truth.
 */
export type MapPoi = PointFeature

/**
 * A marker-icon renderer. Returns the inner HTML for a Leaflet DivIcon —
 * called once per icon-cache miss. Pure string interpolation: no Vue render,
 * no virtual DOM. Implementations live alongside the icon styles.
 */
export type IconRenderer = (props: PoiIconProps) => string

/** Viewport bounds emitted by bounds:changed */
export interface MapBounds {
  south: number
  north: number
  west: number
  east: number
}

/** Props contract for marker icon renderers. */
export interface PoiIconProps {
  image?: PointFeature['image']
  isSelected: boolean
  isHighlighted: boolean
  hasPost?: boolean
}

/** Bounds + zoom emitted on viewport change for POI queries. */
export interface BoundsWithZoom {
  bounds: MapBounds
  zoom: number
}

/** Per-render configuration passed from the component to MapController.updateMarkers(). */
export interface MarkerConfig {
  resolveIcon: (poi: MapPoi) => IconRenderer
  resolvePopup?: (poi: MapPoi) => Component
  fetchPopupData?: (id: string, signal?: AbortSignal) => Promise<unknown>
}

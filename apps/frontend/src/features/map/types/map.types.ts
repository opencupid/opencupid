import type { Component } from 'vue'
import type { ClusterFeature, PointFeature } from '@shared/zod/map/cluster.dto'

/**
 * The map layer renders the cluster service's DTOs directly. Earlier
 * iterations defined separate `MapPoi` / `MapCluster` shapes that the
 * view-model projected into; that layer earned nothing — it had one
 * consumer, one input shape, and the projection's only architectural
 * job was to manufacture a `source` round-trip for the type info it
 * had just discarded. The DTO types are the single source of truth.
 */
export type MapPoi = PointFeature
export type MapCluster = ClusterFeature

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

/** Bounds + zoom emitted on viewport change for cluster queries. */
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

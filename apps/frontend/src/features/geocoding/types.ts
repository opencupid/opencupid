import type { GeoPoint } from '@zod/dto/location.dto'
import type { MapBounds } from '@/features/map/types/map.types'

export interface GeocodingResult {
  name: string
  country: string // ISO 3166-1 alpha-2, uppercase (e.g. "DE")
  lat: number
  lon: number
  /** The place's extent, when the provider knows it. */
  bounds?: MapBounds
}

export type GeocodingProvider = (
  query: string,
  lang: string,
  signal?: AbortSignal,
  bias?: GeoPoint | null
) => Promise<GeocodingResult[]>

/** Nearest settlement to a point, or null when there is none nearby. */
export type ReverseGeocodingProvider = (
  point: GeoPoint,
  lang: string,
  signal?: AbortSignal
) => Promise<GeocodingResult | null>

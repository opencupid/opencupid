import z from 'zod'

export const LocationSchema = z.object({
  country: z.string().default(''),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})

export const LocationPayloadSchema = z.object({
  country: z.string().nullable(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})

export type LocationPayload = z.infer<typeof LocationPayloadSchema>

export type LocationDTO = z.infer<typeof LocationSchema>

/**
 * A location with guaranteed non-null coordinates. Use this at API and
 * component boundaries where callers should not have to re-check lat/lon
 * for null. Narrow a `LocationDTO` down to a `GeoPoint` via
 * `toGeoPoint()` before handing it to consumers.
 */
export const GeoPointSchema = z.object({
  lat: z.number(),
  lon: z.number(),
})

export type GeoPoint = z.infer<typeof GeoPointSchema>

/**
 * Narrow a `LocationDTO` (coords optional) to a `GeoPoint` (coords
 * required). Returns `null` if either coordinate is missing.
 */
export const toGeoPoint = (
  location: Pick<LocationDTO, 'lat' | 'lon'> | null | undefined
): GeoPoint | null => {
  if (!location) return null
  const { lat, lon } = location
  if (lat == null || lon == null) return null
  return { lat, lon }
}

/** Validates that a location is complete (has both country and city). */
export const LocationValidationSchema = LocationSchema.extend({
  country: z.string().min(1),
  cityName: z.string().min(1),
})

export const isLocationValid = (location: Record<string, unknown> | null | undefined): boolean => {
  if (!location) return false
  return LocationValidationSchema.safeParse(location).success
}

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

/** Validates that a location is complete (has both country and city). */
export const LocationValidationSchema = LocationSchema.extend({
  country: z.string().min(1),
  cityName: z.string().min(1),
})

export const isLocationValid = (location: Record<string, unknown> | null | undefined): boolean => {
  if (!location) return false
  return LocationValidationSchema.safeParse(location).success
}

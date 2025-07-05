import z from "zod";


export const LocationSchema = z.object({
  country: z.string(),
  cityId: z.string().nullable(),
  cityName: z.string().optional(),
})

export const LocationPayloadSchema = z.object({
  country: z.string().nullable(),
  cityId: z.string().nullable(),
})


export const SearchLocationSchema = z.object({
  country: z.string().nullable(),
  cityId: z.string().nullable(),
  cityName: z.string().optional(),
})


export type LocationPayload = z.infer<typeof LocationPayloadSchema>

export type LocationDTO = z.infer<typeof LocationSchema>

export type SearchLocationDTO = z.infer<typeof SearchLocationSchema>

export function mapLocationToPayload(
  raw: { country: string | null; cityId: string | null },
): LocationPayload {
  const country = raw.country && raw.country !== '' ? raw.country : null
  const cityId = raw.cityId && raw.cityId !== '' ? raw.cityId : null

  return {
    country,
    cityId,
  }
}


export function mapLocationDTOToPayload(
  location: LocationPayload | null,
): LocationPayload {
  if (!location) {
    return { country: null, cityId: null }
  }

  const country = location.country && location.country !== '' ? location.country : null
  const cityId = location.cityId && location.cityId !== '' ? location.cityId : null

  return { country, cityId }
}



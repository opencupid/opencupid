import z from "zod";


export const LocationSchema = z.object({
  country: z.string(),
  cityId: z.string().nullable(),
  cityName: z.string(),
})

export type LocationDTO = z.infer<typeof LocationSchema>


export function mapLocation(
  raw: { country: string | null; cityId: string | null },
): LocationDTO | null {
  const country = raw.country && raw.country !== '' ? raw.country : null
  const cityId = raw.cityId && raw.cityId !== '' ? raw.cityId : null

  if (!country) {
    return null
  }

  return {
    country,
    cityId,
    cityName: '',
  }
}

export function unmapLocation(
  location: LocationDTO | null,
): { country: string | null; cityId: string | null } {
  if (!location) {
    return { country: null, cityId: null }
  }

  const country = location.country && location.country !== '' ? location.country : null
  const cityId = location.cityId && location.cityId !== '' ? location.cityId : null

  return { country, cityId }
}

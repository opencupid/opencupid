import z from "zod";


export const LocationSchema = z.object({
  country: z.string(),
  cityId: z.string().cuid().nullable(), // TODO !!remove nullable when DB records are updated
  cityName: z.string(),
})

export type LocationDTO = z.infer<typeof LocationSchema>


export function mapLocation(raw: { country: string | null, cityId: string | null }): LocationDTO | null {
  const { country, cityId } = raw

  // Accept: country alone, or country + cityId
  return {
    country: country ?? '',
    cityId: cityId ?? '',
    cityName: '',
  }
}
export function unmapLocation(location: LocationDTO | null): { country: string | null, cityId: string | null } {

  if (!location) {
    return { country: null, cityId: null }
  }
  return {
    country: location.country ?? null,
    cityId: location.cityId ?? null,
  }
}
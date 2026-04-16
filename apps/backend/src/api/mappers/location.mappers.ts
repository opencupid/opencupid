import type { LocationDTO } from '@zod/dto/location.dto'

export type DbLocation = {
  country: string | null
  cityName: string | null
  lat?: number | null
  lon?: number | null
}

export function DbLocationToLocationDTO(dbLocation: DbLocation): LocationDTO {
  return {
    country: dbLocation.country ?? '',
    cityName: dbLocation.cityName ?? '',
    lat: dbLocation.lat ?? null,
    lon: dbLocation.lon ?? null,
  }
}

/**
 * Project the four location scalars off a row that may also carry
 * unrelated fields. Returns null when none of country/cityName/lat/lon
 * are present — for callers whose schema treats location as nullable.
 */
export function extractLocation(row: Record<string, unknown>): LocationDTO | null {
  if (!row.country && !row.cityName && row.lat == null && row.lon == null) {
    return null
  }
  return DbLocationToLocationDTO({
    country: (row.country as string) ?? null,
    cityName: (row.cityName as string) ?? null,
    lat: (row.lat as number) ?? null,
    lon: (row.lon as number) ?? null,
  })
}

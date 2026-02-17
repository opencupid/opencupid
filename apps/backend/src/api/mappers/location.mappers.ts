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

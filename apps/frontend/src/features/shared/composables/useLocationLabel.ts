import type { LocationDTO } from '@zod/dto/location.dto'
import { useCountries } from './useCountries'

interface UseLocationLabelOptions {
  location: LocationDTO | null
  viewerLocation: LocationDTO | null
  showCity?: boolean
  showCountryLabel?: boolean
}
const { countryCodeToName } = useCountries()

export function relativeLocationLabel({
  location,
  viewerLocation,
  showCity = false,
  showCountryLabel = false,
}: UseLocationLabelOptions): string {

  if (!location) return ''

  const isSameCountry = viewerLocation?.country === location.country
  const showCityName = !!location.cityName && (isSameCountry || showCity)
  const showCountry = !!location.country && (!isSameCountry || !location.cityName)

  const parts: string[] = []

  if (showCityName) parts.push(location.cityName)
  if (showCountry && showCountryLabel) {
    const countryName = countryCodeToName(location.country)
    if (countryName) parts.push(countryName)
  }

  return parts.join(', ')
}

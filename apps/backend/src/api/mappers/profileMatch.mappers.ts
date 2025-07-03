import type { LocationDTO } from "../../../../../packages/shared/zod/dto/location.dto"
import type { Profile, SocialMatchFilter } from "../../../../../packages/shared/zod/generated"
import { DatingPreferencesDTOSchema, SocialMatchFilterDTOSchema, type DatingPreferencesDTO, type SocialMatchFilterDTO, type SocialMatchFilterWithTags } from "../../../../../packages/shared/zod/match/filters.dto"
import { DbTagToPublicTagTransform } from "./tag.mappers"



export function mapProfileToDatingPreferencesDTO(
  profile: Profile,
): DatingPreferencesDTO {

  return DatingPreferencesDTOSchema.parse(profile)

}

export function mapLocation(raw: { country: string | null, cityId: string | null }): LocationDTO | null {
  const { country, cityId } = raw

  // Reject if country is missing
  if (!country) return null

  // Accept: country alone, or country + cityId
  return {
    country,
    cityId: cityId ?? null,
    cityName: '',
  }
}

export function mapSocialMatchFilterToDTO(filter: SocialMatchFilterWithTags, locale: string): SocialMatchFilterDTO {
  const location = mapLocation(filter)
  const tags = (filter.tags ?? []).map(tag => DbTagToPublicTagTransform(tag, locale))
  return {
    ...location,
    ...tags,
    radius: filter.radius ?? undefined,
  }
}
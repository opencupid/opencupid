import { mapLocation, type LocationDTO } from "@zod/dto/location.dto"
import type { Profile, SocialMatchFilter } from "@zod/generated"
import {
  DatingPreferencesDTOSchema,
  UpdateSocialMatchFilterPayloadSchema,
  type DatingPreferencesDTO,
  type SocialMatchFilterDTO,
  type SocialMatchFilterWithTags,
  type UpdateSocialMatchFilterPayload
} from "@zod/match/filters.dto"
import { DbTagToPublicTagTransform } from "./tag.mappers"



export function mapProfileToDatingPreferencesDTO(
  profile: Profile,
): DatingPreferencesDTO {

  return DatingPreferencesDTOSchema.parse(profile)

}



export function mapSocialMatchFilterToDTO(filter: SocialMatchFilterWithTags, locale: string): SocialMatchFilterDTO {
  const location = mapLocation(filter)
  const tags = (filter.tags ?? []).map(tag => DbTagToPublicTagTransform(tag, locale))
  return {
    location,
    tags,
    radius: filter.radius ?? 0,
  }
}


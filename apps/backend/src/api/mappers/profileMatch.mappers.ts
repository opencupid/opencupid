import type { Profile } from '@zod/generated'
import {
  DatingPreferencesDTOSchema,
  type DatingPreferencesDTO,
  type SocialMatchFilterDTO,
  type SocialMatchFilterWithTags,
} from '@zod/match/filters.dto'
import { DbTagToPublicTagTransform } from './tag.mappers'
import { DbLocationToLocationDTO } from './location.mappers'

export function mapProfileToDatingPreferencesDTO(profile: Profile): DatingPreferencesDTO {
  return DatingPreferencesDTOSchema.parse(profile)
}

export function mapSocialMatchFilterToDTO(
  filter: SocialMatchFilterWithTags,
  locale: string
): SocialMatchFilterDTO {
  const tags = (filter.tags ?? []).map(tag => DbTagToPublicTagTransform(tag, locale))
  const location = DbLocationToLocationDTO(filter)
  return {
    location,
    tags,
    radius: filter.radius ?? 0,
  }
}

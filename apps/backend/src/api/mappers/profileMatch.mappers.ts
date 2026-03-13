import type { Profile } from '@zod/generated'
import { type SocialMatchFilterDTO, type SocialMatchFilterWithTags } from '@zod/match/filters.dto'
import {
  DatingPreferencesFormSchema,
  type DatingPreferencesFormType,
} from '@zod/match/filters.form'
import { DatingEligibleProfileSchema } from '@zod/profile/profile.db'
import { DbTagToPublicTagTransform } from './tag.mappers'
import { DbLocationToLocationDTO } from './location.mappers'

export function mapProfileToDatingPreferencesDTO(profile: Profile): DatingPreferencesFormType {
  const parsed = DatingEligibleProfileSchema.pick({
    prefAgeMin: true,
    prefAgeMax: true,
    prefGender: true,
    prefKids: true,
  }).safeParse(profile)
  if (parsed.success) return parsed.data
  return DatingPreferencesFormSchema.parse({})
}

export function mapSocialMatchFilterToDTO(
  filter: SocialMatchFilterWithTags,
  locale: string
): SocialMatchFilterDTO {
  const tags = (filter.tags ?? []).map((tag) => DbTagToPublicTagTransform(tag, locale))
  const location = DbLocationToLocationDTO(filter)
  return {
    location,
    tags,
    radius: filter.radius ?? undefined,
  }
}

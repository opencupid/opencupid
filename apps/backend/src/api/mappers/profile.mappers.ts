import {
  type PublicProfileWithContext,
  ProfileUnionSchema,
  type ProfileSummary,
  type OwnerProfile,
  type UpdateProfilePayload,
  OwnerScalarsSchema,
} from '@zod/profile/profile.dto'
import { DatingPreferencesDTOSchema, type DatingPreferencesDTO } from '@zod/match/datingPreference.dto'
import { type DbProfileWithContext, type DbProfileWithImages } from '@zod/profile/profile.db'
import { LocationSchema } from '@zod/dto/location.dto'

import {
  type OwnerProfileImage,
  type PublicProfileImage,
} from '@zod/profile/profileimage.dto'
import { mapProfileTagsTranslated } from './tag.mappers'
import { Profile, ProfileImage } from '@zod/generated'
import { toOwnerProfileImage, toPublicProfileImage } from './image.mappers'
import { mapInteractionContext } from './interaction.mappers'


export function mapDbProfileToOwnerProfile(locale: string, db: DbProfileWithImages): OwnerProfile {
  const scalars = OwnerScalarsSchema.parse(db)
  const tags = mapProfileTagsTranslated(db.tags, locale)
  const images = db.profileImages ? mapProfileImagesToOwner(db.profileImages) : []
  const location = LocationSchema.parse(db)

  const localizedMap = db.localized.reduce((acc, l) => {
    if (!acc[l.field]) acc[l.field] = {}
    acc[l.field][l.locale] = l.value
    return acc
  }, {} as Record<string, Record<string, string>>)

  return {
    ...scalars,
    introSocialLocalized: localizedMap['introSocial'] || {},
    introDatingLocalized: localizedMap['introDating'] || {},
    profileImages: images,
    location,
    tags,
  }
}


export function mapProfileToPublic(dbProfile: DbProfileWithImages, includeDatingContext: boolean, locale: string): PublicProfileWithContext {

  // map localized fields with fallback to first available locale
  const get = (field: string): string =>
    dbProfile.localized.find(l => l.field === field && l.locale === locale)?.value ??
    dbProfile.localized.find(l => l.field === field)?.value ?? ''

  // shape discriminated union ProfileUnionSchema
  const dProf = {
    ...dbProfile,
    isDatingActive: includeDatingContext,
  }
  const scalars = ProfileUnionSchema.parse(dProf)
  const publicImages = dbProfile.profileImages ? mapProfileImagesToPublic(dbProfile.profileImages) : []
  const publicTags = dbProfile.tags ? mapProfileTagsTranslated(dbProfile.tags, locale) : []

  return {
    ...scalars,
    profileImages: publicImages,
    tags: publicTags,
    location: LocationSchema.parse(dbProfile),
    introSocial: get('introSocial') || '',
    introDating: get('introDating') || '',
  } as PublicProfileWithContext
}



export function mapProfileWithContext(dbProfile: DbProfileWithContext, includeDatingContext: boolean, locale: string): PublicProfileWithContext {

  const mapped = mapProfileToPublic(dbProfile, includeDatingContext, locale)
  const conversation = dbProfile.conversationParticipants?.[0]?.conversation ?? null

  return {
    ...mapped,
    conversation: conversation || null,
    interactionContext: mapInteractionContext(dbProfile, includeDatingContext)
  } as PublicProfileWithContext
}

export function mapProfileImagesToOwner(images: ProfileImage[]): OwnerProfileImage[] {
  return images.map(img => toOwnerProfileImage(img))
}

export function mapProfileImagesToPublic(images: ProfileImage[]): PublicProfileImage[] {
  return images.map((img: ProfileImage) => toPublicProfileImage(img))
}

export function mapProfileSummary(profile: {
  id: string
  publicName: string
  profileImages: ProfileImage[]
}): ProfileSummary {
  return {
    id: profile.id,
    publicName: profile.publicName,
    profileImages: profile?.profileImages.map(toPublicProfileImage),
  }
}


export function mapToLocalizedUpserts(
  profileId: string,
  payload: Partial<Pick<UpdateProfilePayload, 'introSocialLocalized' | 'introDatingLocalized'>>
): Array<{ locale: string; updates: Record<string, string> }> {
  const byLocale: Record<string, Record<string, string>> = {}

  for (const field of ['introSocialLocalized', 'introDatingLocalized'] as const) {
    const localized = payload[field]
    if (!localized) continue

    for (const [locale, value] of Object.entries(localized)) {
      if (!byLocale[locale]) byLocale[locale] = {}
      byLocale[locale][field.replace('Localized', '')] = value
    }
  }

  return Object.entries(byLocale).map(([locale, updates]) => ({
    locale,
    updates,
  }))
}


export function mapProfileToDatingPreferences(
  profile: Profile,
): DatingPreferencesDTO {

  return DatingPreferencesDTOSchema.parse(profile)

}
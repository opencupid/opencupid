import {
  type PublicProfile,
  ProfileUnionSchema,
  type ProfileSummary,
  type OwnerProfile,
  OwnerScalarsSchema,
} from '@zod/profile/profile.dto'
import { type DbProfileSummary, type DbProfileWithImages } from '@zod/profile/profile.db'
import { LocationSchema } from '@zod/dto/location.dto'
import { DbLocationToLocationDTO } from './location.mappers'

import { type OwnerProfileImage, type PublicProfileImage } from '@zod/profile/profileimage.dto'
import { mapProfileTagsTranslated } from './tag.mappers'
import type { Image, ProfileImage as ProfileImageJoin } from '@prisma/client'
import { toOwnerProfileImage, toPublicProfileImage } from './image.mappers'

type ProfileImageJoinRow = ProfileImageJoin & { image: Image }

export function mapDbProfileToOwnerProfile(locale: string, db: DbProfileWithImages): OwnerProfile {
  const scalars = OwnerScalarsSchema.parse(db)
  const tags = mapProfileTagsTranslated(db.tags, locale)
  const images = db.profileImages ? mapProfileJoinRowsToOwner(db.profileImages) : []
  const location = LocationSchema.parse(db)

  const localizedMap = db.localized.reduce(
    (acc, l) => {
      if (!acc[l.field]) acc[l.field] = {}
      acc[l.field][l.locale] = l.value
      return acc
    },
    {} as Record<string, Record<string, string>>
  )

  return {
    ...scalars,
    introSocialLocalized: localizedMap['introSocial'] || {},
    introDatingLocalized: localizedMap['introDating'] || {},
    profileImages: images,
    location,
    tags,
  }
}

export function mapProfileToPublic(
  dbProfile: DbProfileWithImages,
  includeDatingContext: boolean,
  locale: string
): PublicProfile {
  // map localized fields with fallback to first available locale
  const get = (field: string): string => {
    // First try to find the preferred locale with a non-empty value
    const preferredEntry = dbProfile.localized.find((l) => l.field === field && l.locale === locale)
    if (preferredEntry && preferredEntry.value.trim() !== '') {
      return preferredEntry.value
    }

    // Fallback to any locale with a non-empty value
    const fallbackEntry = dbProfile.localized.find(
      (l) => l.field === field && l.value.trim() !== ''
    )
    return fallbackEntry?.value ?? ''
  }

  // shape discriminated union ProfileUnionSchema
  const dProf = {
    ...dbProfile,
    isDatingActive: includeDatingContext,
  }
  const scalars = ProfileUnionSchema.parse(dProf)
  const publicImages = dbProfile.profileImages
    ? mapProfileJoinRowsToPublic(dbProfile.profileImages)
    : []
  const publicTags = dbProfile.tags ? mapProfileTagsTranslated(dbProfile.tags, locale) : []

  return {
    ...scalars,
    profileImages: publicImages,
    tags: publicTags,
    location: DbLocationToLocationDTO(dbProfile),
    introSocial: get('introSocial') || '',
    introDating: get('introDating') || '',
  } as PublicProfile
}

export function mapProfileImagesToOwner(images: Image[]): OwnerProfileImage[] {
  return images.map(toOwnerProfileImage)
}

export function mapProfileImagesToPublic(images: Image[]): PublicProfileImage[] {
  return images.map(toPublicProfileImage)
}

export function mapProfileJoinRowsToOwner(rows: ProfileImageJoinRow[]): OwnerProfileImage[] {
  return rows.map((r) => toOwnerProfileImage(r.image))
}

export function mapProfileJoinRowsToPublic(rows: ProfileImageJoinRow[]): PublicProfileImage[] {
  return rows.map((r) => toPublicProfileImage(r.image))
}

export function mapProfileSummary(profile: DbProfileSummary): ProfileSummary {
  return {
    id: profile.id,
    publicName: profile.publicName,
    profileImages: profile?.profileImages.map((pi) => toPublicProfileImage(pi.image)),
    location: DbLocationToLocationDTO({
      country: profile.country ?? null,
      cityName: profile.cityName ?? null,
      lat: profile.lat ?? null,
      lon: profile.lon ?? null,
    }),
  }
}

export function mapToLocalizedUpserts(
  profileId: string,
  payload: {
    introSocialLocalized?: Record<string, string>
    introDatingLocalized?: Record<string, string>
  }
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

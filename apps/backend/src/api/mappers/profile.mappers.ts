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

import { type OwnerProfileImage, type PublicImage } from '@zod/image/image.dto'
import { mapTagsTranslated } from './tag.mappers'
import { Image } from '@zod/generated'
import { toOwnerProfileImage, toPublicImage } from './image.mappers'

/** A profile gallery entry: the ImageAttachment row with its image. */
type ProfileGalleryEntry = { image: Image; isRestricted: boolean }

export function mapDbProfileToOwnerProfile(locale: string, db: DbProfileWithImages): OwnerProfile {
  const scalars = OwnerScalarsSchema.parse(db)
  const tags = mapTagsTranslated(db.tags, locale)
  const images = db.profileImages ? mapProfileImagesToOwner(db.profileImages) : []
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
  // A viewer who gets the dating context (both dating, mutually compatible) is
  // the one the restricted photos are meant for.
  const publicImages = dbProfile.profileImages
    ? mapProfileImagesToPublic(dbProfile.profileImages, includeDatingContext)
    : []
  const publicTags = dbProfile.tags ? mapTagsTranslated(dbProfile.tags, locale) : []

  return {
    ...scalars,
    profileImages: publicImages,
    tags: publicTags,
    location: DbLocationToLocationDTO(dbProfile),
    introSocial: get('introSocial') || '',
    introDating: get('introDating') || '',
  } as PublicProfile
}

/** The whole gallery in its stored order, as only its owner sees it. */
export function mapProfileImagesToOwner(entries: ProfileGalleryEntry[]): OwnerProfileImage[] {
  return entries.map((entry, position) => toOwnerProfileImage(entry, position))
}

/**
 * The gallery as another viewer sees it, in the owner's order. Restricted images
 * are dropped unless `canSeeRestricted`; `[0]` is the primary either way.
 * Positions are the indexes after filtering.
 */
export function visibleProfileImages<T extends { isRestricted: boolean }>(
  entries: T[],
  canSeeRestricted: boolean
): T[] {
  return canSeeRestricted ? entries : entries.filter((e) => !e.isRestricted)
}

export function mapProfileImagesToPublic(
  entries: ProfileGalleryEntry[],
  canSeeRestricted: boolean
): PublicImage[] {
  return visibleProfileImages(entries, canSeeRestricted).map((entry, position) =>
    toPublicImage(entry.image, position)
  )
}

export function mapProfileSummary(profile: DbProfileSummary): ProfileSummary {
  return {
    id: profile.id,
    publicName: profile.publicName,
    profileImages: profile?.profileImages.map((g, position) => toPublicImage(g.image, position)),
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

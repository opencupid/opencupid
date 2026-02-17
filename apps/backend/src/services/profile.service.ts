import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

import { Profile, ProfileImage } from '@zod/generated'
import { type UpdateProfilePayload, type UpdateProfileScopePayload } from '@zod/profile/profile.dto'
import {
  DbProfileWithContext,
  DbOwnerUpdateScalars,
  DbProfileWithImages,
} from '@zod/profile/profile.db'
import { mapToLocalizedUpserts } from '@/api/mappers/profile.mappers'
import {
  blockedContextInclude,
  conversationContextInclude,
  interactionContextInclude,
  profileImageInclude,
  tagsInclude,
} from '@/db/includes/profileIncludes'
import { ProfileMatchService } from './profileMatch.service'

export class ProfileService {
  private static instance: ProfileService

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService()
    }
    return ProfileService.instance
  }

  async getProfileWithContextById(
    profileId: string,
    myProfileId: string
  ): Promise<DbProfileWithContext | null> {
    const query = {
      where: { id: profileId },
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
        ...interactionContextInclude(myProfileId),
        ...conversationContextInclude(myProfileId),
        ...blockedContextInclude(myProfileId),
      },
    }
    return await prisma.profile.findUnique(query)
  }

  async getProfileByUserId(userId: string): Promise<Profile | null> {
    return prisma.profile.findUnique({
      where: { userId },
    })
  }

  async getProfileById(profileId: string): Promise<Profile | null> {
    return prisma.profile.findUnique({
      where: { id: profileId },
    })
  }

  /**
   * getProfileCompleteByUserId fetches a complete profile including
   * localized fields tags, images identified by userId.
   * @param userId
   * @returns
   */
  async getProfileCompleteByUserId(userId: string): Promise<DbProfileWithImages | null> {
    return prisma.profile.findUnique({
      where: { userId },
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
    })
  }

  async getProfileCompleteById(profileId: string): Promise<DbProfileWithImages | null> {
    return prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
    })
  }

  /**
   * updateCompleteProfile updates a user's profile including related localized fields, tags, and images.
   * @param tx Prisma.TransactionClient - Prisma transaction client for atomic operations
   * @param locale  Used for returning the updated record with the correct localized fields.
   * @param userId
   * @param data
   * @returns
   */
  async updateCompleteProfile(
    tx: Prisma.TransactionClient,
    locale: string,
    userId: string,
    data: UpdateProfilePayload
  ): Promise<DbProfileWithImages> {
    // 1) Pull out complex parts
    const { tags, introSocialLocalized, introDatingLocalized, ...rest } = data

    // 2) Validate that the user has a profile
    const current = await tx.profile.findUnique({
      where: { userId },
    })

    if (!current) {
      throw new Error(`Profile not found for userId: ${userId}`)
    }

    const profileId = current.id

    // 3) Update tags using implicit many-to-many relation
    if (tags) {
      await tx.profile.update({
        where: { id: profileId },
        data: {
          // XXX duplicated in updateScopes(), should be refactored to be updated in only place only
          isActive: [data.isDatingActive, data.isSocialActive].some(Boolean),
          tags: {
            set: [],
            connect: tags.map(tagId => ({ id: tagId })),
          },
        },
      })
    }

    // 4) Handle localized fields
    const localizedPayload: Partial<UpdateProfilePayload> = {
      introSocialLocalized,
      introDatingLocalized,
    }

    const localizedUpdates = mapToLocalizedUpserts(profileId, localizedPayload)

    for (const { locale, updates } of localizedUpdates) {
      await this.upsertLocalizedProfileText(tx, profileId, locale, updates)
    }

    // XXX miserable hack
    const profileMatchService = ProfileMatchService.getInstance()

    // TODO factor this out of here
    // determine if the user has dating prefs already or we need to create defaults
    // awful hack. datingPrefs really needs to move out of the Profile table.
    const datingPrefsFragment =
      data.birthday && !current.prefAgeMax && !current.prefAgeMin
        ? profileMatchService.createDatingPrefsDefaults(data)
        : {}

    // 5) Update all scalar fields
    const updated = await tx.profile.update({
      where: { userId },
      data: {
        ...rest,
        ...datingPrefsFragment,
        isActive: true, // TODO change this to isVisible when we have that field
      },
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
    })
    return updated
  }

  async updateProfileScalars(userId: string, data: DbOwnerUpdateScalars) {
    return await prisma.profile.update({
      where: { userId },
      data: data,
    })
  }

  async upsertLocalizedProfileText(
    tx: Prisma.TransactionClient,
    profileId: string,
    locale: string,
    updates: Record<string, string>
  ) {
    await Promise.all(
      Object.entries(updates).map(([field, value]) =>
        tx.localizedProfileField.upsert({
          where: {
            profileId_field_locale: {
              profileId,
              field,
              locale,
            },
          },
          update: { value },
          create: {
            profileId,
            field,
            locale,
            value,
          },
        })
      )
    )
  }

  async updateScopes(
    userId: string,
    scopes: UpdateProfileScopePayload
  ): Promise<DbProfileWithImages | null> {
    const data: Prisma.ProfileUpdateInput = {}
    if (typeof scopes.isDatingActive === 'boolean') {
      data.isDatingActive = scopes.isDatingActive
    }
    if (typeof scopes.isSocialActive === 'boolean') {
      data.isSocialActive = scopes.isSocialActive
    }
    // isActive is exported into the session for authorization checks
    data.isActive = [data.isDatingActive, data.isSocialActive].some(Boolean)

    try {
      return await prisma.profile.update({
        where: { userId },
        data,
        include: {
          ...tagsInclude(),
          ...profileImageInclude(),
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return null
      }
      throw err
    }
  }

  public async addProfileImage(
    profileId: string,
    imageId: string
  ): Promise<{
    profileImages: ProfileImage[]
  }> {
    return prisma.profile.update({
      where: {
        id: profileId,
      },
      data: {
        profileImages: { connect: { id: imageId } },
      },
      select: {
        profileImages: true,
      },
    })
  }

  async addProfileTag(profileId: string, tagId: string): Promise<void> {
    await prisma.profile.update({
      where: { id: profileId },
      data: { tags: { connect: { id: tagId } } },
    })
  }

  async removeProfileTag(profileId: string, tagId: string): Promise<void> {
    await prisma.profile.update({
      where: { id: profileId },
      data: { tags: { disconnect: { id: tagId } } },
    })
  }

  /**
   * Attach a tag to a profile.
   */
  public async addTagToProfile(profileId: string, tagId: string): Promise<void> {
    await prisma.profile.update({
      where: { id: profileId },
      data: { tags: { connect: { id: tagId } } },
    })
  }

  /**
   * Remove a tag from a profile.
   */
  public async removeTagFromProfile(profileId: string, tagId: string): Promise<void> {
    await prisma.profile.update({
      where: { id: profileId },
      data: { tags: { disconnect: { id: tagId } } },
    })
  }

  async initializeProfiles(userId: string): Promise<Profile> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    })

    if (profile) {
      return profile
    }

    const newProfile = await prisma.profile.create({
      data: {
        userId,
        publicName: '',
      },
    })
    return newProfile
  }

  async blockProfile(blockingProfileId: string, blockedProfileId: string) {
    return prisma.profile.update({
      where: { id: blockingProfileId },
      data: {
        blockedProfiles: {
          connect: { id: blockedProfileId },
        },
      },
    })
  }

  async unblockProfile(blockingProfileId: string, blockedProfileId: string) {
    return prisma.profile.update({
      where: { id: blockingProfileId },
      data: {
        blockedProfiles: {
          disconnect: { id: blockedProfileId },
        },
      },
    })
  }

  async getVisibleProfiles(forProfileId: string) {
    const blockedIds = await prisma.profile.findUnique({
      where: { id: forProfileId },
      select: { blockedProfiles: { select: { id: true } } },
    })

    return prisma.profile.findMany({
      where: {
        id: {
          notIn: blockedIds?.blockedProfiles.map(p => p.id) || [],
        },
        blockedByProfiles: {
          none: {
            id: forProfileId,
          },
        },
      },
    })
  }

  async canInteract(profileAId: string, profileBId: string): Promise<boolean> {
    const [aBlocksB, bBlocksA] = await Promise.all([
      prisma.profile.findFirst({
        where: {
          id: profileAId,
          blockedProfiles: { some: { id: profileBId } },
        },
      }),
      prisma.profile.findFirst({
        where: {
          id: profileBId,
          blockedProfiles: { some: { id: profileAId } },
        },
      }),
    ])

    return !(aBlocksB || bBlocksA)
  }

  async getBlockedProfiles(
    profileId: string
  ): Promise<{ id: string; publicName: string; profileImages: ProfileImage[] }[]> {
    const result = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        blockedProfiles: {
          include: {
            profileImages: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    })
    return result?.blockedProfiles ?? []
  }

  // async findProfilesFor(locale: string, profileId: string): Promise<DbProfileComplete[]> {
  //   return await prisma.profile.findMany({
  //     where: {
  //       isActive: true,
  //       id: {
  //         not: profileId,
  //       },
  //     },
  //     include: {
  //       ...profileCompleteInclude(),
  //       ...conversationWithMyProfileInclude(profileId),
  //     },
  //   })
  // }
}

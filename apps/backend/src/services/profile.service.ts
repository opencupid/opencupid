import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

import { Profile, ProfileImage } from '@zod/generated'
import {
  type ProfileOptInSettings,
  type UpdateProfileOptInPayload,
  type UpdateProfileScopePayload,
} from '@zod/profile/profile.dto'
import {
  DbProfileWithContext,
  DbOwnerUpdateScalars,
  DbProfileWithImages,
  DatingEligibleProfileSchema,
  type ProfileUpdateInput,
} from '@zod/profile/profile.db'
import { mapToLocalizedUpserts } from '@/api/mappers/profile.mappers'
import {
  blockedContextInclude,
  conversationContextInclude,
  interactionContextInclude,
  profileImageInclude,
  tagsInclude,
} from '@/db/includes/profileIncludes'

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

  async getOptInSettingsByProfileId(profileId: string): Promise<ProfileOptInSettings | null> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        isCallable: true,
        user: {
          select: {
            newsletterOptIn: true,
            isPushNotificationEnabled: true,
          },
        },
      },
    })

    if (!profile) return null

    return {
      isCallable: profile.isCallable,
      newsletterOptIn: profile.user.newsletterOptIn,
      isPushNotificationEnabled: profile.user.isPushNotificationEnabled,
    }
  }

  /*
  TODO  #tech-debt - The updateOptInSettingsByUserId method executes separate queries for profile 
  and user updates, followed by separate findUnique queries when no updates are needed
   (lines 145-150, 168-174). Use a single query with a select that includes both profile
    and user fields in a join, reducing the number of database round trips from potentially
     4 queries to 2 (one for update, one for fallback read).

     This function is AI slop that needs to be drastically simplified.
    
  */
  async updateOptInSettingsByUserId(
    tx: Prisma.TransactionClient,
    userId: string,
    data: UpdateProfileOptInPayload
  ): Promise<ProfileOptInSettings> {
    const profileUpdateData: Prisma.ProfileUpdateInput = {}
    if (typeof data.isCallable === 'boolean') {
      profileUpdateData.isCallable = data.isCallable
    }

    const userUpdateData: Prisma.UserUpdateInput = {}
    if (typeof data.newsletterOptIn === 'boolean') {
      userUpdateData.newsletterOptIn = data.newsletterOptIn
    }
    if (typeof data.isPushNotificationEnabled === 'boolean') {
      userUpdateData.isPushNotificationEnabled = data.isPushNotificationEnabled
    }

    let isCallable: boolean
    if (Object.keys(profileUpdateData).length > 0) {
      const profile = await tx.profile.update({
        where: { userId },
        data: profileUpdateData,
        select: { isCallable: true },
      })
      isCallable = profile.isCallable
    } else {
      const profile = await tx.profile.findUnique({
        where: { userId },
        select: { isCallable: true },
      })
      if (!profile) throw new Error(`Profile not found for userId: ${userId}`)
      isCallable = profile.isCallable
    }

    let userFlags: {
      newsletterOptIn: boolean
      isPushNotificationEnabled: boolean
    } | null = null

    if (Object.keys(userUpdateData).length > 0) {
      userFlags = await tx.user.update({
        where: { id: userId },
        data: userUpdateData,
        select: {
          newsletterOptIn: true,
          isPushNotificationEnabled: true,
        },
      })
    } else {
      userFlags = await tx.user.findUnique({
        where: { id: userId },
        select: {
          newsletterOptIn: true,
          isPushNotificationEnabled: true,
        },
      })
    }

    if (!userFlags) throw new Error(`User not found: ${userId}`)

    return {
      isCallable,
      newsletterOptIn: userFlags.newsletterOptIn,
      isPushNotificationEnabled: userFlags.isPushNotificationEnabled,
    }
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
    data: ProfileUpdateInput
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
          tags: {
            set: [],
            connect: tags.map((tagId) => ({ id: tagId })),
          },
        },
      })
    }

    // 4) Handle localized fields
    const localizedPayload: Pick<
      ProfileUpdateInput,
      'introSocialLocalized' | 'introDatingLocalized'
    > = {
      introSocialLocalized,
      introDatingLocalized,
    }

    const localizedUpdates = mapToLocalizedUpserts(profileId, localizedPayload)

    for (const { locale, updates } of localizedUpdates) {
      await this.upsertLocalizedProfileText(tx, profileId, locale, updates)
    }

    // 5) Update all scalar fields
    const updated = await tx.profile.update({
      where: { userId },
      data: {
        ...rest,
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
  ): Promise<{
    id: string
    isDatingActive: boolean
    isSocialActive: boolean
    isActive: boolean
  } | null> {
    // When activating dating, verify the profile has all required dating fields
    if (scopes.isDatingActive) {
      const profile = await prisma.profile.findUnique({ where: { userId } })
      if (!profile) return null
      const result = DatingEligibleProfileSchema.safeParse({ ...profile, isDatingActive: true })
      if (!result.success) {
        const err = new Error('Profile must complete dating onboarding before activating dating mode')
        err.name = 'DatingEligibilityError'
        throw err
      }
    }

    const data: Prisma.ProfileUpdateInput = {
      isDatingActive: scopes.isDatingActive,
      // isActive is exported into the session for authorization checks
      // this is not currently modifiable by the user.
      // TODO expose this into a "take a break" mode in the GUI that deactivates the profile without deleting it.
      isActive: true,
    }

    try {
      return await prisma.profile.update({
        where: { userId },
        data,
        select: { id: true, isDatingActive: true, isSocialActive: true, isActive: true },
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
          notIn: blockedIds?.blockedProfiles.map((p) => p.id) || [],
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
}

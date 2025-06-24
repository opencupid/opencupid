import cuid from 'cuid'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

import { Profile, ProfileImage, ProfileTag } from '@zod/generated'
import {
  type UpdateProfilePayload
} from '@zod/profile/profile.dto'
import {
  DbProfileComplete,
  DbOwnerUpdateScalars,
  DbProfileWithImages
} from '@zod/profile/profile.db'
import { mapToLocalizedUpserts } from '@/api/mappers/profile.mappers'
import { profileCompleteInclude } from '@/db/includes/profileCompleteInclude'


const conversationWithMyProfileInclude = (myProfileId: string) => ({
  conversationParticipants: {
    where: {
      conversation: {
        participants: {
          some: {
            profileId: myProfileId,
          },
        },
      },
    },
    include: {
      conversation: true,
    },
  },
});


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

  async getProfileWithContextById(profileId: string, myProfileId: string,): Promise<DbProfileComplete | null> {

    return prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        ...profileCompleteInclude(),
        ...conversationWithMyProfileInclude(myProfileId),
      },
    })
  }

  async getProfileByUserId(userId: string): Promise<Profile | null> {
    return prisma.profile.findUnique({
      where: { userId },
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
        ...profileCompleteInclude(),
      },
    })
  }

  async getProfileCompleteById( profileId: string): Promise<DbProfileWithImages | null> {
    return prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        ...profileCompleteInclude(),
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
    const {
      tags,
      introSocialLocalized,
      introDatingLocalized,
      ...rest
    } = data

    // 2) Validate that the user has a profile
    const current = await tx.profile.findUnique({
      select: { id: true },
      where: { userId },
    })

    if (!current) {
      throw new Error(`Profile not found for userId: ${userId}`)
    }

    const profileId = current.id

    // 3) Update tags
    // delete all existing tags for this profile
    await tx.profileTag.deleteMany({
      where: { profileId },
    })

    // Re-create only the tags the user sent
    if (tags && tags.length > 0) {
      await tx.profileTag.createMany({
        data: tags.map(tagId => ({ profileId, tagId })),
        skipDuplicates: true,
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

    // 5) Update all scalar fields
    const updated = await tx.profile.update({
      where: { userId },
      data: {
        ...rest,
        isActive: true, // TODO change this to isVisible when we have that field
      },
      include: {
        ...profileCompleteInclude(),
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

  async addProfileTag(profileId: string, tagId: string): Promise<ProfileTag> {
    return prisma.profileTag.create({
      data: {
        profile: {
          connect: { id: profileId },
        },
        tag: {
          connect: { id: tagId },
        },
      },
    })
  }

  async removeProfileTag(profileId: string, tagId: string): Promise<void> {
    await prisma.profileTag.deleteMany({
      where: {
        profileId,
        tagId,
      },
    })
  }

  // async getAllProfiles(options?: {
  //   active?: boolean,
  //   includeImages?: boolean,
  //   includeTags?: boolean,
  //   limit?: number,
  //   offset?: number
  // }): Promise<ProfileComplete[]> {
  //   return prisma.profile.findMany({
  //     where: options?.active !== undefined ? { isActive: options.active } : undefined,
  //     include: {
  //       profileImage: options?.includeImages !== false,
  //       otherImages: options?.includeImages !== false,
  //       tags: options?.includeTags !== false
  //     },
  //     take: options?.limit,
  //     skip: options?.offset
  //   })
  // }
  /*
    async searchProfiles(searchOptions: {
      query?: string
      tags?: string[]
      active?: boolean
      limit?: number
      offset?: number
    }): Promise<ProfileComplete[]> {
      const { query, tags, active, limit, offset } = searchOptions
  
      // Build where clause dynamically
      const where: Prisma.ProfileWhereInput = {}
  
      if (active !== undefined) {
        where.isActive = active
      }
  
      if (query) {
        where.OR = [
          { publicName: { contains: query, mode: 'insensitive' } },
          { cityName: { contains: query, mode: 'insensitive' } },
        ]
      }
  
      if (tags && tags.length > 0) {
        where.tags = {
          some: {
            tagId: { in: tags },
          },
        }
      }
  
      return prisma.profile.findMany({
        where,
        include: {
          profileImages: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
        take: limit,
        skip: offset,
      })
    }
  */
  /**
   * Attach a tag to a profile.
   */
  public async addTagToProfile(profileId: string, tagId: string): Promise<ProfileTag> {
    return prisma.profileTag.create({
      data: { profileId, tagId },
    })
  }

  /**
   * Remove a tag from a profile.
   */
  public async removeTagFromProfile(profileId: string, tagId: string): Promise<ProfileTag> {
    return prisma.profileTag.delete({
      where: { profileId_tagId: { profileId, tagId } },
    })
  }

  async initializeProfiles(userId: string): Promise<Profile> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    })

    if (profile) {
      return profile
    }

    return prisma.profile.create({
      data: {
        userId,
        publicName: '',
        introSocial: '',
      },
    })
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

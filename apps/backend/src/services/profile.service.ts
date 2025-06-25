import cuid from 'cuid'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

import { Profile, ProfileImage, ProfileTag } from '@zod/generated'
import {
  type UpdateProfilePayload,
  type UpdateProfileScopePayload,
} from '@zod/profile/profile.dto'
import {
  DbProfileComplete,
  DbOwnerUpdateScalars,
  DbProfileWithImages
} from '@zod/profile/profile.db'
import { mapToLocalizedUpserts } from '@/api/mappers/profile.mappers'
import { profileCompleteInclude, profileImageInclude } from '@/db/includes/profileCompleteInclude'


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

  async getProfileCompleteById(profileId: string): Promise<DbProfileWithImages | null> {
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

  async updateScopes(
    userId: string,
    scopes: UpdateProfileScopePayload,
  ): Promise<DbProfileWithImages | null> {
    const data: Prisma.ProfileUpdateInput = {}
    if (typeof scopes.isDatingActive === 'boolean') {
      data.isDatingActive = scopes.isDatingActive
    }
    if (typeof scopes.isSocialActive === 'boolean') {
      data.isSocialActive = scopes.isSocialActive
    }

    try {
      return await prisma.$transaction(async tx => {
        const updated = await tx.profile.update({
          where: { userId },
          data,
          include: {
            ...profileCompleteInclude(),
          },
        })

        await tx.user.update({
          where: { id: userId },
          data: {
            hasActiveProfile:
              updated.isDatingActive || updated.isSocialActive,
          },
        })

        return updated
      })
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
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

  async blockProfile(blockingProfileId: string, blockedProfileId: string) {
    return prisma.profile.update({
      where: { id: blockingProfileId },
      data: {
        blockedProfiles: {
          connect: { id: blockedProfileId }
        }
      }
    });
  }

  async unblockProfile(blockingProfileId: string, blockedProfileId: string) {
    return prisma.profile.update({
      where: { id: blockingProfileId },
      data: {
        blockedProfiles: {
          disconnect: { id: blockedProfileId }
        }
      }
    });
  }

  async getVisibleProfiles(forProfileId: string) {
    const blockedIds = await prisma.profile.findUnique({
      where: { id: forProfileId },
      select: { blockedProfiles: { select: { id: true } } }
    });

    return prisma.profile.findMany({
      where: {
        id: {
          notIn: blockedIds?.blockedProfiles.map(p => p.id) || []
        },
        blockedByProfiles: {
          none: {
            id: forProfileId
          }
        }
      }
    });
  }

  async canInteract(profileAId: string, profileBId: string): Promise<boolean> {
    const [aBlocksB, bBlocksA] = await Promise.all([
      prisma.profile.findFirst({
        where: {
          id: profileAId,
          blockedProfiles: { some: { id: profileBId } }
        }
      }),
      prisma.profile.findFirst({
        where: {
          id: profileBId,
          blockedProfiles: { some: { id: profileAId } }
        }
      })
    ]);

    return !(aBlocksB || bBlocksA);
  }

  async getBlockedProfiles(profileId: string): Promise<{ id: string; publicName: string; profileImages: ProfileImage[] }[]> {
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
    });
    return result?.blockedProfiles ?? [];
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

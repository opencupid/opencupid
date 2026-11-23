import fs from 'fs'
import path from 'path'

import { canonicalizeEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { getMediaRoot, MEDIA_SUBDIR } from '@/lib/media'
import { Prisma, UserRole } from '@prisma/client'
import type { User } from '@zod/generated'
import { ValidateLoginTokenResponse } from '@zod/user/auth.dto'
import type { AccountDeletionFeedbackPayload } from '@zod/user/user.dto'
import type { UserIdentifier } from '@zod/user/user.dto'
import { customAlphabet } from 'nanoid'
import { nolookalikesSafe } from 'nanoid-dictionary'

// Long enough for a link opened later, from another app's browser (e.g. a
// sign-up started in a social app's in-app browser, finished from the mail app).
const LOGIN_TOKEN_TTL_MS = 1000 * 60 * 120 // 120 minutes

function getTokenExpiration() {
  return new Date(Date.now() + LOGIN_TOKEN_TTL_MS)
}

export class UserService {
  private static instance: UserService

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  async validateLoginToken(token: string): Promise<ValidateLoginTokenResponse> {
    const user = await prisma.user.findUnique({
      where: {
        loginToken: token,
      },
    })
    if (!user) {
      return { code: 'AUTH_INVALID_TOKEN', message: 'Invalid token', success: false }
    }

    if (user.loginTokenExp && user.loginTokenExp < new Date()) {
      return { code: 'AUTH_EXPIRED_TOKEN', message: 'Token has expired', success: false }
    }

    const isNewUser = user.isRegistrationConfirmed === false

    // Update the user's email confirmation status
    const userUpdated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isRegistrationConfirmed: true,
        loginToken: null, // Clear the reset token
        loginTokenExp: null, // Clear the expiration
        lastLoginAt: new Date(), // Update the last login date
      },
    })

    return { user: userUpdated, isNewUser, success: true }
  }

  /**
   * Issues the login token emailed in a magic link. A user who asks again while
   * their token is still valid gets the same token (with a fresh expiry), so
   * every magic link they were sent keeps working instead of only the newest.
   */
  async setLoginToken(
    authId: UserIdentifier,
    language: string,
    originDomain: string
  ): Promise<{
    user: User
    isNewUser: boolean
    token: string
  }> {
    const email = canonicalizeEmail(authId.email)
    const userExists = await prisma.user.findUnique({ where: { email } })
    const tokenExpiration = getTokenExpiration()

    if (userExists) {
      const isNewUser = userExists.isRegistrationConfirmed === false
      const hasValidToken =
        userExists.loginToken && userExists.loginTokenExp && userExists.loginTokenExp > new Date()
      const otp = hasValidToken ? userExists.loginToken! : this.generateLoginToken()
      // Skip issuing a new login token for blocked or deactivated users. updateMany
      // (vs update) treats a no-match filter as a no-op instead of throwing P2025.
      await prisma.user.updateMany({
        where: { id: userExists.id, isBlocked: false, isActive: true },
        data: {
          loginToken: otp,
          loginTokenExp: tokenExpiration,
        },
      })
      return { user: userExists, isNewUser, token: otp }
    }

    const otp = this.generateLoginToken()
    const user = await prisma.user.create({
      data: {
        email,
        loginToken: otp,
        loginTokenExp: tokenExpiration,
        language,
        originDomain,
      },
    })

    return { user, isNewUser: true, token: otp }
  }

  async getUserById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id: userId } })
  }

  addRole(user: User, role: UserRole): User {
    if (!user.roles.includes(role)) {
      user.roles.push(role)
    }
    return user
  }

  removeRole(user: User, role: UserRole): User {
    const index = user.roles.indexOf(role)
    if (index !== -1) {
      user.roles.splice(index, 1)
    }
    return user
  }

  async updateUser(tx: Prisma.TransactionClient, user: User): Promise<User | null> {
    const { id, ...dataToUpdate } = user
    const updated = await tx.user.update({
      where: { id },
      data: dataToUpdate,
    })

    return updated
  }

  async update(user: User): Promise<User | null> {
    const { id, ...dataToUpdate } = user
    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    })

    return updated
  }

  async findByAuthId(authId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: canonicalizeEmail(authId) } })
  }

  generateLoginToken() {
    return customAlphabet(nolookalikesSafe, 6)()
  }

  async deleteAccount(userId: string): Promise<void> {
    const deletedProfileId = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findUnique({
        where: { userId },
        select: { id: true },
      })

      if (profile) {
        const profileId = profile.id

        // Delete RESTRICT FK records that won't cascade automatically
        await tx.likedProfile.deleteMany({
          where: { OR: [{ fromId: profileId }, { toId: profileId }] },
        })
        await tx.hiddenProfile.deleteMany({
          where: { OR: [{ fromId: profileId }, { toId: profileId }] },
        })

        // Archive every conversation this profile is part of so it is hidden from
        // the surviving partner's inbox. Match on the pair fields, not participant
        // rows: PENDING conversations only have the sender's participant row.
        // The rows survive (profileAId/profileBId/initiatorProfileId become NULL via
        // SetNull) so the partner's ConversationParticipant is preserved and
        // markConversationRead no longer produces a P2025 error.
        await tx.conversation.updateMany({
          where: { OR: [{ profileAId: profileId }, { profileBId: profileId }] },
          data: { status: 'ARCHIVED' },
        })

        // Delete Profile — cascades: LocalizedProfileField, Image/ProfileImage,
        // ConversationParticipant (profileId FK), Message (senderId FK).
        // profileAId/profileBId/initiatorProfileId on Conversation are set to NULL (SetNull).
        await tx.profile.delete({ where: { id: profileId } })
      }

      // Delete User — cascades: ConnectionRequest, PushSubscription
      await tx.user.delete({ where: { id: userId } })
      return profile?.id ?? null
    })

    if (!deletedProfileId) return

    // Delete the profile's media from disk (outside transaction — best-effort cleanup).
    // Image and voice-attachment rows cascade with the Profile; their files live
    // under images/<profileId> and voice/<profileId>.
    for (const subdir of [MEDIA_SUBDIR.IMAGES, MEDIA_SUBDIR.VOICE]) {
      try {
        await fs.promises.rm(path.join(getMediaRoot(), subdir, deletedProfileId), {
          recursive: true,
          force: true,
        })
      } catch {
        // Ignore — directory may not exist
      }
    }
  }

  /**
   * First step of account closure: mark the user inactive, void any pending
   * login token and bump tokenVersion so refreshes fail, so the account can no
   * longer sign in even if the subsequent hard delete fails.
   */
  async deactivate(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        loginToken: null,
        loginTokenExp: null,
        tokenVersion: { increment: 1 },
      },
    })
  }

  async saveAccountDeletionFeedback(feedback: AccountDeletionFeedbackPayload): Promise<string> {
    const { id } = await prisma.accountDeletionFeedback.create({
      data: feedback,
      select: { id: true },
    })
    return id
  }

  /**
   * Adds a comment to an answer that has none. Returns false when there is no
   * such answer, so an existing comment can never be overwritten.
   */
  async addAccountDeletionFeedbackComment(id: string, comment: string): Promise<boolean> {
    const { count } = await prisma.accountDeletionFeedback.updateMany({
      where: { id, comment: null },
      data: { comment },
    })
    return count > 0
  }
}

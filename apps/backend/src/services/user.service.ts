import { prisma } from '@/lib/prisma'
import { Prisma, UserRole } from '@prisma/client'
import type { User } from '@zod/generated'
import { ValidateLoginTokenResponse } from '@zod/user/auth.dto'
import { type UserIdentifier, SessionProfileSchema, type SessionProfile } from '@zod/user/user.dto'
import { customAlphabet } from 'nanoid'
import { nolookalikesSafe } from 'nanoid-dictionary'

function getTokenExpiration() {
  return new Date(Date.now() + 1000 * 60 * 15) // 15 minutes
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

  async setLoginToken(
    authId: UserIdentifier,
    otp: string,
    language: string
  ): Promise<{
    user: User
    isNewUser: boolean
  }> {
    // Normalize identifiers: lowercase email, remove all whitespace from phone
    // Note: Callers ensure either email or phonenumber exists (validated at route level)
    let normalizedAuthId: { email: string } | { phonenumber: string }

    if (authId.email) {
      normalizedAuthId = { email: authId.email.toLowerCase() }
    } else if (authId.phonenumber) {
      // Remove all whitespace characters (spaces, tabs, newlines) from phone number
      normalizedAuthId = { phonenumber: authId.phonenumber.replace(/\s+/g, '') }
    } else {
      throw new Error(
        'Invalid authentication identifier: neither email nor phone number provided (should be validated at route level)'
      )
    }

    const authIdField = normalizedAuthId
    const userExists = await prisma.user.findUnique({ where: { ...authIdField } })
    const tokenExpiration = getTokenExpiration()

    // user record exists
    if (userExists) {
      // Check if registration completed already or we're dealing with a new user
      const isNewUser = userExists.isRegistrationConfirmed === false
      await prisma.user.update({
        where: { id: userExists.id },
        data: {
          loginToken: otp, // Clear the reset token
          loginTokenExp: tokenExpiration, // Clear the expiration
        },
      })
      return { user: userExists, isNewUser }
    }

    const isNewUser = true
    // register email address
    const user = await prisma.user.create({
      data: {
        ...authIdField,
        loginToken: otp,
        loginTokenExp: tokenExpiration,
        language,
      },
    })

    return { user, isNewUser }
  }

  async getUserById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id: userId } })
  }

  async getUserWithProfile(
    userId: string
  ): Promise<(User & { profile: SessionProfile | null }) | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })
    if (!user) return null
    return {
      ...user,
      profile: user.profile ? SessionProfileSchema.parse(user.profile) : null,
    }
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

  async bumpTokenVersion(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    })
  }

  async findByAuthId(authId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: authId.toLowerCase() }, { phonenumber: authId.replace(/\s+/g, '') }],
      },
    })
  }

  generateLoginToken() {
    return customAlphabet(nolookalikesSafe, 6)()
  }
}

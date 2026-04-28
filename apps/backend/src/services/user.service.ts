import { prisma } from '@/lib/prisma'
import { Prisma, UserRole } from '@prisma/client'
import type { User } from '@zod/generated'
import { ValidateLoginTokenResponse } from '@zod/user/auth.dto'
import type { UserIdentifier } from '@zod/user/user.dto'
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
    language: string,
    originDomain: string
  ): Promise<{
    user: User
    isNewUser: boolean
  }> {
    const email = authId.email.trim().toLowerCase()
    const userExists = await prisma.user.findUnique({ where: { email } })
    const tokenExpiration = getTokenExpiration()

    if (userExists) {
      const isNewUser = userExists.isRegistrationConfirmed === false
      // Skip issuing a new login token for blocked users. updateMany (vs update)
      // treats a no-match filter as a no-op instead of throwing P2025.
      await prisma.user.updateMany({
        where: { id: userExists.id, isBlocked: false },
        data: {
          loginToken: otp,
          loginTokenExp: tokenExpiration,
        },
      })
      return { user: userExists, isNewUser }
    }

    const user = await prisma.user.create({
      data: {
        email,
        loginToken: otp,
        loginTokenExp: tokenExpiration,
        language,
        originDomain,
      },
    })

    return { user, isNewUser: true }
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
    return prisma.user.findUnique({ where: { email: authId.toLowerCase() } })
  }

  generateLoginToken() {
    return customAlphabet(nolookalikesSafe, 6)()
  }
}

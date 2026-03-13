import cuid from 'cuid'
import { randomUUID } from 'crypto'
import { FastifyPluginAsync } from 'fastify'
import { notifierService } from '@/services/notifier.service'
import { UserService, type UserWithProfile } from 'src/services/user.service'
import { ProfileService } from 'src/services/profile.service'
import { RefreshTokenService } from 'src/services/refresh-token.service'
import { rateLimitConfig, sendError, sendUnauthorizedError } from '../helpers'
import { SmsService } from '@/services/sms.service'
import { CaptchaService } from '@/services/captcha.service'
import { appConfig } from '@/lib/appconfig'
import '@fastify/cookie'
import { generateMediaToken } from '@/lib/media'

import {
  UserIdentifyPayloadSchema,
  VerifyTokenPayloadSchema,
  RefreshTokenPayloadSchema,
  type LoginUser,
  type SessionData,
  type SessionProfile,
} from '@zod/user/user.dto'
import type {
  VerifyTokenResponse,
  RefreshTokenResponse,
  SendMagicLinkResponse,
  WsTicketResponse,
} from '@zod/apiResponse.dto'
import { UserIdentifier, JwtPayload } from '@zod/user/user.dto'
import type { User } from '@zod/generated'

const WS_TICKET_TTL = 30 // seconds

function buildSessionData(user: User, profileId: string, profile: SessionProfile): SessionData {
  return {
    userId: user.id,
    profileId,
    tokenVersion: user.tokenVersion,
    lang: user.language,
    roles: user.roles,
    hasActiveProfile: profile.isActive,
    profile: {
      id: profile.id,
      isDatingActive: profile.isDatingActive,
      isSocialActive: profile.isSocialActive,
      isActive: profile.isActive,
    },
  }
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = UserService.getInstance()
  const profileService = ProfileService.getInstance()
  const captchaService = new CaptchaService(appConfig.ALTCHA_HMAC_KEY)
  const refreshTokenService = new RefreshTokenService(fastify.redis)

  fastify.get(
    '/verify-token',
    {
      config: {
        ...rateLimitConfig(fastify, '15 minute', 5),
      },
    },
    async (req, reply) => {
      try {
        const params = VerifyTokenPayloadSchema.safeParse(req.query)
        if (!params.success) {
          return reply.code(400).send({ code: 'AUTH_INVALID_INPUT' })
        }
        const { token } = params.data
        const result = await userService.validateLoginToken(token)
        if (!result.success) {
          return reply.code(422).send({ code: result.code, message: result.message })
        }

        const { user, isNewUser } = result
        let profileId: string
        let sessionProfile: SessionProfile

        // new user
        if (isNewUser) {
          if (user.email)
            await notifierService.notifyUser('' + user.id, 'welcome', {
              link: `${appConfig.FRONTEND_URL}/me`,
            })
          // If the user is new, initialize their profiles
          const newProfile = await profileService.initializeProfiles(user.id)
          profileId = newProfile.id
          sessionProfile = newProfile
        } else {
          const existingProfile = (user as any).profile
          profileId = existingProfile.id
          sessionProfile = existingProfile
        }

        const payload: JwtPayload = {
          userId: user.id,
          profileId: profileId,
          tokenVersion: user.tokenVersion,
        }
        const jwt = fastify.jwt.sign(payload)
        await fastify.createSession(jwt, buildSessionData(user, profileId, sessionProfile))

        const refreshToken = await refreshTokenService.create(user.id, profileId, user.tokenVersion)

        // Set media auth cookie so nginx can verify media requests
        const mediaToken = generateMediaToken()
        reply.setCookie('__media_token', mediaToken.value, {
          path: '/user-content/',
          httpOnly: true,
          secure: appConfig.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: mediaToken.maxAge,
        })

        const response: VerifyTokenResponse = { success: true, token: jwt, refreshToken }
        reply.code(200).send(response)
      } catch (error) {
        return reply.code(500).send({ code: 'AUTH_INTERNAL_ERROR' })
      }
    }
  )

  fastify.post(
    '/refresh',
    {
      config: {
        ...rateLimitConfig(fastify, '1 minute', 10),
      },
    },
    async (req, reply) => {
      const params = RefreshTokenPayloadSchema.safeParse(req.body)
      if (!params.success) {
        return reply.code(400).send({ success: false, message: 'Invalid refresh token format' })
      }

      const { refreshToken } = params.data

      const auth = req.headers.authorization
      if (!auth) {
        return sendUnauthorizedError(reply, 'Missing Authorization header')
      }
      const [scheme, expiredJwt] = auth.split(' ')
      if (scheme !== 'Bearer' || !expiredJwt) {
        return sendUnauthorizedError(reply, 'Invalid Authorization format')
      }

      // Verify JWT signature but ignore expiration to get userId
      let jwtPayload: JwtPayload
      try {
        jwtPayload = fastify.jwt.verify(expiredJwt, { ignoreExpiration: true }) as JwtPayload
        if (!jwtPayload?.userId) {
          return sendUnauthorizedError(reply, 'Invalid token')
        }
      } catch {
        return sendUnauthorizedError(reply, 'Invalid token')
      }

      const tokenData = await refreshTokenService.validate(refreshToken, jwtPayload.userId)
      if (!tokenData) {
        return sendUnauthorizedError(reply, 'Invalid or expired refresh token')
      }

      // Verify tokenVersion matches
      if (tokenData.tokenVersion !== jwtPayload.tokenVersion) {
        // Token has been revoked — clean up this refresh token
        await refreshTokenService.delete(refreshToken, jwtPayload.userId)
        return sendUnauthorizedError(reply, 'Token revoked')
      }

      // Fetch current user to verify tokenVersion hasn't been bumped
      const user = await userService.getUserById(tokenData.userId, { include: { profile: true } })
      if (!user) {
        return sendUnauthorizedError(reply, 'User not found')
      }

      if (user.tokenVersion !== tokenData.tokenVersion) {
        // tokenVersion was bumped (e.g. password change, logout-all)
        await refreshTokenService.delete(refreshToken, jwtPayload.userId)
        return sendUnauthorizedError(reply, 'Token revoked')
      }

      // Issue new JWT and refresh token
      const newPayload: JwtPayload = {
        userId: user.id,
        profileId: tokenData.profileId,
        tokenVersion: user.tokenVersion,
      }
      const newJwt = fastify.jwt.sign(newPayload)

      const userWithProfile = user as UserWithProfile
      const sessionProfile = userWithProfile.profile ?? {
        id: tokenData.profileId,
        isDatingActive: false,
        isSocialActive: false,
        isActive: false,
      }
      await fastify.createSession(
        newJwt,
        buildSessionData(user, tokenData.profileId, sessionProfile)
      )

      const newRefreshToken = await refreshTokenService.create(
        user.id,
        tokenData.profileId,
        user.tokenVersion
      )

      // Delete old refresh token
      await refreshTokenService.delete(refreshToken, jwtPayload.userId)

      const response: RefreshTokenResponse = {
        success: true,
        token: newJwt,
        refreshToken: newRefreshToken,
      }
      reply.code(200).send(response)
    }
  )

  fastify.post(
    '/send-magic-link',
    {
      config: {
        ...rateLimitConfig(fastify, '15 minute', 5),
      },
    },
    async (req, reply) => {
      const params = UserIdentifyPayloadSchema.safeParse(req.body)
      if (!params.success) {
        return reply.code(400).send({ code: 'AUTH_MISSING_FIELD' })
      }

      const { email, phonenumber, captchaSolution, language } = params.data

      try {
        const captchaOk = await captchaService.validate(captchaSolution)
        if (!captchaOk) {
          return reply.code(403).send({ code: 'AUTH_INVALID_CAPTCHA' })
        }
      } catch (err: any) {
        fastify.log.error('Captcha validation error', err)
        return reply.code(500).send({ code: 'AUTH_INTERNAL_ERROR' })
      }

      let token = ''

      if (email) {
        token = userService.generateLoginToken()
      } else if (phonenumber) {
        const smsService = new SmsService(appConfig.SMS_API_KEY)
        const userId = cuid()
        const smsRes = await smsService.sendOtp(phonenumber, userId)
        if (smsRes.success && smsRes.otp && smsRes.otp !== '') {
          token = smsRes.otp
        } else {
          fastify.log.error('Textbelt error sending', smsRes.error)
          return reply.code(500).send({
            code: 'AUTH_INTERNAL_ERROR',
            message:
              'SMS sending is down at the moment. Apologies for that, please try again later.',
          })
        }
      }

      const authId: UserIdentifier = {
        email: email || undefined,
        phonenumber: phonenumber || undefined,
      }

      const { user, isNewUser } = await userService.setLoginToken(authId, token, language)

      const userReturned: LoginUser = {
        id: user.id,
        email: user.email,
        phonenumber: user.phonenumber,
        language: user.language,
        newsletterOptIn: user.newsletterOptIn,
        isPushNotificationEnabled: user.isPushNotificationEnabled,
      }

      if (user.email)
        await notifierService.notifyUser(user.id, 'login_link', {
          link: `${appConfig.FRONTEND_URL}/magic-link?token=${token}`,
        })

      const response: SendMagicLinkResponse = {
        success: true,
        user: userReturned,
        status: isNewUser ? 'register' : 'login',
      }
      return reply.code(200).send(response)
    }
  )

  fastify.post(
    '/logout',
    {
      onRequest: [fastify.authenticate],
    },
    async (req, reply) => {
      try {
        // Bump tokenVersion to invalidate all tokens for this user
        await userService.bumpTokenVersion(req.user.userId)
        // Delete current session
        await req.deleteSession()
        // Delete all refresh tokens for this user
        await refreshTokenService.deleteAllForUser(req.user.userId)
        // Clear media auth cookie
        reply.clearCookie('__media_token', { path: '/user-content/' })
        return reply.code(200).send({ success: true })
      } catch (error) {
        fastify.log.error({ err: error }, 'Error during logout')
        return sendError(reply, 500, 'Logout failed')
      }
    }
  )

  fastify.get(
    '/ws-ticket',
    {
      onRequest: [fastify.authenticate],
    },
    async (req, reply) => {
      const ticket = randomUUID()
      const data = {
        userId: req.user.userId,
        profileId: req.user.profileId,
      }
      await fastify.redis.set(`ws-ticket:${ticket}`, JSON.stringify(data), 'EX', WS_TICKET_TTL)
      const response: WsTicketResponse = { success: true, ticket }
      return reply.code(200).send(response)
    }
  )

  // Dev-only: retrieve the latest OTP for a given authId (skips Mailpit)
  if (appConfig.DEV_AUTH_BYPASS_ENABLED && appConfig.NODE_ENV !== 'production') {
    fastify.get('/dev/latest-token', async (req, reply) => {
      const { authId } = req.query as { authId?: string }
      if (!authId) {
        return reply.code(400).send({ code: 'MISSING_AUTH_ID' })
      }

      const user = await userService.findByAuthId(authId)
      if (!user?.loginToken) {
        return reply.code(404).send({ code: 'NO_PENDING_TOKEN' })
      }

      return reply.code(200).send({ token: user.loginToken })
    })
  }
}

export default authRoutes

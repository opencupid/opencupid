import cuid from 'cuid'
import { randomUUID } from 'crypto'
import { FastifyPluginAsync } from 'fastify'
import { notifierService } from '@/services/notifier.service'
import { UserService } from 'src/services/user.service'
import { ProfileService } from 'src/services/profile.service'
import { RefreshTokenService } from 'src/services/refresh-token.service'
import { rateLimitConfig, sendError, sendUnauthorizedError } from '../helpers'
import { SmsService } from '@/services/sms.service'
import { CaptchaService } from '@/services/captcha.service'
import { appConfig } from '@/lib/appconfig'

import {
  UserIdentifyPayloadSchema,
  OtpLoginPayloadSchema,
  RefreshTokenPayloadSchema,
  type LoginUser,
} from '@zod/user/user.dto'
import type {
  OtpLoginResponse,
  RefreshTokenResponse,
  SendLoginLinkResponse,
  WsTicketResponse,
} from '@zod/apiResponse.dto'
import { UserIdentifier, JwtPayload } from '@zod/user/user.dto'

const WS_TICKET_TTL = 30 // seconds

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = UserService.getInstance()
  const profileService = ProfileService.getInstance()
  const captchaService = new CaptchaService(appConfig.ALTCHA_HMAC_KEY)
  const refreshTokenService = new RefreshTokenService(fastify.redis)

  fastify.get(
    '/otp-login',
    {
      config: {
        ...rateLimitConfig(fastify, '15 minute', 5),
      },
    },
    async (req, reply) => {
      try {
        const params = OtpLoginPayloadSchema.safeParse(req.query)
        if (!params.success) {
          return reply.code(400).send({ code: 'AUTH_INVALID_INPUT' })
        }
        const { userId, otp } = params.data
        const result = await userService.validateUserOtpLogin(userId, otp)
        if (!result.success) {
          return reply.code(401).send({ code: result.code, message: result.message })
        }

        const { user, isNewUser } = result
        let profileId = null

        // new user
        if (isNewUser) {
          if (user.email)
            await notifierService.notifyUser('' + user.id, 'welcome', {
              link: `${appConfig.FRONTEND_URL}/me`,
            })
          // If the user is new, initialize their profiles
          const newProfile = await profileService.initializeProfiles(user.id)
          profileId = newProfile.id
        } else {
          // TODO FIXME otpLogin return a User which has no profile on it.
          profileId = (user as any).profile.id
        }

        const payload: JwtPayload = {
          userId: user.id,
          profileId: profileId,
          tokenVersion: user.tokenVersion,
        }
        const jwt = fastify.jwt.sign(payload)
        const refreshToken = await refreshTokenService.create(user.id, profileId, user.tokenVersion)
        const response: OtpLoginResponse = { success: true, token: jwt, refreshToken }
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
      const user = await userService.getUserById(tokenData.userId)
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
    '/send-login-link',
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

      let otp = ''

      if (email) {
        otp = userService.generateOTP()
      } else if (phonenumber) {
        const smsService = new SmsService(appConfig.SMS_API_KEY)
        const userId = cuid()
        const smsRes = await smsService.sendOtp(phonenumber, userId)
        if (smsRes.success && smsRes.otp && smsRes.otp !== '') {
          otp = smsRes.otp
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

      const { user, isNewUser } = await userService.setUserOTP(authId, otp, language)

      const userReturned: LoginUser = {
        id: user.id,
        email: user.email,
        phonenumber: user.phonenumber,
        language: user.language,
        newsletterOptIn: user.newsletterOptIn,
        isPushNotificationEnabled: user.isPushNotificationEnabled,
      }

      // new user
      if (isNewUser) {
        if (user.email)
          await notifierService.notifyUser(user.id, 'login_link', {
            otp,
            link: `${appConfig.FRONTEND_URL}/auth/otp?otp=${otp}`,
          })

        const response: SendLoginLinkResponse = {
          success: true,
          user: userReturned,
          status: 'register',
        }
        return reply.code(200).send(response)
      }

      //  existing user
      if (user.email)
        await notifierService.notifyUser(user.id, 'login_link', {
          otp,
          link: `${appConfig.FRONTEND_URL}/auth/otp?otp=${otp}`,
        })
      const response: SendLoginLinkResponse = {
        success: true,
        user: userReturned,
        status: 'login',
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
}

export default authRoutes

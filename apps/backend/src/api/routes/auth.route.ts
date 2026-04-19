import cuid from 'cuid'
import { randomUUID } from 'crypto'
import { FastifyPluginAsync, FastifyReply } from 'fastify'
import { notifierService } from '@/services/notifier.service'
import { UserService } from '@/services/user.service'
import { RefreshTokenService } from '@/services/refresh-token.service'
import { createNewUserSession, getExistingUserSession } from '@/services/auth-session'
import { rateLimitConfig, sendError, sendUnauthorizedError } from '../helpers'
import { SmsService } from '@/services/sms.service'
import { CaptchaService } from '@/services/captcha.service'
import { appConfig } from '@/lib/appconfig'
import '@fastify/cookie'

import {
  UserIdentifyPayloadSchema,
  VerifyTokenPayloadSchema,
  type LoginUser,
} from '@zod/user/user.dto'
import type {
  VerifyTokenResponse,
  RefreshTokenResponse,
  SendMagicLinkResponse,
  WsTicketResponse,
} from '@zod/apiResponse.dto'
import { UserIdentifier, JwtPayload } from '@zod/user/user.dto'
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTS,
  SESSION_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
} from '@shared/session'

function setSessionCookie(reply: FastifyReply, jwt: string) {
  reply.setCookie(SESSION_COOKIE, jwt, {
    ...SESSION_COOKIE_OPTS,
    httpOnly: false,
    secure: appConfig.NODE_ENV !== 'development',
    maxAge: SESSION_MAX_AGE,
  })
}

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    ...SESSION_COOKIE_OPTS,
    httpOnly: true,
    secure: appConfig.NODE_ENV !== 'development',
    maxAge: REFRESH_MAX_AGE,
  })
}

function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTS)
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE, SESSION_COOKIE_OPTS)
}

const WS_TICKET_TTL = 30 // seconds

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = UserService.getInstance()
  const captchaService = new CaptchaService(appConfig.ALTCHA_HMAC_KEY)
  const refreshTokenService = new RefreshTokenService(fastify.redis)

  /**
   * GET /verify-token
   * Validates a magic-link token, creates or resumes a user session.
   * Sets __session and __refresh cookies on success.
   * @query {string} token - The magic-link or OTP token
   * @returns {VerifyTokenResponse} JWT access token (refresh token set via httpOnly cookie)
   */
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

        // disabled for now.
        // if (isNewUser && user.email) {
        //   await notifierService.notifyUser('' + user.id, 'welcome', {
        //     link: `${appConfig.FRONTEND_URL}/me`,
        //   })
        // }

        const session = isNewUser
          ? await createNewUserSession(user)
          : await getExistingUserSession(user)
        if (!session) return sendError(reply, 404, 'Profile not found')

        // TODO: profileId in JWT and refresh token is redundant with session data — remove in follow-up
        const payload: JwtPayload = {
          userId: user.id,
          profileId: session.profileId,
          tokenVersion: user.tokenVersion,
        }
        const jwt = fastify.jwt.sign(payload)
        await fastify.createSession(jwt, session.sessionData)

        const refreshToken = await refreshTokenService.create(
          user.id,
          session.profileId,
          user.tokenVersion
        )

        setSessionCookie(reply, jwt)
        setRefreshCookie(reply, refreshToken)

        const response: VerifyTokenResponse = { success: true, token: jwt }
        reply.code(200).send(response)
      } catch (error) {
        return reply.code(500).send({ code: 'AUTH_INTERNAL_ERROR' })
      }
    }
  )

  /**
   * POST /refresh
   * Issues a new JWT using the expired __session cookie and __refresh cookie.
   * No request body needed — both tokens are read from cookies.
   * @returns {RefreshTokenResponse} New JWT (new refresh token set via httpOnly cookie)
   */
  fastify.post(
    '/refresh',
    {
      config: {
        ...rateLimitConfig(fastify, '1 minute', 10),
      },
    },
    async (req, reply) => {
      const refreshToken = req.cookies[REFRESH_COOKIE]
      if (!refreshToken) {
        return sendUnauthorizedError(reply, 'Missing refresh token')
      }

      const expiredJwt = req.cookies[SESSION_COOKIE]
      if (!expiredJwt) {
        return sendUnauthorizedError(reply, 'Missing session cookie')
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

      const session = await getExistingUserSession(user)
      if (!session) return sendUnauthorizedError(reply, 'Profile not found')

      // Issue new JWT and refresh token
      const newPayload: JwtPayload = {
        userId: user.id,
        profileId: session.profileId,
        tokenVersion: user.tokenVersion,
      }
      const newJwt = fastify.jwt.sign(newPayload)

      await fastify.createSession(newJwt, session.sessionData)

      const newRefreshToken = await refreshTokenService.create(
        user.id,
        session.profileId,
        user.tokenVersion
      )

      // Delete old refresh token
      await refreshTokenService.delete(refreshToken, jwtPayload.userId)

      setSessionCookie(reply, newJwt)
      setRefreshCookie(reply, newRefreshToken)

      const response: RefreshTokenResponse = { success: true, token: newJwt }
      reply.code(200).send(response)
    }
  )

  /**
   * POST /send-magic-link
   * Sends a magic-link login email or SMS OTP code to the given identifier.
   * Creates the user if they don't exist yet.
   * @body {string} [email] - Email address (send email link)
   * @body {string} [phonenumber] - Phone number (send SMS OTP)
   * @body {string} captchaSolution - ALTCHA captcha solution
   * @body {string} [language] - Preferred language code
   * @returns {SendMagicLinkResponse} User info + status ('login' | 'register')
   */
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

      const originDomain = req.hostname.toLowerCase().split(':')[0]
      const { user, isNewUser } = await userService.setLoginToken(
        authId,
        token,
        language,
        originDomain
      )

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

  /**
   * POST /logout
   * Revokes the current session and its associated refresh token only.
   * Other active sessions (other devices/browsers) are not affected.
   * @returns {{ success: boolean }}
   */
  fastify.post(
    '/logout',
    {
      onRequest: [fastify.authenticate],
    },
    async (req, reply) => {
      try {
        // Delete current session and its refresh token only — do not bump
        // tokenVersion, which would invalidate all other active sessions
        // (other devices/browsers) since we have no "logout all" feature.
        await req.deleteSession()
        const refreshToken = req.cookies[REFRESH_COOKIE]
        if (refreshToken) {
          await refreshTokenService.delete(refreshToken, req.user.userId)
        }
        clearSessionCookie(reply)
        clearRefreshCookie(reply)
        return reply.code(200).send({ success: true })
      } catch (error) {
        fastify.log.error({ err: error }, 'Error during logout')
        return sendError(reply, 500, 'Logout failed')
      }
    }
  )

  /**
   * GET /ws-ticket
   * Generates a short-lived ticket (30s) for authenticating a WebSocket connection.
   * @returns {WsTicketResponse} { ticket: string }
   */
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
    /**
     * GET /dev/latest-token (dev only)
     * Returns the most recent login token for a given authId, bypassing email/SMS delivery.
     * @query {string} authId - The user's email or phone number
     * @returns {{ token: string }}
     */
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

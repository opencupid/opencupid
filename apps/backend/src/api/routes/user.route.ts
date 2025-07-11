import cuid from 'cuid'
import { FastifyPluginAsync } from 'fastify'
import { notifierService } from '@/services/notifier.service'
import { UserService } from 'src/services/user.service'
import { ProfileService } from 'src/services/profile.service'
import { rateLimitConfig, sendError, sendUnauthorizedError } from '../helpers'
import { SmsService } from '@/services/sms.service'
import { CaptchaService } from '@/services/captcha.service'
import { appConfig } from '@/lib/appconfig'

import { UserIdentifyPayloadSchema, OtpLoginPayloadSchema, type LoginUser } from '@zod/user/user.dto'
import type { OtpLoginResponse, SendLoginLinkResponse, UserMeResponse } from '@zod/apiResponse.dto'
import { UserIdentifier, JwtPayload } from '@zod/user/user.dto'
import { User } from '@zod/generated'


const userRoutes: FastifyPluginAsync = async fastify => {
  const userService = UserService.getInstance()
  const profileService = ProfileService.getInstance()
  const captchaService = new CaptchaService(appConfig.ALTCHA_HMAC_KEY)

  fastify.get('/otp-login', {
    // rate limiter
    config: {
      ...rateLimitConfig(fastify, '5 minute', 5), // 10 requests per minute
    },
  }, async (req, reply) => {
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
          await notifierService.notifyUser(''+user.id, 'welcome', {
            link: `${appConfig.FRONTEND_URL}/me`,
          })
        // If the user is new, initialize their profiles
        const newProfile = await profileService.initializeProfiles(user.id)
        profileId = newProfile.id
      } else {
        // TODO FIXME otpLogin return a User which has no profile on it.
        profileId = user.profile.id
      }

      const payload: JwtPayload = { userId: user.id, profileId: profileId }
      // console.info('jwt payload', payload)
      const jwt = fastify.jwt.sign(payload)
      const response: OtpLoginResponse = { success: true, token: jwt }
      reply.code(200).send(response)
    } catch (error) {
      return reply.code(500).send({ code: 'AUTH_INTERNAL_ERROR' })
    }
  })

  fastify.post('/send-login-link', {
    // rate limiter
    config: {
      ...rateLimitConfig(fastify, '5 minute', 5), // 10 requests per minute
    },
  }, async (req, reply) => {

    const params = UserIdentifyPayloadSchema.safeParse(req.body)
    if (!params.success) {
      return reply.code(400).send({ code: 'AUTH_MISSING_FIELD' })
    }

    const { email, phonenumber, captchaSolution, language } = params.data

    // const data: AuthIdentifierCaptchaInput | null = validateBody(AuthIdentifierCaptchaInputSchema, req, reply)
    // if (!data) return

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
          message: 'SMS sending is down at the moment. Apologies for that, please try again later.'
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
        status: 'register'
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
      status: 'login'
    }
    return reply.code(200).send(response)
  })

  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (req, reply) => {
      // if (req.user === null) return sendUnauthorizedError(reply)

      try {
        const user = await userService.getUserById(req.user.userId, {
          select: {
            email: true,
            phonenumber: true,
            language: true,
          },
        })

        if (!user) return sendUnauthorizedError(reply)
        const response: UserMeResponse = { success: true, user }
        return reply.code(200).send(response)

      } catch (error) {
        fastify.log.error('Error fetching user:', error)
        return sendError(reply, 500, 'Failed to fetch user')
      }
    }
  )

  // !!! TODO this is a temporary endpoint/hack to update the language
  // need to be replaced with a proper user settings endpoint
  fastify.patch(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (req, reply) => {
      const { language } = req.body as { language: string }
      if (!language) {
        return sendError(reply, 400, 'Language is required')
      }
      try {
        await userService.update({
          id: req.user.userId,
          language
        } as User)
        await req.deleteSession()

        return reply.code(200).send({ success: true })
      } catch (error) {
        return sendError(reply, 500, 'Failed to update language')
      }
    }
  )
}

export default userRoutes

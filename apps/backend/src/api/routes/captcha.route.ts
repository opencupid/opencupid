import { FastifyPluginAsync } from 'fastify'
import { createChallenge } from 'altcha-lib'
import { sendError } from '../helpers'
import { appConfig } from '@/lib/appconfig'
import type { CaptchaChallengeResponse } from '@zod/apiResponse.dto'

const captchaRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /challenge
   * Generates an ALTCHA proof-of-work captcha challenge for client-side solving.
   * @returns {CaptchaChallengeResponse} Challenge parameters (algorithm, challenge, salt, etc.)
   */
  fastify.get('/challenge', async (_request, reply) => {
    try {
      const challenge = await createChallenge({
        hmacKey: appConfig.ALTCHA_HMAC_KEY,
        maxNumber: 50_000,
      })
      const response: CaptchaChallengeResponse = challenge
      return reply.code(200).send(response)
    } catch (error: any) {
      return sendError(reply, 500, 'Failed to create challenge')
    }
  })
}

export default captchaRoutes

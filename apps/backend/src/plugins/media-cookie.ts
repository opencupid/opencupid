import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import '@fastify/cookie'
import { generateMediaToken } from '@/lib/media'
import { appConfig } from '@/lib/appconfig'

const COOKIE_NAME = '__media_token'
const COOKIE_PATH = '/user-content/'

/** Minimum remaining seconds before we refresh the cookie. */
const REFRESH_THRESHOLD = 60

export default fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (req, reply) => {
    // Only act after authentication has populated req.session
    if (!req.session) return

    const existing = req.cookies[COOKIE_NAME]
    if (existing) {
      // Check if the cookie still has enough lifetime
      const [expStr] = existing.split(':')
      const exp = Number(expStr)
      const remaining = exp - Math.floor(Date.now() / 1000)
      if (remaining > REFRESH_THRESHOLD) return
    }

    const { value, maxAge } = generateMediaToken()
    reply.setCookie(COOKIE_NAME, value, {
      path: COOKIE_PATH,
      httpOnly: true,
      secure: appConfig.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
    })
  })
})

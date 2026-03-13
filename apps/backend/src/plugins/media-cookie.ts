import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import '@fastify/cookie'
import { generateMediaToken } from '@/lib/media'
import { appConfig } from '@/lib/appconfig'

const COOKIE_NAME = '__media_token'
const COOKIE_PATH = '/user-content/'

export default fp(async (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', async (req, reply) => {
    if (!req.session) return

    const { value, maxAge } = generateMediaToken()
    reply.setCookie(COOKIE_NAME, value, {
      path: COOKIE_PATH,
      httpOnly: true,
      secure: appConfig.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge,
    })
  })
})

import { FastifyPluginAsync } from 'fastify'
import { parse as parseCookie, serialize as serializeCookie } from 'cookie'
import { appConfig } from '@/lib/appconfig'
import { sendUnauthorizedError } from '../helpers'

const imageAuthRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/image-token', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const payload = { userId: req.user.userId, profileId: req.user.profileId }
    const token = fastify.jwt.sign(payload)

    const cookie = serializeCookie('ImageAccessToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/images',
      domain: appConfig.DOMAIN,
    })
    reply.header('Set-Cookie', cookie)
    return reply.code(200).send({ success: true })
  })

  fastify.get('/image', async (req, reply) => {
    const cookies = parseCookie(req.headers.cookie || '')
    const token = cookies['ImageAccessToken']
    if (!token) return sendUnauthorizedError(reply)
    try {
      fastify.jwt.verify(token)
      return reply.code(204).send()
    } catch (err) {
      return sendUnauthorizedError(reply)
    }
  })
}

export default imageAuthRoutes

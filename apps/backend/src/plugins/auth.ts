import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { sendUnauthorizedError } from 'src/api/helpers'
import { appConfig } from '@/lib/appconfig'

export default fp(async fastify => {
  if (!appConfig.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined in appConfig')
  }
  fastify.register(fastifyJwt, {
    secret: appConfig.JWT_SECRET,
  })

  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch (err) {
      return sendUnauthorizedError(reply)
    }
  })
})

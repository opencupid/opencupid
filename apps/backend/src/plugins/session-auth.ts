import fp from 'fastify-plugin'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import Redis from 'ioredis'


import { UserService, type UserWithProfile } from 'src/services/user.service'
import { SessionService } from '../services/session.service'
import { sendUnauthorizedError } from 'src/api/helpers'
import { appConfig } from '@/lib/appconfig'
import { SessionData, SessionProfile, SessionProfileSchema } from '@zod/user/user.types'

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
  interface FastifyRequest {
    session: SessionData
    deleteSession: () => Promise<void>
  }
}

const redisUrl = appConfig.REDIS_URL
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not defined')
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(fastifyJwt, {
    secret: appConfig.JWT_SECRET,
  })

  // Initialize Redis client
  const redis = new Redis(redisUrl)
  fastify.decorate('redis', redis)
  const sessionService = new SessionService(redis)

  // Auth hook reads Bearer token as session ID
  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch (err) {
      return sendUnauthorizedError(reply)
    }

    const auth = req.headers.authorization
    if (!auth) {
      return sendUnauthorizedError(reply, 'Missing Authorization header')
    }
    const [scheme, sessionId] = auth.split(' ')
    if (scheme !== 'Bearer' || !sessionId) {
      return sendUnauthorizedError(reply, 'Invalid Authorization format')
    }

    // Try to fetch an existing session from Redis
    let sess = await sessionService.get(sessionId)
    if (!sess) {
      const userId = req.user?.userId
      if (!userId) {
        return sendUnauthorizedError(reply, 'Invalid session')
      }

      let user

      try {
        user = await UserService.getInstance().getUserById(userId, {
          include: {
            profile: true,
          },
        }) as UserWithProfile
        if (!user) return sendUnauthorizedError(reply, 'User not found')
      } catch (error) {
        fastify.log.error('Error fetching user for session refresh:', error)
        return sendUnauthorizedError(reply, 'Session refresh failed')
      }

      const profile = SessionProfileSchema.parse(user.profile || null)

      const sessionData: SessionData = {
        lang: user.language || 'en', // Default to 'en' if no language is set
        roles: user.roles,
        userId: user.id,
        profileId: user.profile?.id || '',
        hasActiveProfile: user.profile.isActive,
        profile: profile
      }
      sess = await sessionService.getOrCreate(sessionId, sessionData)
      console.error(`Created new session for user ${user.id} with session ID ${sessionId}`)
    } else {
      // Refresh TTL on simple reads
      await sessionService.refreshTtl(sessionId)
    }
    req.session = sess
    req.deleteSession = async () => {
      return await sessionService.delete(sessionId)
    }
  })
})

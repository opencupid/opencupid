import 'fastify'
import '@fastify/jwt'

import { PrismaClient } from '@prisma/client'
import type { SocketStream } from '@fastify/websocket'
import type { JwtPayload } from '@zod/user/user.dto'

import type { MessageService } from '../services/messaging.service'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    connections: Record<string, SocketStream['socket']>
    messageService: MessageService
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

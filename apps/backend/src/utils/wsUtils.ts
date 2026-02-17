import { JwtPayload } from '@zod/user/user.dto'
import { FastifyRequest } from 'fastify'
import { z } from 'zod'
import { FastifyInstance } from 'fastify'

export function broadcastToProfile(
  fastify: FastifyInstance,
  recipientProfileId: string,
  payload: Record<string, any>
) {
  const sockets = fastify.connections?.get(recipientProfileId)
  if (!sockets || sockets.size === 0) {
    fastify.log.warn(`No active WebSocket connections for recipient ${recipientProfileId}`)
    return false
  }
  sockets.forEach((socket: WebSocket) => {
    if (socket?.readyState === socket.OPEN) {
      socket.send(JSON.stringify(payload))
    }
  })
  return true
}

const TokenQuerySchema = z.object({
  token: z.string().min(1),
})

export function verifyWsToken(req: FastifyRequest, jwt: any): JwtPayload {
  const parsed = TokenQuerySchema.safeParse(req.query)
  // console.log('Parsed token query:', parsed)
  if (!parsed.success) {
    throw new Error('Missing or malformed token')
  }

  const payload = jwt.verify(parsed.data.token)
  if (!payload?.userId) {
    throw new Error('Invalid token payload')
  }

  return payload
}

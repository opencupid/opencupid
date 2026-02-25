import { FastifyRequest } from 'fastify'
import { z } from 'zod'
import { FastifyInstance } from 'fastify'
import Redis from 'ioredis'

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

const TicketQuerySchema = z.object({
  ticket: z.string().uuid(),
})

export async function verifyWsTicket(
  req: FastifyRequest,
  redis: Redis
): Promise<{ userId: string; profileId: string }> {
  const parsed = TicketQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    throw new Error('Missing or malformed ticket')
  }

  const key = `ws-ticket:${parsed.data.ticket}`
  // Atomic get-and-delete to prevent race conditions (single-use ticket)
  const raw = await redis.getdel(key)
  if (!raw) {
    throw new Error('Invalid or expired ticket')
  }

  const data = JSON.parse(raw)
  if (!data?.userId || !data?.profileId) {
    throw new Error('Invalid ticket payload')
  }

  return { userId: data.userId, profileId: data.profileId }
}

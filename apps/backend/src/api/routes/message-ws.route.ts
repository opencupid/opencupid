import type WebSocket from 'ws'
import { FastifyPluginAsync } from 'fastify'

import { verifyWsTicket } from '@/utils/wsUtils'

interface WsMessage {
  to: string // recipient userId
  content: string // message content
}

const messageWsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/message', { websocket: true }, async (socket: WebSocket, req) => {
    let profileId: string
    try {
      const ticket = await verifyWsTicket(req, fastify.redis)
      profileId = ticket.profileId
    } catch (err: any) {
      fastify.log.warn(`WebSocket ticket verification failed: ${err.message}`)
      socket.close()
      return
    }

    if (!profileId) {
      fastify.log.warn('WebSocket connection without userId, closing')
      socket.close()
      return
    }

    fastify.log.info(`WebSocket connection established for user ${profileId}`)
    // Add socket to profile's set
    let sockets = fastify.connections.get(profileId)
    if (!sockets) {
      sockets = new Set<WebSocket>()
      fastify.connections.set(profileId, sockets)
    }
    sockets.add(socket)

    socket.on('close', () => {
      fastify.log.info(`WebSocket connection closed for profile ${profileId}`)
      sockets!.delete(socket)
      if (sockets!.size === 0) {
        fastify.connections.delete(profileId)
      }
    })

    socket.on('error', (err: any) => {
      fastify.log.error('WebSocket error', err)
    })

    socket.on('ping', () => {
      fastify.log.debug('Received ping from client')
    })

    socket.on('pong', () => {
      fastify.log.debug('Received pong from client')
    })

    socket.on('message', async (raw: any) => {
      fastify.log.info(`Received message from user ${profileId}: ${raw.toString()}`)

      let data: WsMessage

      try {
        data = JSON.parse(raw.toString()) as WsMessage
      } catch (err) {
        fastify.log.warn({ err }, 'Malformed JSON received on WebSocket')
        return
      }

      // Ignore heartbeat messages from client
      if ((data as any).type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong' }))
        return
      }

      if (!data.to || !data.content) {
        fastify.log.warn({ msg: data }, 'WS message missing required fields')
        return
      }
    })
  })
}

export default messageWsRoutes

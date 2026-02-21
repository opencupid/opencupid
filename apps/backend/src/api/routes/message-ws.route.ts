import type WebSocket from 'ws'
import { FastifyPluginAsync } from 'fastify'

import { verifyWsToken } from '@/utils/wsUtils'

interface WsMessage {
  to: string // recipient userId
  content: string // message content
}

const messageWsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/message', { websocket: true }, (socket: WebSocket, req) => {
    const { profileId } = verifyWsToken(req, fastify.jwt)

    if (!profileId) {
      fastify.log.warn('WebSocket connection without userId, closing')
      socket.close()
      return
    }

    fastify.log.info(`WebSocket connection established for user ${profileId}`)
    // fastify.connections.set(profileId, socket)
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

      // try {
      //   const msg = await messageService.sendMessage(userId, data.to, data.content)
      //   const receiver = fastify.connections.get(data.to)
      //   if (receiver && receiver.readyState === receiver.OPEN) {
      //     receiver.send(JSON.stringify({
      //       id: msg.id,
      //       from: userId,
      //       content: msg.content,
      //       createdAt: msg.createdAt
      //     }))
      //   }
      // } catch (err) {
      //   fastify.log.error('Failed to persist or forward WS message', err)
      // }
    })
  })
}

export default messageWsRoutes

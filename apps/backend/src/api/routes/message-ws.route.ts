import type WebSocket from 'ws'
import { FastifyPluginAsync } from 'fastify'
import websocket from '@fastify/websocket'

import { verifyWsToken } from '@/lib/verifyWsToken'
import { MessageService } from '@/services/message.service'

interface WsMessage {
  to: string // recipient userId
  content: string // message content
}

const messageWsRoutes: FastifyPluginAsync = async (fastify) => {

  await fastify.register(websocket)
  const messageService = MessageService.getInstance()

  fastify.decorate('connections', {} as Record<string, WebSocket>)

  fastify.get('/message', { websocket: true }, (socket: WebSocket, req) => {

    const { userId } = verifyWsToken(req, fastify.jwt) // fix req.reuqest typing

    if (!userId) {
      fastify.log.warn('WebSocket connection without userId, closing')
      socket.close()
      return
    }

    fastify.log.info(`WebSocket connection established for user ${userId}`)
    fastify.connections[userId] = socket

    socket.on('close', () => {
      fastify.log.info(`WebSocket connection closed for user ${userId}`)
      delete fastify.connections[userId]
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
      fastify.log.info(`Received message from user ${userId}: ${raw.toString()}`)

      let data: WsMessage

      try {
        data = JSON.parse(raw.toString()) as WsMessage
      } catch (err) {
        fastify.log.warn('Malformed JSON received on WebSocket', err)
        return
      }

      // Ignore heartbeat messages from client
      if ((data as any).type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong' }))
        return
      }

      if (!data.to || !data.content) {
        fastify.log.warn('WS message missing required fields', data)
        return
      }

      try {
        const msg = await messageService.sendMessage(userId, data.to, data.content)
        const receiver = fastify.connections[data.to]
        if (receiver && receiver.readyState === receiver.OPEN) {
          receiver.send(JSON.stringify({
            id: msg.id,
            from: userId,
            content: msg.content,
            createdAt: msg.createdAt
          }))
        }
      } catch (err) {
        fastify.log.error('Failed to persist or forward WS message', err)
      }
    })
  })

}

export default messageWsRoutes

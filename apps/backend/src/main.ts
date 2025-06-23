import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import cors from '@fastify/cors'
import { appConfig } from '@shared/config/appconfig'

import './workers/emailWorker' // ← side‐effect: starts the worker
import { checkImageRoot } from '@/lib/media'

import fs from 'fs'
import path from 'path'

// const key = fs.readFileSync(path.join(__dirname, '../../../certs/key.pem'))
// const cert = fs.readFileSync(path.join(__dirname, '../../../certs/cert.pem'))

const app = Fastify({
  // https: {
  //   key,
  //   cert,
  // },
  logger: {
    transport:
      appConfig.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
  },
})

// Register CORS plugin
app.register(cors, {
  origin: appConfig.NODE_ENV === 'production' ? appConfig.FRONTEND_URL : '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'],
})

app.register(import('./plugins/websockets'))
app.register(import('./plugins/prisma'))
app.register(import('./plugins/session-auth'))
app.register(import('./plugins/rate-limiter'))

if(process.env.RECORD_API === 'true') {
  app.register(import('./plugins/api-recorder'))
}

// API routes
app.register(import('./api'), { prefix: '/api' })

// WebSocket routes
const wsRoutes = import('./api/routes/message-ws.route')
app.register(wsRoutes, { prefix: '/ws' })

const ok = checkImageRoot()
if (!ok) {
  app.log.error('Media upload directory cannot be created or is not writable')
  process.exit(1)
}

app.listen(
  {
    port: appConfig.API_PORT,
    host: '0.0.0.0', // Listen on all interfaces
  },
  err => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
  }
)

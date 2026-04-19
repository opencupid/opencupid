import Sentry from '@/lib/sentry' // keep this at the top

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { appConfig } from '@/lib/appconfig'
import { logger } from '@/lib/logger'
import './lib/i18n' // Initialize i18next with translations

import { checkUserContentRoot } from '@/lib/media'

import { ImageProcessor } from './services/imageprocessor'

async function main() {
  const app = Fastify({
    trustProxy: true,
    disableRequestLogging: true,
    loggerInstance: logger,
  })

  app.log.info(`🚀 Starting API, version ${__APP_VERSION__}`)

  // Register CORS plugin
  app.register(cors, {
    origin: appConfig.NODE_ENV === 'production' ? [appConfig.FRONTEND_URL] : true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'],
  })

  // Security headers for API responses
  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    return payload
  })

  app.register(import('@fastify/cookie'))
  app.register(import('./plugins/websockets'))
  app.register(import('./plugins/prisma'))
  app.register(import('./plugins/session-auth'))
  app.register(import('./plugins/activity-tracking'))
  // API routes
  app.register(import('./api/index'), { prefix: '/api' })

  // WebSocket routes
  const wsRoutes = import('./api/routes/message-ws.route')
  app.register(wsRoutes, { prefix: '/ws' })

  const ok = checkUserContentRoot()
  if (!ok) {
    app.log.error('Media upload directory cannot be created or is not writable')
    process.exit(1)
  }

  // load face detection models
  await ImageProcessor.initialize()

  app.listen(
    {
      port: appConfig.API_PORT,
      host: '0.0.0.0',
    },
    (err) => {
      if (err) {
        app.log.error(err)
        process.exit(1)
      }
    }
  )
}

main().catch((err) => {
  console.error(err)
  Sentry.captureException(err)
  process.exit(1)
})

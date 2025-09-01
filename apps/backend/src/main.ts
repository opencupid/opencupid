import path from 'path'

import Sentry from '@/lib/sentry' // keep this at the top

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { appConfig } from '@/lib/appconfig'
import './lib/i18n' // Initialize i18next with translations

import './workers/emailWorker' // ← side‐effect: starts the worker
import { checkImageRoot } from '@/lib/media'

import { ImageProcessor } from './services/imageprocessor'
import { getPackageVersion } from "../../../packages/shared/version";

async function main() {
  const app = Fastify({
    trustProxy: true,
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

  // Log version information at startup
  try {
    const version = getPackageVersion(path.join(__dirname, '..', 'package.json'))
    app.log.info(`🚀 Starting server, version ${version}`)
  } catch (err) {
    app.log.warn('Could not read version info at startup:', err)
  }

  // Register CORS plugin
  app.register(cors, {
    origin: appConfig.NODE_ENV === 'production' ? appConfig.FRONTEND_URL : '*',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'],
  })

  app.register(import('./plugins/websockets'))
  app.register(import('./plugins/prisma'))
  app.register(import('./plugins/listmonk'))
  app.register(import('./plugins/session-auth'))
  // API routes
  app.register(import('./api'), { prefix: '/api' })

  // WebSocket routes
  const wsRoutes = import('./api/routes/message-ws.route')
  app.register(wsRoutes, { prefix: '/ws' })

  // Webhook routes (no auth required)
  const webhookRoutes = import('./api/routes/newsletter.route')
  app.register(async (f) => {
    const { newsletterWebhookRoutes } = await webhookRoutes
    f.register(newsletterWebhookRoutes)
  }, { prefix: '/webhooks' })

  const rateLimit = import('@fastify/rate-limit')
  const tilesPlugin = import('./plugins/tiles-proxy')

  // Tiles proxy setup
  await app.register(rateLimit, {
    global: false, // we’ll apply to the route below
  })

  // Rate-limit only the tile route (be polite to OSM)
  app.register(async (f) => {
    await f.register(rateLimit, { max: 56, timeWindow: '1 second' }) // ~6 rps per client
    await f.register(tilesPlugin)
  })

  // app.get('/healthz', async () => ({ ok: true }))

  const ok = checkImageRoot()
  if (!ok) {
    app.log.error('Media upload directory cannot be created or is not writable')
    process.exit(1)
  }

  // load face detection models
  await ImageProcessor.initialize()

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
}



main().catch(err => {
  console.error(err)
  Sentry.captureException(err)
  process.exit(1)
})
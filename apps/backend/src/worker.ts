import Sentry from '@/lib/sentry' // keep this at the top

import Fastify from 'fastify'
import { appConfig } from '@/lib/appconfig'
import './lib/i18n' // Initialize i18next with translations (onboarding-reminder renders emails here)

import { registerWorkers } from './registerWorkers'
import { registerDistillJob } from './queues/activityQueue'
import { registerOnboardingReminderJob } from './queues/onboardingReminderQueue'

const WORKER_ADMIN_PORT = 3100

async function main() {
  const app = Fastify({
    trustProxy: true,
    disableRequestLogging: true,
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

  app.log.info(`🚀 Starting worker, version ${__APP_VERSION__}`)

  // Bull-board UI, served on the admin domain behind Traefik (mTLS terminated there).
  app.register(import('./plugins/bull-board'), { prefix: '/bull-board' })

  // Wire Worker instances for every queue. Graceful shutdown installed inside.
  registerWorkers()

  // Upsert the cron schedulers. Idempotent — safe to call on every boot.
  await Promise.all([registerDistillJob(), registerOnboardingReminderJob()])

  app.listen({ port: WORKER_ADMIN_PORT, host: '0.0.0.0' }, (err) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
  })
}

main().catch((err) => {
  console.error(err)
  Sentry.captureException(err)
  process.exit(1)
})

import pino from 'pino'
// Relative, not '@/': the frontend type-checks lib/brand.ts → logger via
// EmailTemplate.vue, and the backend '@/' alias doesn't resolve there.
import { appConfig } from './appconfig'

// Shared pino logger for non-Fastify contexts (workers, queue producers).
// In dev pretty-prints; in production emits JSON. Fastify instances pass this
// same logger into their options so the whole process writes through one tree.
export const logger = pino({
  level: 'info',
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
})

import { z } from 'zod'

export const appConfigSchema = z.object({
  API_BASE_URL: z.string().default('/api'),
  FRONTEND_URL: z.string().default(''),
  WS_BASE_URL: z.string().default('/ws'),
  MEDIA_URL_BASE: z.string().default('/user-content'),
  NODE_ENV: z.string().default('development'),
  VAPID_PUBLIC_KEY: z.string().default(''),
  SENTRY_DSN: z.string().default(''),
  SITE_NAME: z.string().default('OpenCupid'),
  JITSI_DOMAIN: z.string().default(''),
  VOICE_MESSAGE_MAX_DURATION: z.string().default('120'),
  MAPTILER_API_KEY: z.string().default(''),
})

export type AppConfig = z.infer<typeof appConfigSchema>

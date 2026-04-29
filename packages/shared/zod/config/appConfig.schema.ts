import { z } from 'zod'

export const appConfigSchema = z.object({
  API_BASE_URL: z.string().default('/api'),
  FRONTEND_URL: z.string().default(''),
  WS_BASE_URL: z.string().default('/ws'),
  MEDIA_URL_BASE: z.string().default('/user-content'),
  NODE_ENV: z.string().default('development'),
  DOMAIN: z.string().min(1).default('localhost'),
  VAPID_PUBLIC_KEY: z.string().default(''),
  SENTRY_DSN: z.string().default(''),
  SITE_NAME: z.string().default('OpenCupid'),
  JITSI_DOMAIN: z.string().default(''),
  VOICE_MESSAGE_MAX_DURATION: z.string().default('120'),
  MAP_TILE_URL: z.string().default(''),
  MAP_ATTRIBUTION: z.string().default(''),
  GEOCODING_ALLOWED_COUNTRIES: z.string().default(''),
  OPENREPLAY_PROJECT_KEY: z.string().default(''),
  OPENREPLAY_INGEST_POINT: z.string().default(''),
  UMAMI_URL: z.string().default(''),
  UMAMI_WEBSITE_ID: z.string().default(''),
  DEV_AUTH_BYPASS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
})

export type AppConfig = z.infer<typeof appConfigSchema>

import { z } from 'zod'
import { findUpSync } from 'find-up'
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'

// Zod schema
export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  API_PORT: z.coerce.number().default(3000),
  FRONTEND_PORT: z.coerce.number().default(5173),

  FRONTEND_URL: z.string(),
  API_BASE_URL: z.string(),
  WS_BASE_URL: z.string(),

  JWT_SECRET: z.string().min(10),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string(),
  EMAIL_FROM: z.string(),

  LISTMONK_URL: z.string().url(),
  LISTMONK_ADMIN_USER: z.string().optional(), // Only used for Listmonk container initialization
  LISTMONK_ADMIN_PASSWORD: z.string().optional(), // Only used for Listmonk container initialization
  LISTMONK_API_TOKEN: z.string().min(1), // Format: "username:token" - used for API authentication
  LISTMONK_DB_PASSWORD: z.string(),
  LISTMONK_LIST_ID: z.coerce.number().default(1),

  MEDIA_UPLOAD_DIR: z.string(),
  IMAGE_URL_BASE: z.string(),
  IMAGE_MAX_SIZE: z.coerce.number(),
  IMAGE_URL_HMAC_TTL_SECONDS: z.coerce.number().default(60 * 60 * 6),
  AUTH_IMG_HMAC_SECRET: z.string().min(10),

  SMS_API_KEY: z.string(),

  ALTCHA_HMAC_KEY: z.string().uuid(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),

  MAXMIND_ACCOUNT_ID: z.string(),
  MAXMIND_LICENSE_KEY: z.string(),

  TYPEAHEAD_DEBOUNCE_MS: z.coerce.number().default(300),

  VOICE_MESSAGE_MAX_DURATION: z.coerce.number().default(120), // Max duration in seconds

  GOOGLE_APPLICATION_CREDENTIALS: z.string(),

  RATE_LIMIT_PROFILE_SCOPES: z.coerce.number().default(1),

  WELCOME_MESSAGE_SENDER_PROFILE_ID: z.string().optional(),

  OG_TITLE: z.string(),
  OG_DESCRIPTION: z.string(),
  OG_IMAGE: z.string(),
  OG_URL: z.string(),
  OG_TYPE: z.string(),

  DOMAIN: z.string().default('example.org'),

  SITE_NAME: z.string().default('OpenCupid'),
})

if (!['production', 'staging'].includes(process.env.NODE_ENV!)) {
  // This will walk up from the current directory to find the first `.env` file
  // If not found, fall back to `.env.example` so tests run with defaults
  const envFile = findUpSync('.env') ?? findUpSync('.env.example')
  if (!envFile) {
    console.error('Could not find a .env file')
    process.exit(1)
  }

  const envConfig = dotenv.config({ path: envFile })
  dotenvExpand.expand(envConfig)
}

// Directly parse and export
const parsed = configSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format())
  process.exit(1)
}

export const appConfig = parsed.data
export type AppConfig = typeof appConfig

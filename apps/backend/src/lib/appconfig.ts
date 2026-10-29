import { z } from 'zod'
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
import { findUpSync } from '@shared/findUp'

const BrandConfigSchema = z.object({
  domain: z.string().min(1),
  siteName: z.string().min(1),
  frontendUrl: z.string().url(),
  emailFrom: z.string().min(1),
  emailReplyTo: z.string().optional(),
})

// Zod schema
export const configSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
    API_PORT: z.coerce.number().default(3000),
    WORKER_PORT: z.coerce.number().default(3100),
    FRONTEND_PORT: z.coerce.number().default(5173),

    FRONTEND_URL: z.string().url(),
    API_BASE_URL: z.string(),
    WS_BASE_URL: z.string(),

    JWT_SECRET: z.string().min(10),
    UNSUBSCRIBE_SECRET: z.string().min(10),

    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    SMTP_HOST: z.string(),
    SMTP_PORT: z.coerce.number(),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),
    EMAIL_FROM: z.string(),
    EMAIL_REPLY_TO: z.string().optional(),

    MEDIA_UPLOAD_DIR: z.string(),
    MEDIA_URL_BASE: z.string(),
    IMAGE_MAX_SIZE: z.coerce.number(),

    ALTCHA_HMAC_KEY: z.string(),

    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),

    SENTRY_DSN: z.string().optional(),

    VOICE_MESSAGE_MAX_DURATION: z.coerce.number().default(120), // Max duration in seconds

    ADMIN_PROFILE_ID: z.string().optional(),

    DOMAIN: z.string().min(1),

    SITE_NAME: z.string().default('OpenCupid'),

    // Multi-brand deployments: every brand this database serves, as a JSON array.
    // Outbound email is branded per recipient (User.originDomain), so every
    // process — including the shared worker — needs the full list. Unset on
    // single-brand deployments; the one brand is then built from DOMAIN,
    // SITE_NAME, FRONTEND_URL, EMAIL_FROM and EMAIL_REPLY_TO (see lib/brand.ts).
    BRANDS: z
      .string()
      .optional()
      .transform((raw, ctx) => {
        if (raw === undefined || raw.trim() === '') return undefined
        try {
          return JSON.parse(raw) as unknown
        } catch {
          ctx.addIssue({ code: 'custom', message: 'BRANDS must be valid JSON' })
          return z.NEVER
        }
      })
      .pipe(z.array(BrandConfigSchema).min(1).optional()),

    // Not validated here: normalizeLocale() bounds it at each use site, so an
    // unusable value degrades instead of refusing to boot.
    FALLBACK_LOCALE: z.string().default('en'),

    JITSI_DOMAIN: z.string().default('meet.jit.si'),

    DEEPL_API_KEY: z.string().optional(),

    GEOIP_API_URL: z.string().url().default('http://geoip-api:8080'),

    DEV_AUTH_BYPASS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .superRefine((cfg, ctx) => {
    if (!cfg.BRANDS) return
    const domains = cfg.BRANDS.map((b) => b.domain)
    if (new Set(domains).size !== domains.length) {
      ctx.addIssue({ code: 'custom', path: ['BRANDS'], message: 'BRANDS has duplicate domains' })
    }
    if (!domains.includes(cfg.DOMAIN)) {
      ctx.addIssue({
        code: 'custom',
        path: ['BRANDS'],
        message: `BRANDS must include this process's DOMAIN (${cfg.DOMAIN})`,
      })
    }
  })

if (!['production', 'staging'].includes(process.env.NODE_ENV!)) {
  // This will walk up from the current directory to find the first `.env` file
  // If not found, fall back to `.env.example` so tests run with defaults
  const envFile = findUpSync('.env') ?? findUpSync('.env.example')
  if (!envFile) {
    console.error('Could not find a .env file')
    process.exit(1)
  }

  const envConfig = dotenv.config({ path: envFile, quiet: true })
  dotenvExpand.expand(envConfig)
}

// Directly parse and export
const parsed = configSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsed.error))
  process.exit(1)
}

export const appConfig = parsed.data
export type AppConfig = typeof appConfig

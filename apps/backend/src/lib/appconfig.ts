import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
import { findUpSync } from '@shared/findUp'

// A bare lowercase domain: requests are matched to a brand by comparing it
// against the request host, so `.Example.org ` must not survive config parsing.
const DomainSchema = z
  .string()
  .transform((d) => d.trim().replace(/^\.+/, '').toLowerCase())
  .pipe(z.string().min(1))

/** Brand identity carried on requests and outbound content (see lib/brand.ts). */
export type Brand = {
  siteName: string
  frontendUrl: string
  domain: string
  emailFrom: string
  emailReplyTo?: string
}

/**
 * The env keys that make up a brand. A multi-brand deployment has one file per
 * brand in BRANDS_DIR (`brands/<name>.env`, also the env_file of that brand's
 * frontend); a single-brand deployment sets the same keys in its own env.
 */
export const BrandEnvSchema = z
  .object({
    DOMAIN: DomainSchema,
    SITE_NAME: z.string().min(1).default('OpenCupid'),
    FRONTEND_URL: z.string().url(),
    EMAIL_FROM: z.string().min(1),
    EMAIL_REPLY_TO: z
      .string()
      .optional()
      .transform((v) => v || undefined),
  })
  .transform(
    (env): Brand => ({
      domain: env.DOMAIN,
      siteName: env.SITE_NAME,
      frontendUrl: env.FRONTEND_URL,
      emailFrom: env.EMAIL_FROM,
      ...(env.EMAIL_REPLY_TO && { emailReplyTo: env.EMAIL_REPLY_TO }),
    })
  )

export class BrandConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrandConfigError'
  }
}

function parseBrand(env: Record<string, string | undefined>, source: string): Brand {
  const res = BrandEnvSchema.safeParse(env)
  if (res.success) return res.data
  const issues = res.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
  throw new BrandConfigError(`Invalid brand in ${source}: ${issues.join('; ')}`)
}

/**
 * Every brand this database serves: one per `*.env` file in `brandsDir`, or,
 * when it's unset, a single brand from `env`. Throws BrandConfigError naming
 * the file and key of the first problem, so a bad brand stops the process.
 */
export function loadBrands(
  env: Record<string, string | undefined>,
  brandsDir: string | undefined
): Brand[] {
  if (!brandsDir) return [parseBrand(env, 'the environment')]

  let files: string[]
  try {
    files = fs.readdirSync(brandsDir).filter((f) => f.endsWith('.env'))
  } catch (err) {
    throw new BrandConfigError(`BRANDS_DIR ${brandsDir} is not readable: ${String(err)}`)
  }
  if (files.length === 0) throw new BrandConfigError(`BRANDS_DIR ${brandsDir} has no *.env files`)

  const brands = files.sort().map((file) => {
    const fullPath = path.join(brandsDir, file)
    return parseBrand(dotenv.parse(fs.readFileSync(fullPath)), fullPath)
  })
  const seen = new Set<string>()
  for (const b of brands) {
    if (seen.has(b.domain))
      throw new BrandConfigError(`Two brands in ${brandsDir} have DOMAIN ${b.domain}`)
    seen.add(b.domain)
  }
  return brands
}

// Zod schema
export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  API_PORT: z.coerce.number().default(3000),
  WORKER_PORT: z.coerce.number().default(3100),
  FRONTEND_PORT: z.coerce.number().default(5173),

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

  MEDIA_UPLOAD_DIR: z.string(),
  MEDIA_URL_BASE: z.string(),
  IMAGE_MAX_SIZE: z.coerce.number(),

  ALTCHA_HMAC_KEY: z.string(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),

  VOICE_MESSAGE_MAX_DURATION: z.coerce.number().default(120), // Max duration in seconds

  ADMIN_PROFILE_ID: z.string().optional(),

  // Multi-brand deployments: a directory with one `<name>.env` per brand
  // (BrandEnvSchema keys). Requests are branded by their host and outbound
  // email by the recipient's User.originDomain, so the backend and the worker
  // both need every brand. Unset on single-brand deployments, which set the
  // BrandEnvSchema keys (DOMAIN, SITE_NAME, ...) in their own env instead.
  BRANDS_DIR: z
    .string()
    .optional()
    .transform((v) => v || undefined),

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

let brands: Brand[]
try {
  brands = loadBrands(process.env, parsed.data.BRANDS_DIR)
} catch (err) {
  console.error(err instanceof BrandConfigError ? err.message : err)
  process.exit(1)
}

export const appConfig = { ...parsed.data, brands }
export type AppConfig = typeof appConfig

import { z } from 'zod'

/**
 * Single source of truth for the frontend runtime configuration object (__APP_CONFIG__).
 *
 * All four locations that consume this config derive from this schema:
 *  - packages/shared/vite.common.ts   — dev-mode runtime config plugin
 *  - apps/frontend/src/types/env.d.ts — TypeScript global type
 *  - apps/frontend/config.template.js — production envsubst template
 *  - apps/frontend/src/tests/setup.ts — test mock
 */
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

/**
 * Generates the envsubst-style template string for config.template.js.
 * Each value becomes a `${KEY}` placeholder that envsubst replaces at container startup.
 *
 * Usage — regenerate apps/frontend/config.template.js when schema keys change:
 * @example
 *   import { generateConfigTemplate } from './appConfig.schema'
 *   import { writeFileSync } from 'fs'
 *   writeFileSync('apps/frontend/config.template.js', generateConfigTemplate())
 */
export const generateConfigTemplate = (): string => {
  const keys = Object.keys(appConfigSchema.shape) as (keyof AppConfig)[]
  const entries = keys.map((key) => `  ${key}: '\${${key}}'`).join(',\n')
  return (
    `// config.template.js — runtime configuration injected by docker-entrypoint.sh.\n` +
    `// IMPORTANT: only expose values safe to be public in the browser.\n` +
    `// envsubst substitutes \${VAR} placeholders at container startup.\n` +
    `window.__APP_CONFIG__ = {\n${entries},\n}\n`
  )
}

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { appConfigSchema } from '@zod/config/appConfig.schema'

describe('appConfig schema', () => {
  it('parses a valid config object using schema defaults', () => {
    const result = appConfigSchema.parse({})
    expect(result).toMatchObject({
      API_BASE_URL: '/api',
      FRONTEND_URL: '',
      WS_BASE_URL: '/ws',
      MEDIA_URL_BASE: '/user-content',
      NODE_ENV: 'development',
      VAPID_PUBLIC_KEY: '',
      SENTRY_DSN: '',
      SITE_NAME: 'OpenCupid',
      DEFAULT_LANGUAGE: 'en',
      JITSI_DOMAIN: '',
      VOICE_MESSAGE_MAX_DURATION: '120',
      MAP_TILE_URL: '',
      MAP_ATTRIBUTION: '',
    })
  })

  it('overrides defaults with provided values', () => {
    const result = appConfigSchema.parse({
      API_BASE_URL: 'https://api.example.com',
      SITE_NAME: 'MyApp',
    })
    expect(result.API_BASE_URL).toBe('https://api.example.com')
    expect(result.SITE_NAME).toBe('MyApp')
    // defaults still applied for unset keys
    expect(result.WS_BASE_URL).toBe('/ws')
  })

  it('rejects non-string values without coercion', () => {
    expect(() => appConfigSchema.parse({ API_BASE_URL: 42 })).toThrow()
  })

  it('config.template.js contains all required schema keys', () => {
    const templatePath = resolve(__dirname, '../../../config.template.js')
    const templateContent = readFileSync(templatePath, 'utf-8')

    // Keys intentionally omitted from the prod config template — dev-only flags
    // that default to false in the schema and are only consumed in dev builds.
    const devOnlyKeys = new Set<string>(['DEV_AUTH_BYPASS_ENABLED'])

    const requiredKeys = Object.keys(appConfigSchema.shape).filter((k) => !devOnlyKeys.has(k))

    for (const key of requiredKeys) {
      expect(templateContent, `config.template.js is missing key: ${key}`).toContain(key)
    }
  })
})

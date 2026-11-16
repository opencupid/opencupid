import { describe, expect, it } from 'vitest'
import {
  UserIdentifyPayloadSchema,
  UpdateUserLanguagePayloadSchema,
} from '@shared/zod/user/user.dto'

describe('UserIdentifyPayloadSchema', () => {
  const base = { email: 'user@example.com', captchaSolution: 'token' }

  it('normalizes an unsupported language to the fallback locale', () => {
    const result = UserIdentifyPayloadSchema.parse({ ...base, language: 'zz' })
    expect(result.language).toBe('en')
  })

  it('normalizes a region-tagged language to its supported base', () => {
    const result = UserIdentifyPayloadSchema.parse({ ...base, language: 'hu-HU' })
    expect(result.language).toBe('hu')
  })

  it('does not treat Object prototype members as locales', () => {
    const result = UserIdentifyPayloadSchema.parse({ ...base, language: 'constructor' })
    expect(result.language).toBe('en')
  })

  it('normalizes an empty language to the fallback locale', () => {
    const result = UserIdentifyPayloadSchema.parse({ ...base, language: '' })
    expect(result.language).toBe('en')
  })

  it('accepts an in-app redirect path', () => {
    const result = UserIdentifyPayloadSchema.parse({
      ...base,
      language: 'en',
      redirect: '/inbox/abc?tab=1',
    })
    expect(result.redirect).toBe('/inbox/abc?tab=1')
  })

  it.each([
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'inbox',
    '/' + 'a'.repeat(512),
  ])('rejects redirect %s', (redirect) => {
    const result = UserIdentifyPayloadSchema.safeParse({ ...base, language: 'en', redirect })
    expect(result.success).toBe(false)
  })
})

describe('UpdateUserLanguagePayloadSchema', () => {
  it('normalizes an unsupported language to the fallback locale', () => {
    const result = UpdateUserLanguagePayloadSchema.parse({ language: 'zz' })
    expect(result.language).toBe('en')
  })

  it('passes through a supported language', () => {
    const result = UpdateUserLanguagePayloadSchema.parse({ language: 'hu' })
    expect(result.language).toBe('hu')
  })
})

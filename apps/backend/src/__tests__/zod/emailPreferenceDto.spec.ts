import { describe, it, expect } from 'vitest'
import {
  ProfileOptInSettingsSchema,
  UpdateProfileOptInPayloadSchema,
} from '@zod/profile/profile.dto'
import { EMAIL_SCOPES, EMAIL_SCOPE_DEFAULTS } from '@zod/user/emailPreference.dto'

describe('email scopes', () => {
  it('has a default for every scope, with the newsletter opt-in', () => {
    expect(Object.keys(EMAIL_SCOPE_DEFAULTS).sort()).toEqual([...EMAIL_SCOPES].sort())
    expect(EMAIL_SCOPE_DEFAULTS.newsletter).toBe(false)
  })
})

describe('UpdateProfileOptInPayloadSchema', () => {
  it('accepts a partial email preference change', () => {
    expect(
      UpdateProfileOptInPayloadSchema.parse({ emailPreferences: { reminders: false } })
    ).toEqual({ emailPreferences: { reminders: false } })
  })

  it.each([
    ['an unknown email scope', { emailPreferences: { marketing: true } }],
    ['a non-boolean preference', { emailPreferences: { reminders: 'yes' } }],
    ['a removed flag', { newsletterOptIn: true }],
    ['an empty payload', {}],
  ])('rejects %s', (_label, body) => {
    expect(UpdateProfileOptInPayloadSchema.safeParse(body).success).toBe(false)
  })
})

describe('ProfileOptInSettingsSchema', () => {
  it('requires a value for every scope', () => {
    const base = { isCallable: true, isPushNotificationEnabled: false }
    expect(
      ProfileOptInSettingsSchema.safeParse({
        ...base,
        emailPreferences: { notifications: true, reminders: true },
      }).success
    ).toBe(false)
    expect(
      ProfileOptInSettingsSchema.safeParse({ ...base, emailPreferences: EMAIL_SCOPE_DEFAULTS })
        .success
    ).toBe(true)
  })
})

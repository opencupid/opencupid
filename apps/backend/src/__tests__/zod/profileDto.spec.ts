import { describe, it, expect } from 'vitest'
import { CreateProfilePayloadSchema, UpdateProfilePayloadSchema } from '@zod/profile/profile.dto'

describe.each([
  ['UpdateProfilePayloadSchema', UpdateProfilePayloadSchema],
  ['CreateProfilePayloadSchema', CreateProfilePayloadSchema],
])('%s intros', (_name, schema) => {
  it('trims every localized intro so a blank one is stored as empty', () => {
    const parsed = schema.parse({
      introSocialLocalized: { en: '  hello  ', hu: '   ' },
      introDatingLocalized: { en: '\n\t' },
    })

    expect(parsed.introSocialLocalized).toEqual({ en: 'hello', hu: '' })
    expect(parsed.introDatingLocalized).toEqual({ en: '' })
  })
})

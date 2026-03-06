import { describe, expect, it } from 'vitest'

import { isPublicNameValid, validatePublicName } from '../publicNameValidation'

describe('publicNameValidation', () => {
  it.each(['José', 'Élodie', 'Łukasz', '太郎太郎', 'たろうた'])(
    'accepts multilingual names: %s',
    (publicName) => {
      expect(validatePublicName(publicName)).toBeNull()
      expect(isPublicNameValid(publicName)).toBe(true)
    }
  )

  it.each([
    ['Jo', 'too_short'],
    ['A B', 'contains_whitespace'],
    ['John Doe', 'contains_whitespace'],
    ['@@@', 'invalid_characters'],
    ['John!!!', 'invalid_characters'],
    ['#name', 'invalid_characters'],
  ] as const)('rejects invalid name %s', (publicName, expectedError) => {
    expect(validatePublicName(publicName)).toBe(expectedError)
    expect(isPublicNameValid(publicName)).toBe(false)
  })
})

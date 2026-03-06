import { regex } from 'regex'

export type PublicNameValidationError =
  | 'too_short'
  | 'contains_whitespace'
  | 'invalid_characters'
  | null

const hasWhitespaceRegex = regex`\p{White_Space}`
const publicNameAllowedCharactersRegex = regex`^[\p{Letter}\p{Mark}]+$`

export const validatePublicName = (publicName: string): PublicNameValidationError => {
  const value = publicName.trim()

  if (value.length <= 0) {
    return 'too_short'
  }

  if (hasWhitespaceRegex.test(value)) {
    return 'contains_whitespace'
  }

  if (!publicNameAllowedCharactersRegex.test(value)) {
    return 'invalid_characters'
  }

  if (Array.from(value).length <= 3) {
    return 'too_short'
  }

  return null
}

export const isPublicNameValid = (publicName: string): boolean =>
  validatePublicName(publicName) === null

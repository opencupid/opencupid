import { type User } from '@zod/generated'
import { type ApiError } from '@zod/apiResponse.dto'

export const AuthErrorCodes = {
  INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
  INVALID_CAPTCHA: 'AUTH_INVALID_CAPTCHA',
  RATE_LIMITED: 'AUTH_RATE_LIMITED',
  INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
  MISSING_FIELD: 'AUTH_MISSING_FIELD',
  INVALID_INPUT: 'AUTH_INVALID_INPUT',
} as const

export type AuthErrorCodes = (typeof AuthErrorCodes)[keyof typeof AuthErrorCodes]

export type ValidateLoginTokenSuccess = {
  success: true
  user: User
  isNewUser: boolean
}

export type ValidateLoginTokenError = ApiError & { code: AuthErrorCodes }

export type ValidateLoginTokenResponse = ValidateLoginTokenSuccess | ValidateLoginTokenError

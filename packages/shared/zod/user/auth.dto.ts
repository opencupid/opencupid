import { User } from "@zod/generated"
import { ApiError } from "packages/shared/dto/apiResponse.dto"

export const AuthErrorCodes = {
  INVALID_OTP: 'AUTH_INVALID_OTP',
  EXPIRED_OTP: 'AUTH_EXPIRED_OTP',
  INVALID_CAPTCHA: 'AUTH_INVALID_CAPTCHA',
  RATE_LIMITED: 'AUTH_RATE_LIMITED',
  INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
  MISSING_FIELD: 'AUTH_MISSING_FIELD',
  INVALID_INPUT: 'AUTH_INVALID_INPUT',
} as const


export type AuthErrorCodes = (typeof AuthErrorCodes)[keyof typeof AuthErrorCodes]


export type ValidateUserOtpLoginSuccess = {
  success: true
  user: User
  isNewUser: boolean
}

export type ValidateUserOtpLoginError = ApiError & { code: AuthErrorCodes }

export type ValidateUserOtpLoginResponse = ValidateUserOtpLoginSuccess | ValidateUserOtpLoginError
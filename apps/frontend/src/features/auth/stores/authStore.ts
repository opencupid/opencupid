import { defineStore } from 'pinia'
import { api, axios, safeApiCall } from '@/lib/api'
import { bus } from '@/lib/bus'
import { type UserRoleType } from '@zod/generated'

import { LoginUserSchema } from '@zod/user/user.dto'

import type { UserIdentifier, JwtPayload, SessionData, LoginUser } from '@zod/user/user.dto'

import type { ApiError, VerifyTokenResponse, SendMagicLinkResponse } from '@zod/apiResponse.dto'
import { AuthErrorCodes } from '@zod/user/auth.dto'

type SuccessResponse<T> = { success: true } & T

type AuthStoreResponse<T> =
  | SuccessResponse<T>
  | (ApiError & { code: AuthErrorCodes; restart: 'otp' | 'userid' })

const getAuthId = (authId: UserIdentifier): string => {
  return authId.email ? authId.email : (authId.phonenumber ?? '')
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    jwt: '',
    session: null as SessionData | null,
    userId: null as string | null,
    email: null as string | null,
    profileId: null as string | null,
    isInitialized: false,
    loginUser: null as LoginUser | null,
  }),

  getters: {
    isLoggedIn: (state) => state.jwt !== '',
    getUserId: (state) => state.userId,
    getEmail: (state) => state.email,
    isPhoneAuth: (state) => Boolean(state.loginUser?.phonenumber),
  },

  actions: {
    setAuthState(token: string, refreshToken?: string) {
      // Set JWT in localStorage and axios headers
      this.jwt = token
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken)
      }

      // Parse user data from token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]!)) as JwtPayload
        this.userId = payload.userId
        this.profileId = payload.profileId
      } catch (e) {
        console.warn('Failed to parse JWT payload:', e)
        this.userId = null
      }
    },

    initialize() {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]!))
          const isExpired = payload.exp && payload.exp * 1000 < Date.now()
          const refreshToken = localStorage.getItem('refreshToken')

          if (isExpired && !refreshToken) {
            // Expired JWT with no refresh token — unrecoverable, clear state
            localStorage.removeItem('token')
            this.isInitialized = true
            return
          }
        } catch {
          // Malformed JWT — clear it
          localStorage.removeItem('token')
          this.isInitialized = true
          return
        }
        this.setAuthState(token)
      }
      this.isInitialized = true
    },

    async verifyToken(token: string): Promise<AuthStoreResponse<{ status: string }>> {
      if (!token) {
        return {
          success: false,
          code: 'AUTH_INVALID_INPUT',
          message: "Oops, that link in the message didn't work, try entering the code.",
          restart: 'otp',
        }
      }
      try {
        const res = await safeApiCall(() =>
          api.get<VerifyTokenResponse>('/auth/verify-token', {
            params: { token },
          })
        )

        if (res.data.success === true) {
          this.setAuthState(res.data.token, res.data.refreshToken)
          this.loginUser = null
          localStorage.removeItem('authId')
        } else {
          return {
            success: false,
            code: 'AUTH_INTERNAL_ERROR',
            message: 'An internal error occurred during login',
            restart: 'userid',
          }
        }
      } catch (error: any) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.message || error.message
          : 'Unexpected error'

        return {
          success: false,
          code: error.response?.data?.code || 'AUTH_INTERNAL_ERROR',
          message: message || 'An error occurred during login',
          restart: 'otp',
        }
      }
      bus.emit('auth:login', { token: this.jwt })
      return { success: true, status: '' }
    },

    async sendMagicLink(authId: UserIdentifier): Promise<
      AuthStoreResponse<{
        user: LoginUser
      }>
    > {
      try {
        const res = await safeApiCall(() =>
          api.post<SendMagicLinkResponse>('/auth/send-magic-link', authId)
        )
        const params = LoginUserSchema.safeParse(res.data.user)
        if (!params.success) {
          console.error('Invalid user data received:', params.error)
          return {
            success: false,
            code: 'AUTH_INTERNAL_ERROR',
            message: 'Invalid user data received',
            restart: 'userid',
          }
        }
        const user = params.data
        this.loginUser = user
        localStorage.setItem('authId', getAuthId(authId))
        return {
          success: true,
          user,
        }
      } catch (error: any) {
        console.error('Sending magic link failed:', error)
        return {
          success: false,
          code: error.response?.data?.code || 'AUTH_INTERNAL_ERROR',
          message: error.message,
          restart: 'userid',
        }
      }
    },

    hasRole(role: UserRoleType) {
      // TODO implement me
      return true
    },

    logout() {
      // Try to call server-side logout (fire-and-forget)
      if (this.jwt) {
        api.post('/auth/logout').catch(() => {})
      }

      this.userId = null
      this.email = null
      this.loginUser = null
      this.jwt = ''
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('authId')
      delete api.defaults.headers.common['Authorization']
      bus.emit('auth:logout')
    },
  },
})

bus.on('auth:token-refreshed', ({ token, refreshToken }) => {
  const store = useAuthStore()
  store.setAuthState(token, refreshToken)
})

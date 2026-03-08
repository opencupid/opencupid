import { defineStore } from 'pinia'
import { api, axios, safeApiCall } from '@/lib/api'
import { bus } from '@/lib/bus'
import { type UserRoleType } from '@zod/generated'

import { LoginUserSchema, type SettingsUser, SettingsUserSchema } from '@zod/user/user.dto'

import type { UserIdentifier, JwtPayload, SessionData, LoginUser } from '@zod/user/user.dto'

import type {
  ApiError,
  VerifyTokenResponse,
  SendMagicLinkResponse,
  UserMeResponse,
} from '@zod/apiResponse.dto'
import { AuthErrorCodes } from '@zod/user/auth.dto'

type SuccessResponse<T> = { success: true } & T

type AuthStoreResponse<T> =
  | SuccessResponse<T>
  | (ApiError & { code: AuthErrorCodes; restart: 'otp' | 'userid' })
type UserStoreResponse<T> = SuccessResponse<T> | ApiError

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
  }),

  getters: {
    isLoggedIn: (state) => state.jwt !== '',
    getUserId: (state) => state.userId,
    getEmail: (state) => state.email,
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

    async fetchUser(): Promise<UserStoreResponse<{ user: SettingsUser }>> {
      try {
        const res = await safeApiCall(() => api.get<UserMeResponse>('/users/me'))
        const params = SettingsUserSchema.safeParse(res.data.user)
        if (!params.success) {
          console.error('Invalid user data received:', params.error)
          return {
            success: false,
            message: 'Invalid user data received',
          }
        }
        const user = params.data
        return { success: true, user }
      } catch (error: any) {
        console.error('Could not fetch user:', error)
        return {
          success: false,
          message: error.message,
        }
      }
    },

    hasRole(role: UserRoleType) {
      // TODO implement me
      return true
    },

    // Update the current user
    async updateUser(userData: Record<string, any>): Promise<
      UserStoreResponse<{
        user: SettingsUser
      }>
    > {
      try {
        const res = await safeApiCall(() => api.patch('/users/me', userData))
        return { success: true, user: res.data.user }
      } catch (error: any) {
        console.error('Failed to update profile:', error)
        const msg = error.response?.data?.message || 'Failed to update profile'
        return { success: false, message: msg }
      }
    },

    logout() {
      // Try to call server-side logout (fire-and-forget)
      if (this.jwt) {
        api.post('/auth/logout').catch(() => {})
      }

      this.userId = null
      this.email = null
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

let lastSyncedLanguage: string | null = null
bus.on('language:changed', async ({ language }) => {
  const store = useAuthStore()
  if (!store.isLoggedIn) return
  if (language === lastSyncedLanguage) return
  lastSyncedLanguage = language
  // TODO move this into the settings view
  await store.updateUser({ language })
})

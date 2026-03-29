import { defineStore } from 'pinia'
import Cookies from 'universal-cookie'
import { api, axios, safeApiCall } from '@/lib/api'
import { bus } from '@/lib/bus'
import { useBootstrap } from '@/lib/bootstrap'
import { type UserRoleType } from '@zod/generated'

import { LoginUserSchema } from '@zod/user/user.dto'

import type { UserIdentifier, JwtPayload, SessionData, LoginUser } from '@zod/user/user.dto'

import type { ApiError, VerifyTokenResponse, SendMagicLinkResponse } from '@zod/apiResponse.dto'
import { AuthErrorCodes } from '@zod/user/auth.dto'

type SuccessResponse<T> = { success: true } & T

type AuthStoreResponse<T> =
  | SuccessResponse<T>
  | (ApiError & { code: AuthErrorCodes; restart: 'otp' | 'userid' })

import { SESSION_COOKIE, SESSION_COOKIE_OPTS } from '@shared/session'

const cookies = new Cookies()

const getAuthId = (authId: UserIdentifier): string => {
  return authId.email ? authId.email : (authId.phonenumber ?? '')
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null as SessionData | null,
    userId: null as string | null,
    email: null as string | null,
    profileId: null as string | null,
    isInitialized: false,
    loginUser: null as LoginUser | null,
  }),

  getters: {
    isLoggedIn: (state) => state.userId !== null,
    getUserId: (state) => state.userId,
    getEmail: (state) => state.email,
    isPhoneAuth: (state) => Boolean(state.loginUser?.phonenumber),
  },

  actions: {
    setAuthState(token: string) {
      // Parse user data from JWT payload (cookie is non-httpOnly so JWT is readable)
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
      // Restore state from cookie (non-httpOnly — readable by JS)
      const cookieToken = cookies.get<string>(SESSION_COOKIE)

      if (cookieToken) {
        try {
          JSON.parse(atob(cookieToken.split('.')[1]!))
        } catch {
          // Malformed JWT — clear it
          cookies.remove(SESSION_COOKIE, SESSION_COOKIE_OPTS)
          this.isInitialized = true
          return
        }
        // Even if the JWT is expired, keep it — the refresh interceptor in
        // api.ts will attempt a silent refresh using the httpOnly __refresh cookie.
        this.setAuthState(cookieToken)
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
          this.setAuthState(res.data.token)
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
      // Await bootstrap so the owner profile is loaded before verifyToken
      // returns. This prevents a race in UserHome where isOnboarded is checked
      // before the profile fetch completes, causing the /onboarding redirect
      // to be silently skipped for freshly registered users.
      await useBootstrap().onLogin()
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
      if (this.userId) {
        api.post('/auth/logout').catch(() => {})
      }

      this.userId = null
      this.email = null
      this.loginUser = null
      // Session + refresh cookies are cleared by the backend Set-Cookie response
      localStorage.removeItem('authId')
      bus.emit('auth:logout')
    },
  },
})

bus.on('auth:token-refreshed', ({ token }) => {
  const store = useAuthStore()
  store.setAuthState(token)
})

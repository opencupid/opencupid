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

/**
 * One-time migration for users upgrading from the old frontend that stored
 * the JWT in localStorage. Sets the Bearer header on the axios instance so
 * the backend's authenticate hook picks it up and sets the __session cookie.
 * Cleans up localStorage after the first successful API response.
 *
 * TODO: Remove this function once all clients have migrated to cookie auth.
 */
function migrateLegacyToken(): string | null {
  const legacyToken = localStorage.getItem('token')
  if (!legacyToken) return null

  api.defaults.headers.common['Authorization'] = `Bearer ${legacyToken}`

  // After the first successful response the cookie is set by the backend —
  // remove the temporary header and clean up localStorage.
  const ejectId = api.interceptors.response.use((res) => {
    delete api.defaults.headers.common['Authorization']
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    api.interceptors.response.eject(ejectId)
    return res
  })

  return legacyToken
}

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
      // Restore state from cookie, or migrate from legacy localStorage
      const token = cookies.get<string>(SESSION_COOKIE) ?? migrateLegacyToken()

      if (token) {
        try {
          JSON.parse(atob(token.split('.')[1]!))
        } catch {
          // Malformed JWT — clear it
          cookies.remove(SESSION_COOKIE, SESSION_COOKIE_OPTS)
          this.isInitialized = true
          return
        }
        // Even if the JWT is expired, keep it — the refresh interceptor in
        // api.ts will attempt a silent refresh using the httpOnly __refresh cookie.
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
      // Try to call server-side logout (fire-and-forget).
      // Use bare axios (not the interceptor-equipped api instance) so a stale
      // session cookie doesn't trigger the refresh interceptor, which would
      // execute window.location.href='/auth' and cause a hard reload that races
      // with the router.push() done by the caller.
      if (this.userId) {
        axios
          .post(`${api.defaults.baseURL}/auth/logout`, {}, { withCredentials: true })
          .catch(() => {})
      }
      // Emit auth:logout — the bus listener below clears state synchronously.
      bus.emit('auth:logout')
    },
  },
})

// Clear auth state on logout — runs for both explicit logout() and the
// api.ts refresh-failure path which emits auth:logout directly.
// Must complete before auth:logged-out is emitted so the router guard
// sees isLoggedIn=false when it navigates to Login.
bus.on('auth:logout', () => {
  const store = useAuthStore()
  store.userId = null
  store.email = null
  store.loginUser = null
  // Clear session cookie client-side so a failed server logout
  // doesn't leave the user appearing logged in on next page load.
  cookies.remove(SESSION_COOKIE, SESSION_COOKIE_OPTS)
  localStorage.removeItem('authId')
  bus.emit('auth:logged-out')
})

bus.on('auth:token-refreshed', ({ token }) => {
  const store = useAuthStore()
  store.setAuthState(token)
})

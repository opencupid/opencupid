import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { bus } from '@/lib/bus'
import { type UserRoleType } from '@zod/generated'

import {
  OtpSendReturn,
  OtpSendReturnSchema,
  SettingsUser,
  SettingsUserSchema,
} from '@zod/user/user.dto'

import type { AuthIdentifier, JwtPayload, SessionData } from '@zod/user/user.types'

import type { ApiError, ApiSuccess, OtpLoginResponse, SendLoginLinkResponse, UserMeResponse } from '@shared/dto/apiResponse.dto'
import { AuthErrorCodes } from '@zod/user/auth.dto'

type SuccessResponse<T> = { success: true } & T

type AuthStoreResponse<T> = SuccessResponse<T> | ApiError & { code: AuthErrorCodes, restart: 'otp' | 'userid' }
type UserStoreResponse<T> = SuccessResponse<T> | ApiError

export const useAuthStore = defineStore('auth', {
  state: () => ({
    jwt: '',
    session: null as SessionData | null,
    userId: null as string | null,
    email: null as string | null,
    profileId: null as string | null,
    isInitialized: false,
    hasActiveProfile: false as boolean,
  }),

  getters: {
    isLoggedIn: state => state.jwt !== '',
    getUserId: state => state.userId,
    getEmail: state => state.email,
  },

  actions: {
    setAuthState(token: string) {
      // Set JWT in localStorage and axios headers
      this.jwt = token
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      // Parse user data from token
      try {
        const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload
        this.userId = payload.userId
        this.profileId = payload.profileId
        // Notify messageStore
        bus.emit('auth:login', { token: this.jwt, userInfo: payload })
      } catch (e) {
        console.warn('Failed to parse JWT payload:', e)
        this.userId = null
      }
    },

    initializeFromStorage() {
      const token = localStorage.getItem('token')
      if (token) {
        this.setAuthState(token)
      }
      this.isInitialized = true
    },

    async otpLogin(otp: string): Promise<AuthStoreResponse<{ status: string }>> {
      let userId: string | null
      try {
        userId = localStorage.getItem('uid')
      } catch (error) {
        console.warn('Failed to access localStorage:', error)
        return {
          success: false,
          restart: 'userid',
          code: 'AUTH_INVALID_INPUT',
          message: 'Something is off with this browser. Please try again in a different one (or try clearing your browser storage.)'
        }
      }

      if (!userId) {
        // registration/login initiated in a different browser -> no userId
        return {
          success: false,
          code: 'AUTH_INVALID_INPUT',
          message: 'Something went wrong here, you started on a different phone or computer?',
          restart: 'userid'
        }
      }
      if (!otp) {
        // OTP is missing - maybe it got garbled in the email link
        return {
          success: false,
          code: 'AUTH_INVALID_INPUT',
          message: "Oops, that link in the message didn't work, try entering the code.",
          restart: 'otp'
        }
      }
      try {
        const res = await api.get<OtpLoginResponse>('/users/otp-login', {
          params: { userId, otp },
        })

        if (res.data.success === true) {
          this.setAuthState(res.data.token)
          localStorage.removeItem('uid') // Clear userId after successful login
        } else {
          return {
            success: false,
            code: 'AUTH_INTERNAL_ERROR',
            message: 'An internal error occurred during login',
            restart: 'userid'
          }
        }
      } catch (error: any) {
        console.error('Login failed:', error)
        return {
          success: false,
          code: error.response?.data?.code || 'AUTH_INTERNAL_ERROR',
          message: error.response?.data?.message || 'An error occurred during login',
          restart: 'userid'
        }
      }
      return { success: true, status: '' }
    },

    async sendLoginLink(authId: AuthIdentifier): Promise<AuthStoreResponse<{
      user: OtpSendReturn,
    }>> {
      // console.log('Sending login link with data:', authId)
      try {
        const res = await api.post<SendLoginLinkResponse>('/users/send-login-link', authId)
        const params = OtpSendReturnSchema.safeParse(res.data.user)
        if (!params.success) {
          console.error('Invalid user data received:', params.error)
          return {
            success: false,
            code: 'AUTH_INTERNAL_ERROR',
            message: 'Invalid user data received',
            restart: 'userid'
          }
        }
        const user = params.data
        // set userId in localStorage for the otplogin to pick up
        localStorage.setItem('uid', user.id)
        // Return the status flag for the frontend to handle
        return {
          success: true, user,
        }
      } catch (error: any) {
        console.error('Sending login link failed:', error)
        return {
          success: false,
          code: error.response?.data?.code || 'AUTH_INTERNAL_ERROR',
          message: error.message,
          restart: 'userid'
        }
      }
    },

    async fetchUser(): Promise<UserStoreResponse<{ user: SettingsUser }>> {
      try {
        const res = await api.get<UserMeResponse>('/users/me')
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
          message: error.message
        }
      }
    },

    hasRole(role: UserRoleType) {
      // TODO implement me
      return true
    },

    // Update the current user
    async updateUser(userData: Record<string, any>): Promise<UserStoreResponse<{
      user: SettingsUser
    }>> {
      try {
        const res = await api.patch("/users/me", userData)
        return { success: true, user: res.data.user }
      } catch (error: any) {
        console.error('Failed to update profile:', error)
        const msg = error.response?.data?.message || 'Failed to update profile'
        return { success: false, message: msg }
      }
    },

    logout() {
      this.userId = null
      this.email = null
      this.jwt = ''
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      bus.emit('auth:logout')
    },
  },
})


bus.on('language:changed', async ({ language }) => {
  const store = useAuthStore()
  if (!store.isLoggedIn) return
  await store.updateUser({ language })
})



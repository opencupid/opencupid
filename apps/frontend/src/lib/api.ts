import axios from 'axios'
import Cookies from 'universal-cookie'
import { bus } from './bus'
import { VersionSchema, type VersionDTO } from '@zod/dto/version.dto'
import type { VersionResponse } from '@zod/apiResponse.dto'
import { SESSION_COOKIE, SESSION_COOKIE_OPTS } from '@shared/session'

const baseURL = __APP_CONFIG__?.API_BASE_URL

if (!baseURL) {
  throw new Error('API_BASE_URL is not defined in __APP_CONFIG__ and no fallback is set.')
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
})
const CURRENT_VERSION = __APP_VERSION__

const ERROR_CODES = [
  'ECONNABORTED',
  'ENETUNREACH',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ECONNRESET',
  'ERR_NETWORK',
  'ERR_BAD_RESPONSE',
]

let isOffline = false
let retryTimeoutId: NodeJS.Timeout | null = null
let offlineDebounceId: NodeJS.Timeout | null = null
let waitForRecovery: (() => void)[] = []

export const isApiOnline = () =>
  isOffline ? new Promise<void>((resolve) => waitForRecovery.push(resolve)) : Promise.resolve()

// // Periodic retry mechanism to detect API recovery - only used in non-development environments
function startRetryMechanism() {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId)
  }

  retryTimeoutId = setTimeout(async () => {
    try {
      await getVersionInfo({ timeout: 5000 })
      // If we reach here, the API is back online
      // The success will be handled by the response interceptor
    } catch (error) {
      // Still offline, retry again
      if (isOffline) {
        startRetryMechanism()
      }
    }
  }, 10000) // Retry every 10 seconds
}

// --- Silent token refresh interceptor ---
let isRefreshing = false
let refreshSubscribers: (() => void)[] = []

function onTokenRefreshed() {
  refreshSubscribers.forEach((cb) => cb())
  refreshSubscribers = []
}

function addRefreshSubscriber(callback: () => void) {
  refreshSubscribers.push(callback)
}

export async function getVersionInfo(options?: { timeout?: number }): Promise<VersionDTO> {
  const res = await api.get<VersionResponse>('/app/version', {
    params: { v: CURRENT_VERSION },
    timeout: options?.timeout,
  })
  return VersionSchema.parse(res.data.version)
}

api.interceptors.response.use(
  (response) => {
    if (offlineDebounceId) {
      clearTimeout(offlineDebounceId)
      offlineDebounceId = null
    }

    if (isOffline) {
      isOffline = false
      bus.emit('api:online')
      waitForRecovery.forEach((fn) => fn())
      waitForRecovery = []

      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId)
        retryTimeoutId = null
      }
    }

    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 with silent refresh (refresh token is in an httpOnly cookie,
    // sent automatically via withCredentials)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another refresh is in progress — queue this request
        return new Promise((resolve) => {
          addRefreshSubscriber(() => {
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Both cookies (__session + __refresh) are sent automatically
        const res = await axios.post(`${baseURL}/auth/refresh`, null, {
          withCredentials: true,
        })

        isRefreshing = false
        onTokenRefreshed()

        bus.emit('auth:token-refreshed', { token: res.data.token })

        return api(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        refreshSubscribers = []

        // Clear session cookie so next page load doesn't re-enter the refresh loop
        new Cookies().remove(SESSION_COOKIE, SESSION_COOKIE_OPTS)
        bus.emit('auth:logout')
        window.location.href = '/auth'

        return Promise.reject(refreshError)
      }
    }

    // Network error handling — debounce to avoid false positives from app-switching
    const isNetworkError = !error.response || ERROR_CODES.includes(error.code)

    if (isNetworkError && !isOffline && !offlineDebounceId) {
      offlineDebounceId = setTimeout(() => {
        offlineDebounceId = null
        isOffline = true
        bus.emit('api:offline')
        startRetryMechanism()
      }, 3000)
    }

    return Promise.reject(error)
  }
)

export async function safeApiCall<T>(fn: () => Promise<T>): Promise<T> {
  while (isOffline) {
    await isApiOnline()
  }

  try {
    const result = await fn()
    return result
  } catch (err: any) {
    const isNetworkError = !err.response || ERROR_CODES.includes(err.code)

    if (isNetworkError) {
      isOffline = true
      startRetryMechanism()
      await isApiOnline()
      return safeApiCall(fn) // try again after recovery
    }

    throw err
  }
}

export { axios }

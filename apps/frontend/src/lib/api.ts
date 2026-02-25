import axios from 'axios'
import { bus } from './bus'

const baseURL = __APP_CONFIG__?.API_BASE_URL

if (!baseURL) {
  throw new Error('API_BASE_URL is not defined in __APP_CONFIG__ and no fallback is set.')
}

export const api = axios.create({
  baseURL,
})

let isOffline = false
let retryTimeoutId: NodeJS.Timeout | null = null
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
      // Make a lightweight request to check if API is back online
      await api.get('/app/version', { timeout: 5000 })
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
let refreshSubscribers: ((token: string) => void)[] = []

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

api.interceptors.response.use(
  (response) => {
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

    // Handle 401 with silent refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken')
      const token = localStorage.getItem('token')

      if (refreshToken && token) {
        if (isRefreshing) {
          // Another refresh is in progress — queue this request
          return new Promise((resolve) => {
            addRefreshSubscriber((newToken: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`
              resolve(api(originalRequest))
            })
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const res = await axios.post(
            `${baseURL}/auth/refresh`,
            { refreshToken },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )

          const newToken = res.data.token
          const newRefreshToken = res.data.refreshToken

          localStorage.setItem('token', newToken)
          localStorage.setItem('refreshToken', newRefreshToken)
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

          isRefreshing = false
          onTokenRefreshed(newToken)

          // Notify auth store of new tokens
          bus.emit('auth:token-refreshed', { token: newToken, refreshToken: newRefreshToken })

          originalRequest.headers['Authorization'] = `Bearer ${newToken}`
          return api(originalRequest)
        } catch (refreshError) {
          isRefreshing = false
          refreshSubscribers = []

          // Refresh failed — clear auth state and redirect to login
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          delete api.defaults.headers.common['Authorization']
          bus.emit('auth:logout')
          window.location.href = '/auth'

          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token — unrecoverable 401
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        delete api.defaults.headers.common['Authorization']
        bus.emit('auth:logout')
        window.location.href = '/auth'
        return Promise.reject(error)
      }
    }

    // Network error handling
    const isNetworkError =
      !error.response ||
      [
        'ECONNABORTED',
        'ENETUNREACH',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ECONNRESET',
        'ERR_NETWORK',
        'ERR_BAD_RESPONSE',
      ].includes(error.code)

    if (isNetworkError && !isOffline) {
      isOffline = true
      bus.emit('api:offline')
      startRetryMechanism()
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
    const isNetworkError =
      !err.response ||
      [
        'ECONNABORTED',
        'ENETUNREACH',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ECONNRESET',
        'ERR_NETWORK',
        'ERR_BAD_RESPONSE',
      ].includes(err.code)

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

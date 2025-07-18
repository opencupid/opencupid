import axios from 'axios'
import { bus } from './bus'

const baseURL = __APP_CONFIG__?.API_BASE_URL

if (!baseURL) {
  throw new Error('API_BASE_URL is not defined in __APP_CONFIG__ and no fallback is set.')
}

export const api = axios.create({
  baseURL,
})

// Track API status - only used in non-development environments
let isOffline = false
let retryTimeoutId: NodeJS.Timeout | null = null

// Request interceptor - no changes needed, but can be used for future enhancements
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors and recovery
// Only enable offline/online detection in non-development environments
if (__APP_CONFIG__?.NODE_ENV !== 'development') {
  api.interceptors.response.use(
    (response) => {
      // If we were offline and got a successful response, mark as online
      if (isOffline) {
        isOffline = false
        bus.emit('api:online')
        // Clear any pending retry
        if (retryTimeoutId) {
          clearTimeout(retryTimeoutId)
          retryTimeoutId = null
        }
      }
      return response
    },
    (error) => {
      // Check for network-related errors
      const isNetworkError = 
        error.code === 'ECONNABORTED' ||
        error.code === 'ENETUNREACH' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        !error.response

      if (isNetworkError && !isOffline) {
        isOffline = true
        bus.emit('api:offline')
        
        // Start periodic retry to detect recovery
        startRetryMechanism()
      }

      return Promise.reject(error)
    }
  )
} else {
  // In development mode, use a simple pass-through interceptor
  api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  )
}

// Periodic retry mechanism to detect API recovery - only used in non-development environments
function startRetryMechanism() {
  // Only run retry mechanism in non-development environments
  if (__APP_CONFIG__?.NODE_ENV === 'development') {
    return
  }

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

export { axios }

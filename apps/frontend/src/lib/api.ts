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
  isOffline
    ? new Promise<void>((resolve) => waitForRecovery.push(resolve))
    : Promise.resolve()


// // Request interceptor - no changes needed, but can be used for future enhancements
// api.interceptors.request.use(
//   (config) => {
//     return config
//   },
//   (error) => {
//     return Promise.reject(error)
//   }
// )

// // Response interceptor to handle errors and recovery
// api.interceptors.response.use(
//   (response) => {
//     console.log('api state change isOffoline ',isOffline)
//     // If we were offline and got a successful response, mark as online
//     if (isOffline) {
//       isOffline = false
//       bus.emit('api:online')

//       // ✅ resolve all pending waiters
//       waitForRecovery.forEach((fn) => fn())
//       waitForRecovery = []

//       // Clear any pending retry
//       if (retryTimeoutId) {
//         clearTimeout(retryTimeoutId)
//         retryTimeoutId = null
//       }
//     }
//     return response
//   },
//   (error) => {
//     console.log('got error ', error.code)
//     // Check for network-related errors
//     const isNetworkError =
//       [
//         'ECONNABORTED',
//         'ENETUNREACH',
//         'ENOTFOUND',
//         'ECONNREFUSED',
//         'ETIMEDOUT',
//         'ECONNRESET',
//         'ERR_NETWORK',
//         'ERR_BAD_RESPONSE',
//       ].includes(error.code) || !error.response


//     if (isNetworkError && !isOffline) {
//       isOffline = true
//       bus.emit('api:offline')

//       // Start periodic retry to detect recovery
//       startRetryMechanism()
//     }

//     return Promise.reject(error)
//   }
// )


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
  (error) => {
    const isNetworkError =
      !error.response || [
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
      !err.response || [
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
      return safeApiCall(fn) // ⏳ try again after recovery
    }

    throw err
  }
}


export { axios }

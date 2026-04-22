import axios from 'axios'
import Cookies from 'universal-cookie'
import { bus } from './bus'
import { VersionSchema, type VersionDTO } from '@zod/dto/version.dto'
import type { VersionResponse } from '@zod/apiResponse.dto'
import { SESSION_COOKIE, resolveSessionCookie } from '@shared/session'
import { clearLegacyCookie } from '@/lib/session-legacy'

const baseURL = __APP_CONFIG__?.API_BASE_URL

if (!baseURL) {
  throw new Error('API_BASE_URL is not defined in __APP_CONFIG__ and no fallback is set.')
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
})
const CURRENT_VERSION = __APP_VERSION__

export const ERROR_CODES = [
  'ECONNABORTED',
  'ENETUNREACH',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ECONNRESET',
  'ERR_NETWORK',
]

import './visibility'

/*
                    ┌──────────────────────────────────┐
                    │                                  │
    ┌───────────────▼───────────┐                      │
    │         ONLINE            │◄─── success response │
    │  (normal, detection on)   │     from any state   │
    └──┬────────┬───────────────┘     except SUSPENDED │
       │        │                                      │
       │     network error                             │
       │        │                                      │
       │        ▼                                      │
       │   ┌─────────────┐    success    ┌─────────────┘
       │   │ DEBOUNCING  │───response───►│
       │   │  (3s timer)  │              │
       │   └──────┬──────┘               │
       │          │ timer fires          │
       │          ▼                      │
       │   ┌─────────────┐  success      │
       │   │   OFFLINE   │──response────►│
       │   │ (retrying)  │               │
       │   └──────┬──────┘               │
       │          │                      │
  tab hidden      │ tab hidden           │
       │          │                      │
       ▼          ▼                      │
    ┌─────────────────────┐              │
    │     SUSPENDED       │              │
    │ (detection blocked, │              │
    │  timers cancelled)  │              │
    └──────────┬──────────┘              │
               │ tab visible             │
               ▼                         │
    ┌─────────────────────┐              │
    │     RESUMING        │              │
    │ (grace period 5s,   │──success────►┘
    │  health check fired,│
    │  errors suppressed) │
    └──────────┬──────────┘
               │ grace expires
               │ without success
               ▼
         back to ONLINE
      (detection re-enabled,
       next error starts
       normal DEBOUNCING)
*/

// ── State machine ─────────────────────────────────────────────────────
type OfflineState = 'ONLINE' | 'DEBOUNCING' | 'OFFLINE' | 'SUSPENDED' | 'RESUMING'

let state: OfflineState = 'ONLINE'
let debounceTimerId: ReturnType<typeof setTimeout> | null = null
let retryTimerId: ReturnType<typeof setTimeout> | null = null
let graceTimerId: ReturnType<typeof setTimeout> | null = null
let wasOfflineBeforeSuspend = false
let waitForRecovery: (() => void)[] = []

export const isApiOnline = () =>
  state === 'ONLINE'
    ? Promise.resolve()
    : new Promise<void>((resolve) => waitForRecovery.push(resolve))

/** For testing only — returns the current state machine state. */
export const _getState = () => state

function clearAllTimers() {
  if (debounceTimerId) {
    clearTimeout(debounceTimerId)
    debounceTimerId = null
  }
  if (retryTimerId) {
    clearTimeout(retryTimerId)
    retryTimerId = null
  }
  if (graceTimerId) {
    clearTimeout(graceTimerId)
    graceTimerId = null
  }
}

function startRetryMechanism() {
  if (retryTimerId) clearTimeout(retryTimerId)
  retryTimerId = setTimeout(async () => {
    try {
      await getVersionInfo({ timeout: 5000 })
    } catch {
      if (state === 'OFFLINE') startRetryMechanism()
    }
  }, 10000)
}

function transitionTo(newState: OfflineState) {
  const prev = state
  state = newState

  switch (newState) {
    case 'ONLINE':
      clearAllTimers()
      if (prev === 'OFFLINE' || (prev === 'RESUMING' && wasOfflineBeforeSuspend)) {
        bus.emit('api:online')
      }
      waitForRecovery.forEach((fn) => fn())
      waitForRecovery = []
      break

    case 'DEBOUNCING':
      debounceTimerId = setTimeout(() => {
        debounceTimerId = null
        transitionTo('OFFLINE')
      }, 3000)
      break

    case 'OFFLINE':
      bus.emit('api:offline')
      startRetryMechanism()
      break

    case 'SUSPENDED':
      if (prev !== 'RESUMING') {
        wasOfflineBeforeSuspend = prev === 'OFFLINE'
      }
      // When coming from RESUMING, preserve the existing wasOfflineBeforeSuspend value
      clearAllTimers()
      break

    case 'RESUMING':
      graceTimerId = setTimeout(() => {
        graceTimerId = null
        if (wasOfflineBeforeSuspend) {
          transitionTo('OFFLINE')
        } else {
          state = 'ONLINE' // silent transition, no emit needed
        }
      }, 5000)
      // Proactive health check — its success/failure feeds into the interceptor
      getVersionInfo({ timeout: 5000 }).catch(() => {})
      break
  }
}

// ── Visibility event handlers ─────────────────────────────────────────
bus.on('app:hidden', () => {
  if (state !== 'SUSPENDED') {
    transitionTo('SUSPENDED')
  }
})

bus.on('app:visible', () => {
  if (state === 'SUSPENDED') {
    transitionTo('RESUMING')
  }
})

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
    if (state === 'SUSPENDED') return response // don't transition while suspended

    if (state !== 'ONLINE') {
      transitionTo('ONLINE')
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
        const res = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
        )

        isRefreshing = false
        onTokenRefreshed()

        bus.emit('auth:token-refreshed', { token: res.data.token })

        return api(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        refreshSubscribers = []

        // Clear session cookie so next page load doesn't re-enter the refresh
        // loop. Remove the active shape; `clearLegacyCookie` additionally
        // zaps the pre-migration host-only slot when it's a distinct slot.
        const jar = new Cookies()
        jar.remove(
          SESSION_COOKIE,
          resolveSessionCookie(__APP_CONFIG__.NODE_ENV, __APP_CONFIG__.DOMAIN)
        )
        clearLegacyCookie(jar, SESSION_COOKIE)
        // auth:logout handler in authStore clears state synchronously and then
        // emits auth:logged-out — the single place that drives navigation to Login.
        bus.emit('auth:logout')

        return Promise.reject(refreshError)
      }
    }

    // Network error handling — visibility-aware state machine
    const isNetworkError = !error.response || ERROR_CODES.includes(error.code)

    if (isNetworkError && state === 'ONLINE') {
      transitionTo('DEBOUNCING')
    }
    // In SUSPENDED or RESUMING: swallow network errors (expected during tab transitions)
    // In DEBOUNCING or OFFLINE: already handling, no-op

    return Promise.reject(error)
  }
)

export async function safeApiCall<T>(fn: () => Promise<T>): Promise<T> {
  while (state !== 'ONLINE') {
    await isApiOnline()
  }

  try {
    return await fn()
  } catch (err: any) {
    const isNetworkError = !err.response || ERROR_CODES.includes(err.code)

    if (isNetworkError) {
      if (state === 'ONLINE') {
        transitionTo('DEBOUNCING')
      }
      await isApiOnline()
      return safeApiCall(fn)
    }

    throw err
  }
}

export { axios }

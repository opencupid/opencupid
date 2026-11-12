import axios, { CanceledError } from 'axios'
import Cookies from 'universal-cookie'
import { bus } from './bus'
import { diagnoseOutage, type OutageCause } from './connectivity'
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

// Statuses a reverse proxy answers with when the backend behind it is down.
const GATEWAY_STATUSES = [502, 503, 504]

/**
 * True when the failure means the API as a whole is unreachable: either no
 * response arrived at all, or the gateway answered on behalf of a dead
 * backend. The backend's own 502/503 replies carry the API's JSON envelope
 * and are ordinary request errors.
 * CanceledError (AbortController) is intentional, not connectivity loss.
 */
export function isOutageError(error: any): boolean {
  if (error instanceof CanceledError) return false
  if (!error.response) return true
  if (ERROR_CODES.includes(error.code)) return true
  return (
    GATEWAY_STATUSES.includes(error.response.status) &&
    typeof error.response.data?.success !== 'boolean'
  )
}

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
       │   │ (retrying,  │               │
       │   │  diagnosing │               │
       │   │  the cause) │               │
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

  While OFFLINE the outage is diagnosed (see ./connectivity) as either
  `network` (the user's connection) or `api` (our end). `api:offline` carries
  that cause and is re-emitted whenever a later check changes the verdict.
*/

// ── State machine ─────────────────────────────────────────────────────
type OfflineState = 'ONLINE' | 'DEBOUNCING' | 'OFFLINE' | 'SUSPENDED' | 'RESUMING'

let state: OfflineState = 'ONLINE'
let debounceTimerId: ReturnType<typeof setTimeout> | null = null
let retryTimerId: ReturnType<typeof setTimeout> | null = null
let graceTimerId: ReturnType<typeof setTimeout> | null = null
let wasOfflineBeforeSuspend = false
let lastError: { response?: unknown } | undefined
let outageCause: OutageCause | null = null
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

async function reportOutage() {
  const cause = await diagnoseOutage(lastError)
  if (state !== 'OFFLINE' || cause === outageCause) return
  outageCause = cause
  bus.emit('api:offline', { cause })
}

/** Checks whether the API is back; a success flips the state via the interceptor. */
async function checkApi() {
  try {
    await getVersionInfo({ timeout: 5000 })
  } catch {
    if (state === 'OFFLINE') {
      void reportOutage()
      startRetryMechanism()
    }
  }
}

function startRetryMechanism() {
  if (retryTimerId) clearTimeout(retryTimerId)
  retryTimerId = setTimeout(checkApi, 10000)
}

// The browser noticed the network interface going up or down — re-check right
// away instead of waiting for the next scheduled retry.
if (typeof window !== 'undefined') {
  const recheck = () => {
    if (state === 'OFFLINE') void checkApi()
  }
  window.addEventListener('online', recheck)
  window.addEventListener('offline', recheck)
}

function transitionTo(newState: OfflineState) {
  const prev = state
  state = newState

  switch (newState) {
    case 'ONLINE':
      clearAllTimers()
      outageCause = null
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
      outageCause = null
      void reportOutage()
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

    // Outage handling — visibility-aware state machine.
    if (!(error instanceof CanceledError)) lastError = error

    if (isOutageError(error) && state === 'ONLINE') {
      transitionTo('DEBOUNCING')
    }
    // In SUSPENDED or RESUMING: swallow outage errors (expected during tab transitions)
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
    // Caller-initiated cancellation is not a connectivity failure — surface
    // it so the caller's catch can handle it without re-driving the offline
    // state machine or auto-retrying the (intentionally cancelled) request.
    if (err instanceof CanceledError) throw err

    if (isOutageError(err)) {
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

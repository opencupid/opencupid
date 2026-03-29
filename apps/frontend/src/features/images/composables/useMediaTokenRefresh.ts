import { api } from '@/lib/api'
import { bus } from '@/lib/bus'

// Uses .then()/.finally() instead of async/await deliberately: the promise must
// be assigned to refreshPromise synchronously (before yielding) so concurrent
// callers hit the dedup guard. An async function would yield at the first await,
// allowing a second caller to slip past the null check and fire a duplicate request.
let refreshPromise: Promise<void> | null = null

export function refreshMediaToken(): Promise<void> {
  if (refreshPromise) return refreshPromise
  refreshPromise = api
    .post('/auth/media-token')
    .then(() => {
      lastRefreshedAt = Date.now()
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

const REFRESH_THRESHOLD_MS = 60_000
let lastRefreshedAt = Date.now()

bus.on('app:tab-visible', () => {
  if (Date.now() - lastRefreshedAt > REFRESH_THRESHOLD_MS) {
    refreshMediaToken()
  }
})

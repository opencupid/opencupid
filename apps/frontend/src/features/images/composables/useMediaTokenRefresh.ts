import { api } from '@/lib/api'

/**
 * Refreshes the httpOnly `__media_token` cookie by making a lightweight
 * authenticated API call. The backend's `media-cookie` preHandler plugin
 * sets a fresh cookie on every authenticated response as a side-effect.
 *
 * Concurrent callers share a single in-flight request (dedup).
 */
// Uses .then()/.finally() instead of async/await deliberately: the promise must
// be assigned to refreshPromise synchronously (before yielding) so concurrent
// callers hit the dedup guard. An async function would yield at the first await,
// allowing a second caller to slip past the null check and fire a duplicate request.
let refreshPromise: Promise<void> | null = null

export function refreshMediaToken(): Promise<void> {
  if (refreshPromise) return refreshPromise
  refreshPromise = api
    .get('/app/version')
    .then(() => {})
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

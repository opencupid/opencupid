import { bus } from '@/lib/bus'

// Module-level handle to the most recent auth:login bootstrap cycle.
// The bus listener is synchronous in registration order, so anyone reading
// `pending` immediately after bus.emit('auth:login', ...) returns will see
// the in-flight promise for that cycle.
let pending: Promise<void> | null = null

bus.on('auth:login', () => {
  pending = import('./bootstrap').then(({ useBootstrap }) => useBootstrap().onLogin())
  // Observe the rejection separately so cold-start paths (authStore
  // initialize → bus.emit, with no awaiter) don't surface as unhandled
  // promise rejections. This .catch() runs in parallel — it does NOT
  // replace `pending`, so callers awaiting bootstrapReady() still see
  // the original rejection and can decide how to recover.
  pending.catch((err) => console.error('Bootstrap failed:', err))
})

/**
 * Resolves when the most recent auth:login bootstrap cycle has completed
 * (owner profile fetched, WebSocket connecting, stores initialized).
 *
 * Callers on the post-login navigation path should `await bootstrapReady()`
 * before pushing to an authenticated route, ensuring downstream components
 * mount with profile state already in the store.
 *
 * REJECTS if bootstrap fails (chunk load error, unexpected throw inside
 * onLogin, etc.). Navigators must catch and handle — letting the rejection
 * escape to Vue's global error handler matches the historical behavior of
 * blocking navigation on a broken bootstrap rather than dropping the user
 * into authenticated UI with null state.
 *
 * Returns a resolved promise if no auth:login cycle has fired yet.
 */
export function bootstrapReady(): Promise<void> {
  return pending ?? Promise.resolve()
}

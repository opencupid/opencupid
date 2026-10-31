const RELOAD_GUARD_KEY = 'ocp:reload-on-preload-error'

// Vite wraps every dynamic import() in the built app and dispatches
// `vite:preloadError` on `window` when a lazy-loaded chunk fails to fetch
// (browsers report this as "Importing a module script failed" / "Failed to
// fetch dynamically imported module"). Each deploy replaces /assets wholesale
// with newly content-hashed filenames (see apps/frontend/Dockerfile) and
// keeps no old versions around, so a tab left open across a deploy still
// holds chunk URLs from the previous build. Navigating to a route that
// hasn't been lazy-loaded yet in that tab then 404s. Reloading re-fetches
// index.html against the current asset manifest and recovers.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1')
    window.location.reload()
  })
}

// Call once the app has mounted successfully so a preload error from a
// later deploy (within the same tab session) still triggers a reload,
// instead of being silently swallowed by a guard left over from an earlier,
// already-recovered reload.
export function clearPreloadErrorReloadGuard(): void {
  sessionStorage.removeItem(RELOAD_GUARD_KEY)
}

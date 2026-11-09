import type { App } from 'vue'

// Browser noise that does not originate in our code and has no remedy on our
// side. Each entry names the GlitchTip issue it was added for.
//
// ResizeObserver loop: the spec-defined notice that some observations were
// deferred to the next frame. Browsers report it via window.onerror, but it is
// not an exception and nothing is lost (GlitchTip #123).
export const ignoreErrors = [/^ResizeObserver loop/]

// Scripts injected by in-app browsers (Facebook/Instagram on Android load
// their navigation logger from iabjs://). They throw when the native bridge is
// torn down on page unload (GlitchTip #101).
export const denyUrls = [/^iabjs:\/\//]

// Eagerly imported wrapper. The env-var gate runs first so the @sentry/vue
// stack is only fetched when Sentry is actually configured. Named-export
// destructuring on the dynamic import gives Rollup explicit reachability
// for just `init` + `setTag`, allowing it to tree-shake replay, feedback,
// browser-tracing and other unused integrations from the lazy chunk.
export async function initSentry(app: App): Promise<void> {
  if (!__APP_CONFIG__.SENTRY_DSN) return

  const { init, setTag } = await import('@sentry/vue')

  init({
    app,
    dsn: __APP_CONFIG__.SENTRY_DSN,
    release: `frontend@${__APP_VERSION__}`,
    sendDefaultPii: true,
    ignoreErrors,
    denyUrls,
  })
  setTag('frontend_origin', __APP_CONFIG__.DOMAIN)
}

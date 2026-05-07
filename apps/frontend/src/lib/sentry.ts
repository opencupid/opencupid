import type { App } from 'vue'

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
  })
  setTag('frontend_origin', __APP_CONFIG__.DOMAIN)
}

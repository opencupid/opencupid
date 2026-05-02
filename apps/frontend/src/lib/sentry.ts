import * as Sentry from '@sentry/vue'
import type { App } from 'vue'
import router from '@/router'

export function initSentry(app: App): void {
  if (!__APP_CONFIG__.SENTRY_DSN) return

  Sentry.init({
    app,
    dsn: __APP_CONFIG__.SENTRY_DSN,
    release: `frontend@${__APP_VERSION__}`,
    sendDefaultPii: true,
    integrations: [Sentry.browserTracingIntegration({ router }), Sentry.replayIntegration()],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [
      'localhost',
      __APP_CONFIG__.API_BASE_URL,
      __APP_CONFIG__.FRONTEND_URL,
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  })
  Sentry.setTag('frontend_origin', __APP_CONFIG__.DOMAIN)
}

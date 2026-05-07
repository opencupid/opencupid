import * as Sentry from '@sentry/vue'
import type { App } from 'vue'

export function initSentry(app: App): void {
  if (!__APP_CONFIG__.SENTRY_DSN) return

  Sentry.init({
    app,
    dsn: __APP_CONFIG__.SENTRY_DSN,
    release: `frontend@${__APP_VERSION__}`,
    sendDefaultPii: true,
  })
  Sentry.setTag('frontend_origin', __APP_CONFIG__.DOMAIN)
}

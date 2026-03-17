// import '@/css'
import registerToast from './lib/toast'
import { useBootstrap } from './lib/bootstrap'
import { appUseI18n } from './lib/i18n'

// Register push-only service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('SW registration failed:', err)
  })
}

import { Settings } from 'luxon'
Settings.defaultZone = 'Europe/Berlin'

import { createApp } from 'vue'

import { createPinia } from 'pinia'
import { createBootstrap } from 'bootstrap-vue-next'

import App from './App.vue'
import router from './router'

function initSentry(app: ReturnType<typeof createApp>) {
  if (__APP_CONFIG__.NODE_ENV === 'development') return

  import('@sentry/vue').then((Sentry) => {
    Sentry.init({
      app,
      dsn: __APP_CONFIG__.SENTRY_DSN,
      release: `frontend@${__APP_VERSION__}`,
      sendDefaultPii: true,
      integrations: [Sentry.browserTracingIntegration({ router }), Sentry.replayIntegration()],
      tracesSampleRate: 1.0,
      tracePropagationTargets: ['localhost', __APP_CONFIG__.FRONTEND_URL],
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    })
  })
}

export async function bootstrapApp() {
  const app = createApp(App)

  // Set errorHandler BEFORE Sentry loads so Sentry wraps it rather than
  // re-throwing. Without this, @sentry/vue defers captureException to
  // setTimeout then re-throws — the re-throw escapes Vue's scheduler as an
  // unhandled promise rejection, racing with globalHandlersIntegration.
  // The dedupe integration then drops the richer Vue-specific event.
  app.config.errorHandler = (err, _vm, info) => {
    console.error(`[Vue error] ${info}:`, err)
  }

  app.config.warnHandler = (msg, _vm, trace) => {
    console.error('Vue warning:', msg, trace)
  }
  app.use(createPinia())
  app.use(router)
  app.use(createBootstrap()) // bootstrap-vue-next

  // toasts

  registerToast(app)

  useBootstrap().bootstrap()

  appUseI18n(app)

  await router.isReady()

  app.mount('#app')
  document.getElementById('splash')?.remove()

  // Load Sentry after mount so it doesn't block initial render
  initSentry(app)
}

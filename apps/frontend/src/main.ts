import '@/css/fonts.scss'
import '@/css/bootstrap.scss'
import '@/css/main.scss'

import registerToast from './lib/toast'
import { useBootstrap } from './lib/bootstrap'
import { appUseI18n } from './lib/i18n'
import { useAuthStore } from './features/auth/stores/authStore'

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

function initOpenReplay() {
  const { OPENREPLAY_PROJECT_KEY, OPENREPLAY_INGEST_POINT } = __APP_CONFIG__
  if (!OPENREPLAY_PROJECT_KEY || !OPENREPLAY_INGEST_POINT) return

  import('@openreplay/tracker')
    .then(({ default: Tracker }) => {
      const tracker = new Tracker({
        projectKey: OPENREPLAY_PROJECT_KEY,
        ingestPoint: OPENREPLAY_INGEST_POINT,
      })
      tracker.start()
    })
    .catch((err) => {
      console.warn('Failed to load OpenReplay:', err)
    })
}

async function initSentry(app: ReturnType<typeof createApp>) {
  if (__APP_CONFIG__.NODE_ENV === 'development') return
  if (!__APP_CONFIG__.SENTRY_DSN) return

  try {
    const Sentry = await import('@sentry/vue')
    Sentry.init({
      app,
      dsn: __APP_CONFIG__.SENTRY_DSN,
      release: `frontend@${__APP_VERSION__}`,
      sendDefaultPii: true,
      integrations: [Sentry.browserTracingIntegration({ router }), Sentry.replayIntegration()],
      tracesSampleRate: 1.0,
      tracePropagationTargets: ['localhost', __APP_CONFIG__.FRONTEND_URL],
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    })
    Sentry.setTag('frontend_origin', __APP_CONFIG__.DOMAIN)
  } catch (err) {
    console.warn('Failed to load Sentry:', err)
  }
}

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

useAuthStore().initialize()
useBootstrap().bootstrap()

appUseI18n(app)

// Wrapped in async IIFE because top-level await isn't supported by the
// current build target (chrome87 / firefox78 / safari14 — Vite's default
// `modules` preset, not an explicit choice in this repo).
//
// TODO: set an explicit `build.target` in vite.config.ts — e.g. 'es2022'
// or 'baseline-widely-available' — then delete this IIFE. TLA has been
// universally supported since late 2021 (Chrome/Firefox/Edge 89, Safari
// 15.0); raising the target drops well under 1% of users (mostly iOS 14
// stuck on iPhone 6s/7/SE 1st-gen) and makes the browser-support window
// a deliberate policy instead of an inherited default. Blocked on
// deciding whether any telemetry justifies keeping the old tail.
;(async () => {
  await router.isReady()

  app.mount('#app')
  document.getElementById('splash')?.remove()

  // Load observability tools after mount
  await initSentry(app)
  initOpenReplay()
})()

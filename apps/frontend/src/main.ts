import '@/css/fonts.scss'
import '@/css/bootstrap.scss'
import '@/css/main.scss'
import '@vuepic/vue-datepicker/dist/main.css'

import registerToast from './lib/toast'
import { appUseI18n } from './lib/i18n'
import { useAuthStore } from './features/auth/stores/authStore'
import { initUmami } from './lib/umami'
import { initSentry } from './lib/sentry'
import { initOpenReplay } from './lib/openreplay'

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
import './lib/auth'

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
registerToast(app) // vue-toastification plugin (used by lazy authenticated UI)

useAuthStore().initialize()

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

  // Load observability tools after mount. The Sentry/OpenReplay wrappers
  // are eagerly imported but their heavy dependencies (@sentry/vue,
  // @openreplay/tracker) are conditionally lazy-loaded inside — only fetched
  // when the env-var gate passes. Errors thrown before this point are caught
  // by app.config.errorHandler (set above) and logged to console; they are
  // not reported to Sentry, which is the expected trade-off.
  initSentry(app).catch((err) => console.warn('Failed to load Sentry:', err))
  initOpenReplay().catch((err) => console.warn('Failed to load OpenReplay:', err))
  initUmami()
})()

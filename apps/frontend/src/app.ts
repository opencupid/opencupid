

// import '@/css'
import { useIcons } from './lib/icons'
import registerToast from './lib/toast'
import { useBootstrap } from './lib/bootstrap'
import { appUseI18n } from './lib/i18n'

// @ ts-expect-error: virtual:pwa-register is a Vite virtual module
// import { registerSW } from 'virtual:pwa-register'

// const updateSW = registerSW({
//   immediate: true,
//   onNeedRefresh() {
//     // Show "new version available" prompt
//   },
//   onOfflineReady() {
//     // Show "app is ready offline" message
//   },
// })


import { Settings } from 'luxon'
Settings.defaultZone = 'Europe/Berlin'

import { createApp } from 'vue'

import * as Sentry from "@sentry/vue";


import { createPinia } from 'pinia'
import { createBootstrap } from 'bootstrap-vue-next'

import App from './App.vue'
import router from './router'

export async function bootstrapApp() {

  const app = createApp(App)


  Sentry.init({
    app,
    dsn: "https://a2f4d7f45badfcced4c78c61279c4011@o4509640167849984.ingest.de.sentry.io/4509640168308816",
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration()
    ],
    // Tracing
    tracesSampleRate: 1.0, // Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/gaians\.net/, /^https:\/\/oc\.dev\.froggle\.org:5173/],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0 // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });



  app.config.warnHandler = (msg, vm, trace) => {
    console.error('Vue warning:', msg, trace)
    if (msg.includes('computed value is readonly')) {
      // debugger
    }
  }
  app.use(createPinia())
  app.use(router)
  app.use(createBootstrap()) // bootstrap-vue-next

  // Load/initialize icon set
  useIcons(app)

  // toasts

  registerToast(app)

  useBootstrap().bootstrap()

  await appUseI18n(app)

  await router.isReady()

  app.mount('#app')

}

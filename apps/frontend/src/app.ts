

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
import { createPinia } from 'pinia'
import { createBootstrap } from 'bootstrap-vue-next'

import App from './App.vue'
import router from './router'

export async function bootstrapApp() {

  const app = createApp(App)
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

  appUseI18n(app)

  app.mount('#app')
  await router.isReady()
}
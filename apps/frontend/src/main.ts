import '@/css'

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
import { useIcons } from './lib/icons'
useIcons(app)

import { useLocalStore } from './store/localStore'
const localStore = useLocalStore()
localStore.initialize()

import { appUseI18n } from './lib/i18n'
appUseI18n(app)

import { useMessageStore } from './features/messaging/stores/messageStore'
useMessageStore()

// toasts
import registerToast from './lib/toast'

registerToast(app)

//@ts-expect-error no ts decl
import CircleFlags from "vue-circle-flags";
import "vue-circle-flags/dist/vue-circle-flags.css";
app.use(CircleFlags)

app.mount('#app')

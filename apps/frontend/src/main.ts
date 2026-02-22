import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import { appUseI18n } from './lib/i18n'

import '@/css/fonts.scss'
import '@/css/bootstrap.scss'
import '@/css/main.scss'
import { useLocalStore } from './store/localStore'
import { shouldShowLandingPage } from './lib/bootstrapRoute'

if (shouldShowLandingPage(window.location.pathname, !!localStorage.getItem('token'))) {
  import('@/features/landingpage/views/LandingPage.vue').then(({ default: Landing }) => {
    const app = createApp(Landing)
    app.use(createPinia())

    const localStore = useLocalStore()
    localStore.initialize()

    appUseI18n(app)

    app.mount('#app')
    // Preload full app silently in background
    nextTick(() => {
      import('./app')
    })
  })
} else {
  import('./app').then(({ bootstrapApp }) => bootstrapApp())
}

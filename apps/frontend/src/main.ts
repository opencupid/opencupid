import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import { appUseI18n } from './lib/i18n'
import { availableLanguages } from './lib/tolgee'

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

    if (!localStore.getLanguage) {
      const urlLang = new URLSearchParams(window.location.search).get('lang')
      if (urlLang && availableLanguages.includes(urlLang)) {
        localStore.setLanguage(urlLang)
      }
    }

    appUseI18n(app)

    app.mount('#app')
    document.getElementById('splash')?.remove()
    // Preload full app silently in background
    nextTick(() => {
      import('./app')
    })
  })
} else {
  import('./app').then(({ bootstrapApp }) => bootstrapApp())
}

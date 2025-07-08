import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { appUseI18n } from './lib/i18n'

import '@/css/fonts.scss'
import '@/css/bootstrap.scss'


if (window.location.pathname === '/') {
  import('@/features/landingpage/views/LandingPage.vue').then(({ default: Landing }) => {
    const app = createApp(Landing)
    app.use(createPinia())
    appUseI18n(app)

    app.mount('#app')
    // Preload full app silently in background
    import('./app')
  })
} else {
  import('./app').then(({ bootstrapApp }) => bootstrapApp())
}



import { createApp } from 'vue'
import '@/css/landing.scss'

if (window.location.pathname === '/') {
  import('@/features/landingpage/views/LandingPage.vue').then(({ default: Landing }) => {
    createApp(Landing).mount('#app')
    // Preload full app silently in background
    // import('./app')
  })
} else {
  import('./app').then(({ bootstrapApp }) => bootstrapApp())
}



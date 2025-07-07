import { createApp } from 'vue'
import Landing from '@/features/landingpage/views/LandingPage.vue'

// Trigger preload of full app (router + App.vue)
import('./app')

createApp(Landing).mount('#app')

import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { renderToString } from '@vue/server-renderer'
import { appCreateI18n } from './lib/i18n'
import LandingPage from './features/landingpage/views/LandingPage.vue'

export async function render(): Promise<string> {
  const app = createSSRApp(LandingPage)
  app.use(createPinia())
  app.use(appCreateI18n())
  return renderToString(app)
}

import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia } from 'pinia'
import { createBootstrap } from 'bootstrap-vue-next'
import { createI18n } from 'vue-i18n'
import LandingPage from '@/features/landingpage/views/LandingPage.vue'
import { messages } from '@/lib/i18n'

export async function renderLandingPage() {
  const app = createSSRApp(LandingPage)

  app.use(createPinia())
  app.use(createBootstrap())
  app.use(
    createI18n({
      legacy: false,
      locale: 'en',
      fallbackLocale: 'en',
      messages,
      missingWarn: false,
      fallbackWarn: false,
    })
  )

  return renderToString(app)
}

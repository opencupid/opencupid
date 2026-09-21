import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { createPinia } from 'pinia'

import { appUseI18n } from '@/lib/i18n'
import { tolgee } from '@/lib/tolgee'
import { useLocalStore } from '@/store/localStore'
import { useI18nStore } from '@/store/i18nStore'
import LanguageList from '../LanguageList.vue'

// Mounts the real boot path — localStore, the Tolgee plugin and the i18n
// store's initial-locale negotiation — around a LanguageList.
function boot(setup: () => void = () => {}) {
  const Child = defineComponent({
    setup() {
      setup()
      return () => h(LanguageList, { languages: ['en', 'hu', 'it'] })
    },
  })
  const Root = defineComponent({
    setup() {
      useI18nStore()
      return () => h(Child)
    },
  })

  const app = createApp(Root)
  app.use(createPinia())
  useLocalStore().initialize()
  appUseI18n(app)

  const el = document.createElement('div')
  document.body.appendChild(el)
  app.mount(el)
  return el
}

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

describe('LanguageList', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(navigator, 'languages', { value: ['en-US', 'en'], configurable: true })
  })

  afterEach(async () => {
    document.body.innerHTML = ''
    await tolgee.changeLanguage('en')
  })

  it('labels the languages in the stored locale', async () => {
    localStorage.setItem('language', 'hu')

    const el = boot()
    await flush()

    expect(el.textContent).toContain('magyar')
    expect(el.textContent).not.toContain('Hungarian')
  })

  // Regression: the labels came from a copy of the locale that App.vue
  // seeded at boot and a bus listener kept up to date. A view that set the
  // language while the first mount pass was still running changed the UI
  // locale before that listener existed, leaving the labels in English for
  // the rest of the session.
  it('labels the languages in a locale applied during the first mount pass', async () => {
    const el = boot(() => useI18nStore().setLanguage('hu'))
    await flush()

    expect(el.textContent).toContain('magyar')
    expect(el.textContent).not.toContain('Hungarian')
  })

  it('relabels the languages when the locale changes later', async () => {
    const el = boot()
    await flush()
    expect(el.textContent).toContain('Hungarian')

    useI18nStore().setLanguage('hu')
    await flush()

    expect(el.textContent).toContain('magyar')
  })

  it('sorts the active locale first', async () => {
    localStorage.setItem('language', 'hu')

    const el = boot()
    await flush()

    const labels = [...el.querySelectorAll('li')].map((li) => li.textContent?.trim())
    expect(labels[0]).toBe('magyar')
  })
})

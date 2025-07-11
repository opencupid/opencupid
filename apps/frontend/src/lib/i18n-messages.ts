let messages: Record<string, any> = {}

import prodMessages from '@intlify/unplugin-vue-i18n/messages'

  if (import.meta.env.PROD) {
  // Production: use statically bundled messages
    messages = prodMessages || {}
} else {
  // Dev: eagerly import locale files so Vite can watch them
  // it's not happening no matter what I do
  const modules = import.meta.glob('@shared/i18n/*.json', { eager: true }) as Record<string, { default: any }>

  messages = {}

  for (const [path, mod] of Object.entries(modules)) {
    const locale = path.match(/([\w-]+)\.json$/)?.[1]
    if (!locale) continue
    messages[locale] = mod.default
  }

  // TODO fix this goddamn piece of shit.  I can't get it to work.
  if (import.meta.hot) {
    import.meta.hot.accept(Object.keys(modules), (mods) => {
      for (const [path, mod] of Object.entries(mods)) {
        const locale = path.match(/([\w-]+)\.json$/)?.[1]
        if (!locale || !mod?.default) continue
        messages[locale] = mod.default
        window.__APP_I18N__?.global.setLocaleMessage(locale, mod.default)
      }
    })
  }
}

export default messages

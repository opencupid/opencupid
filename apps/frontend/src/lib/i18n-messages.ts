// i18n/messages.ts
let messages: Record<string, any> = {}

if (import.meta.env.PROD) {
  // Production: use statically bundled messages
  messages = (await import('@intlify/unplugin-vue-i18n/messages')).default || {}
} else {
  // Dev: eagerly import locale files so Vite can watch them
  const modules = import.meta.glob('../../packages/shared/i18n/*.json', { eager: true }) as Record<string, { default: any }>

  messages = {}

  for (const [path, mod] of Object.entries(modules)) {
    const locale = path.match(/([\w-]+)\.json$/)?.[1]
    if (!locale) continue
    messages[locale] = mod.default
  }


  if (import.meta.hot) {
    import.meta.hot.accept(Object.keys(modules), (mods) => {
      console.log('[i18n HMR] Re-importing locale messages...')
      for (const [path, mod] of Object.entries(mods)) {
        const locale = path.match(/([\w-]+)\.json$/)?.[1]
        if (!locale || !mod?.default) continue
        messages[locale] = mod.default
        window.__APP_I18N__?.global.setLocaleMessage(locale, mod.default)
        console.log(`[i18n HMR] Reloaded locale: ${locale}`)
      }
    })
  }
}

export default messages

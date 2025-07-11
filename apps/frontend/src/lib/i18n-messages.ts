// i18n/messages.ts
let messages: Record<string, any>

if (import.meta.env.PROD) {
  // Production: use statically bundled messages
  messages = await import('@intlify/unplugin-vue-i18n/messages').then(m => m.default)
} else {
  // Dev: use import.meta.glob() for live-reloading
  const modules = import.meta.glob('@shared/i18n/*.json')

  messages = {}

  //  this loads correctly now
  for (const [path, loader] of Object.entries(modules)) {
    const locale = path.match(/([\w-]+)\.json$/)?.[1]
    if (!locale) continue
    const mod = await loader()
    messages[locale] = mod.default
  }


  if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    // this runs
    console.log('[i18n HMR] Re-importing locale messages...')

    const newModules = import.meta.glob('@shared/i18n/*.json')
    for (const [path, loader] of Object.entries(newModules)) {
      // never runs 
      console.log(`[i18n HMR] Reloading locale: ${path}`)
      const locale = path.match(/([\w-]+)\.json$/)?.[1]
      if (!locale) continue

      loader().then(mod => {
        console.log(`[i18n HMR] Loaded locale: ${locale}`, mod)
        if (mod?.default) {
          window.__APP_I18N__?.global.setLocaleMessage(locale, mod.default)
          console.log(`[i18n HMR] Reloaded locale: ${locale}`)
        }
      })
    }
  })
}
}

export default messages

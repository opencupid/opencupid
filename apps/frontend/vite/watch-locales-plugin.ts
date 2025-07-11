import path from 'path'
import type { Plugin } from 'vite'

export default function WatchLocalesPlugin(): Plugin {
  const localeDir = path.resolve(__dirname, '../../packages/shared/i18n')
  return {
    name: 'watch-locales',
    configureServer(server) {
      server.watcher.add(localeDir)
    }
  }
}

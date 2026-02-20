;(globalThis as any).__APP_CONFIG__ = {
  API_BASE_URL: 'http://localhost',
  WS_BASE_URL: 'ws://localhost',
  IMAGE_URL_BASE: 'http://localhost/images',
  NODE_ENV: 'test',
  SENTRY_DSN: '',
}
import rootPackageJson from '../../../package.json'
;(globalThis as any).__APP_VERSION__ = {
  app: rootPackageJson.version,
}

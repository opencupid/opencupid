import * as Sentry from '@sentry/node'

import { appConfig } from './appconfig'

if (appConfig.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: appConfig.SENTRY_DSN,
    release: `api@${__APP_VERSION__}`,
    environment: appConfig.NODE_ENV,
    tracesSampleRate: 0.05,
    sendDefaultPii: true,
  })
}

export default Sentry

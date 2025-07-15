import * as Sentry from '@sentry/node'

import { appConfig } from './appconfig'

if (appConfig.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: appConfig.SENTRY_DSN,
    environment: appConfig.NODE_ENV,
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
  })
}


export default Sentry
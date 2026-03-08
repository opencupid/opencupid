/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/// <reference types="vite/client" />

declare module '*.json' {
  const value: any
  export default value
}

declare const __APP_CONFIG__: {
  readonly API_BASE_URL: string
  readonly FRONTEND_URL: string
  readonly WS_BASE_URL: string
  readonly MEDIA_URL_BASE: string
  readonly NODE_ENV: string
  readonly VAPID_PUBLIC_KEY: string
  readonly SITE_NAME: string
  readonly SENTRY_DSN: string
  readonly JITSI_DOMAIN: string
  readonly VOICE_MESSAGE_MAX_DURATION: string
  readonly MAPTILER_API_KEY: string
  readonly TOLGEE_API_URL: string
  readonly TOLGEE_API_KEY: string
}

declare const __APP_VERSION__: string

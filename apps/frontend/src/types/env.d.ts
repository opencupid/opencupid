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

declare const __APP_CONFIG__: Readonly<import('@shared/appConfig.schema').AppConfig>

declare const __APP_VERSION__: string

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/// <reference types="vite/client" />

declare module "*.json" {
  const value: any;
  export default value;
}

declare const __APP_CONFIG__: {
  readonly API_BASE_URL: string
  readonly WS_BASE_URL: string
  readonly IMAGE_URL_BASE: string
  readonly FRONTEND_URL: string
  readonly NODE_ENV: string
}

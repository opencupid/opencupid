import path from 'path'
import os from 'os'
import { loadEnv, type Plugin } from 'vite'
import { findUpSync } from 'find-up'
import mkcert from 'vite-plugin-mkcert'
import { getPackageVersion } from '../../packages/shared/version'
import vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import svgLoader from 'vite-svg-loader'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next'

export const hostname = os.hostname()
export const mdnsName = hostname + '.local'

export const devCertPlugin = () =>
  mkcert({
    hosts: ['localhost', '127.0.0.1', hostname, mdnsName],
    savePath: path.join(__dirname, '../../certs'),
    keyFileName: hostname + '-key.pem',
    certFileName: hostname + '-cert.pem',
    autoUpgrade: false,
  })

export const server = (mode: string, env: Record<string, string | undefined>, appDir: string) => {
  if (mode !== 'development') return {}

  const backendPort = env.BACKEND_PORT ?? '3000'

  return {
    server: {
      host: true,
      allowedHosts: ['localhost', '127.0.0.1', hostname, mdnsName],
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          secure: false, // accept self-signed TLS
          // for admin app
          headers: { 'X-Admin-Authenticated': 'true' },
          configure: (proxy: any, _options: any) => {
            proxy.on('proxyReq', (proxyReq: any, req: any) => {
              const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
              if (clientIp) {
                proxyReq.setHeader('X-Forwarded-For', clientIp)
              }
            })
          },
        },
        '/ws': {
          target: `ws://localhost:${backendPort}`,
          rewriteWsOrigin: true,
          ws: true,
          secure: false, // accept self-signed TLS
        },
      },
      fs: {
        allow: [
          appDir,
          path.resolve(appDir, '../../packages/shared'),
          path.resolve(appDir, '../../node_modules'),
        ],
      },
    },
  }
}

export const loadProjectEnv = (mode: string) => {
  const envFile = findUpSync('.env') ?? findUpSync('.env.example')

  if (!envFile) {
    console.error('Could not find a .env file')
    process.exit(1)
  }
  const envDir = path.dirname(envFile)

  return {
    ...process.env,
    ...loadEnv(mode, envDir, ''),
  }
}

export const define = (_mode: string) => {
  const appVersion = getPackageVersion(path.join(__dirname, 'package.json'))

  return {
    envDir: '../../',
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
  }
}

export const buildAppConfig = (env: Record<string, string | undefined>) => ({
  API_BASE_URL: env.API_BASE_URL ?? '/api',
  WS_BASE_URL: env.WS_BASE_URL ?? '/ws',
  MEDIA_URL_BASE: env.MEDIA_URL_BASE ?? '/user-content',
  NODE_ENV: env.NODE_ENV ?? 'development',
  VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY ?? '',
  SENTRY_DSN: env.SENTRY_DSN ?? '',
  SITE_NAME: env.SITE_NAME ?? 'OpenCupid',
  JITSI_DOMAIN: env.JITSI_DOMAIN ?? '',
  VOICE_MESSAGE_MAX_DURATION: Number(env.VOICE_MESSAGE_MAX_DURATION) || 120,
  MAPTILER_API_KEY: env.MAPTILER_API_KEY ?? '',
})

export const sharedPlugins = (appDir: string) => [
  vue({
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag === 'altcha-widget',
      },
    },
  }),
  VueI18nPlugin({
    include: [path.resolve(appDir, '../../packages/shared/i18n/*')],
  }),
  svgLoader(),
  Components({
    resolvers: [BootstrapVueNextResolver()],
  }),
]

export const sharedResolve = (appDir: string) => ({
  alias: {
    '@': path.resolve(appDir, './src'),
    '@shared': path.resolve(appDir, '../../packages/shared'),
    '@zod': path.resolve(appDir, '../../packages/shared/zod'),
    '@bootstrap': path.resolve(appDir, 'node_modules/bootstrap'),
  },
})

export const runtimeConfigPlugin = (mode: string): Plugin => {
  const env = mode === 'development' ? loadProjectEnv(mode) : process.env

  const configJs = `window.__APP_CONFIG__ = ${JSON.stringify(buildAppConfig(env))};
`

  return {
    name: 'runtime-config',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/config.js') {
          res.setHeader('Content-Type', 'application/javascript')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(configJs)
          return
        }
        next()
      })
    },
  }
}

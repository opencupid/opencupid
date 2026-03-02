import path from 'path'
import fs from 'fs'
import { loadEnv, type Plugin } from 'vite'
import { findUpSync } from 'find-up'
import { getPackageVersion } from '../../packages/shared/version'

export const server = (mode: string) => {
  if (mode !== 'development') return {}

  return {
    server: {
      allowedHosts: ['localhost', 'oc.dev.froggle.org', 'gaians.net'],
      proxy: {
        '/api': {
          target: 'http://localhost:3000', // or https://localhost:3000 if backend runs TLS
          changeOrigin: true,
          secure: false, // accept self-signed TLS
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
          target: 'ws://localhost:3000',
          rewriteWsOrigin: true,
          ws: true,
          secure: false, // accept self-signed TLS
        },
      },
      https: {
        key: fs.readFileSync(path.resolve(__dirname, '../../certs/privkey.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, '../../certs/fullchain.pem')),
      },
      fs: {
        allow: [
          path.resolve(__dirname, './'),
          path.resolve(__dirname, '../../packages/shared'),
          path.resolve(__dirname, '../../node_modules'),
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

export const runtimeConfigPlugin = (mode: string): Plugin => {
  const env = mode === 'development' ? loadProjectEnv(mode) : process.env

  const configJs = `window.__APP_CONFIG__ = ${JSON.stringify({
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
  })};
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

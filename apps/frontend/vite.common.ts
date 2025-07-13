import path from "path";
import fs from 'fs'
import { loadEnv } from "vite";
import { findUpSync } from 'find-up'

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
              const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
              if (clientIp) {
                proxyReq.setHeader('X-Forwarded-For', clientIp);
              }
            });
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
    }
  }
}

export const define = (mode: string) => {

  const envFile = findUpSync('.env') ?? findUpSync('.env.example')

  if (!envFile) {
    console.error('Could not find a .env file')
    process.exit(1)
  }
  const envDir = path.dirname(envFile)

  const env = {
    ...process.env,
    ...loadEnv(mode, envDir, ''),
  }
  return {
    envDir: '../../',
    define: {
      __APP_CONFIG__: JSON.stringify({
        API_BASE_URL: env.API_BASE_URL,
        WS_BASE_URL: env.WS_BASE_URL,
        IMAGE_URL_BASE: env.IMAGE_URL_BASE,
        FRONTEND_URL: env.FRONTEND_URL,
        NODE_ENV: env.NODE_ENV,
        VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY,
        GEOIP_URL: env.GEOIP_URL,
        OG_TITLE: env.OG_TITLE,
        OG_DESCRIPTION: env.OG_DESCRIPTION,
        OG_IMAGE: env.OG_IMAGE,
        OG_URL: env.OG_URL,
        OG_TYPE: env.OG_TYPE,
        SITE_NAME: env.SITE_NAME,
      }),
    }
  }
}

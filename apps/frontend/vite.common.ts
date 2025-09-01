import path from "path";
import fs from 'fs'
import { loadEnv } from "vite";
import { findUpSync } from 'find-up'
import { getPackageVersion } from "../../packages/shared/version";

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

  // Read package versions
  const repoRoot = path.resolve(__dirname, '../..')
  const versions = {
    app: getPackageVersion(path.join(repoRoot, 'package.json')),
  }

  return {
    envDir: '../../',
    define: {
      __APP_CONFIG__: JSON.stringify({
        API_BASE_URL: env.API_BASE_URL,
        WS_BASE_URL: env.WS_BASE_URL,
        IMAGE_URL_BASE: env.IMAGE_URL_BASE,
        NODE_ENV: env.NODE_ENV,
        VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY,
        SENTRY_DSN: env.SENTRY_DSN,
        SITE_NAME: env.SITE_NAME,
      }),
      __APP_VERSION__: JSON.stringify(versions),
    }
  }
}

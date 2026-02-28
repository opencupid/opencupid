import path from 'path'
import fs from 'fs'
import { defineConfig, loadEnv, type ConfigEnv, type Plugin, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { findUpSync } from 'find-up'
import { getPackageVersion } from '../../packages/shared/version'

/**
 * In development, serve /config.js with the runtime config so the <script>
 * tag in index.html works the same as in the Docker container.
 */
function runtimeConfigPlugin(env: Record<string, string | undefined>): Plugin {
  const configJs = `window.__APP_CONFIG__ = ${JSON.stringify({
    API_BASE_URL: env.API_BASE_URL ?? '/api',
  })};`

  return {
    name: 'admin-runtime-config',
    configureServer(server) {
      server.middlewares.use('/config.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript')
        res.end(configJs)
      })
    },
  }
}

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const envFile = findUpSync('.env') ?? findUpSync('.env.example')
  const envDir = envFile ? path.dirname(envFile) : '../../'
  const env = { ...process.env, ...loadEnv(mode, envDir, '') }

  const appVersion = getPackageVersion(path.join(__dirname, 'package.json'))

  const config: UserConfig = {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    plugins: [vue(), runtimeConfigPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@zod': path.resolve(__dirname, '../../packages/shared/zod'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }

  if (mode === 'development') {
    const keyPath = path.resolve(__dirname, '../../certs/localhost-key.pem')
    const certPath = path.resolve(__dirname, '../../certs/localhost-cert.pem')
    const hasDevCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)

    config.server = {
      allowedHosts: ['localhost', 'oc.dev.froggle.org'],
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          headers: { 'X-Admin-Authenticated': 'true' },
        },
      },
      ...(hasDevCerts
        ? {
            https: {
              key: fs.readFileSync(keyPath),
              cert: fs.readFileSync(certPath),
            },
          }
        : {}),
      fs: {
        allow: [
          path.resolve(__dirname, './'),
          path.resolve(__dirname, '../../packages/shared'),
          path.resolve(__dirname, '../../node_modules'),
        ],
      },
    }
  }

  return config
})

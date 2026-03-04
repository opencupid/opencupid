import path from 'path'
import { defineConfig, type ConfigEnv, type Plugin, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { getPackageVersion } from '../../packages/shared/version'
import { loadProjectEnv, server, devCertPlugin } from '../frontend/vite.common'

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
  const env = loadProjectEnv(mode)

  const appVersion = getPackageVersion(path.join(__dirname, 'package.json'))

  const config: UserConfig = {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    plugins: [
      vue(),
      runtimeConfigPlugin(env),
      ...(mode === 'development' ? [devCertPlugin()] : []),
    ],
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
    const backendPort = env.BACKEND_PORT ?? '3000'
    config.server = {
      ...server(mode, env, __dirname).server,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          secure: false,
          headers: { 'X-Admin-Authenticated': 'true' },
        },
      },
    }
  }

  return config
})

import { defineConfig, type ConfigEnv, type Plugin, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import {
  loadProjectEnv,
  server,
  define,
  devCertPlugin,
  devInspectorPlugin,
  commonResolveAliases,
} from '../../packages/shared/vite.common'

/**
 * In development, serve /config.js with the runtime config so the <script>
 * tag in index.html works the same as in the Docker container.
 */
function adminRuntimeConfigPlugin(env: Record<string, string | undefined>): Plugin {
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
  const env = mode === 'development' ? loadProjectEnv(mode) : process.env

  return {
    ...define(__dirname),
    ...(mode === 'development' ? server(mode, env, __dirname) : {}),
    plugins: [
      ...devInspectorPlugin(mode, __dirname),
      vue(),
      adminRuntimeConfigPlugin(env),
      ...(mode === 'development' ? [devCertPlugin()] : []),
    ],
    resolve: {
      alias: commonResolveAliases(__dirname),
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }
})

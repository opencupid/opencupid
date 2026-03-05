import { type ConfigEnv, defineConfig, type UserConfig } from 'vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import serveStatic from 'serve-static'
import path from 'path'
import {
  server,
  define,
  runtimeConfigPlugin,
  loadProjectEnv,
  devCertPlugin,
  sharedPlugins,
  sharedResolve,
} from './vite.common'

process.env.DEBUG = 'vite:*' // Add this to force verbose output

// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = loadProjectEnv(mode)
  return {
    ...define(mode),
    ...server(mode, env, __dirname),
    build: {
      sourcemap: true,
      rollupOptions: {
        external: (id) => id.includes('__tests__'),
        output: {
          manualChunks(id) {
            if (id.includes('shared/ui/LocaleSelector')) {
              return 'landing'
            }
            if (id.includes('features/landingpage')) {
              return 'landing'
            }
            if (id.includes('assets/icons')) {
              return 'icons'
            }
            if (id.includes('flag-icons')) {
              return 'flags'
            }
          },
        },
      },
    },
    esbuild: {
      sourcemap: true,
    },
    optimizeDeps: {
      include: ['qrcode'],
    },
    plugins: [
      {
        name: 'exclude-tests-from-build',
        resolveId(source) {
          if (source.includes('__tests__')) return '\0ignored'
          return null
        },
      },
      ...sharedPlugins(__dirname),
      vueJsx(),
      vueDevTools(),
      {
        name: 'serve-static-media',
        configureServer(server) {
          server.middlewares.use(
            env.MEDIA_URL_BASE!,
            serveStatic(path.resolve(__dirname, env.MEDIA_UPLOAD_DIR!))
          )
        },
      },
      ...(mode === 'development' ? [devCertPlugin()] : []),
      runtimeConfigPlugin(mode),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import', 'color-functions', 'global-builtin', 'if-function'],
          includePaths: ['node_modules'],
          quietDeps: true,
          additionalData: '',
        },
      },
    },
    resolve: sharedResolve(__dirname),
  }
})

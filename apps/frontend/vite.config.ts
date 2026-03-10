import path from 'path'
import { type ConfigEnv, defineConfig, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VueMcp } from 'vite-plugin-vue-mcp'

import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next'
import svgLoader from 'vite-svg-loader'
import serveStatic from 'serve-static'
import {
  server,
  define,
  runtimeConfigPlugin,
  loadProjectEnv,
  devCertPlugin,
} from '../../packages/shared/vite.common'

process.env.DEBUG = 'vite:*' // Add this to force verbose output

// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = mode === 'development' ? loadProjectEnv(mode) : process.env
  return {
    ...define(__dirname),
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
      exclude: ['vue-i18n'],
    },
    plugins: [
      {
        name: 'exclude-tests-from-build',
        resolveId(source) {
          if (source.includes('__tests__')) return '\0ignored'
          return null
        },
      },

      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'altcha-widget',
          },
        },
      }),

      vueJsx(),
      vueDevTools(),
      svgLoader(),
      Components({
        resolvers: [BootstrapVueNextResolver()],
      }),
      {
        name: 'serve-static-media',
        configureServer(server) {
          server.middlewares.use(
            env.MEDIA_URL_BASE!,
            serveStatic(path.resolve(__dirname, env.MEDIA_UPLOAD_DIR!))
          )
        },
      },

      ...(mode === 'development' ? [devCertPlugin(), VueMcp()] : []),
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../../packages/shared'),
        '@zod': path.resolve(__dirname, '../../packages/shared/zod'),
        '@bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
        'vue-i18n': path.resolve(__dirname, './src/lib/i18n.ts'),
      },
    },
  }
})

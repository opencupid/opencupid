import fs from 'fs'
import path from 'path'
import { type ConfigEnv, defineConfig, loadEnv, type PluginOption, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
// import visualizer from 'vite-bundle-visualizer'

import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next'
import svgLoader from 'vite-svg-loader'
import serveStatic from 'serve-static'
// import VitePluginBrowserSync from 'vite-plugin-browser-sync'
import { server, define } from './vite.common'
import MetaInjectPlugin from './vite/vite-plugin-meta-inject'

process.env.DEBUG = 'vite:*' // Add this to force verbose output
// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const rootEnv = loadEnv(mode, '../../', '')
  return {
    ...define(mode),
    ...server(mode),
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
          }
        }
      }
    },
    esbuild: {
      sourcemap: true,
    },
    optimizeDeps: {
      include: ['qrcode']
    },
    plugins: [
      {
        name: 'exclude-tests-from-build',
        resolveId(source) {
          if (source.includes('__tests__')) return '\0ignored'
          return null
        }
      },

      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'altcha-widget',
          },
        },
      }),
      // ...(mode === 'development'
      //   ? [visualizer({
      //     open: true,
      //     gzipSize: true,
      //     emitFile: true,
      //     filename: "stats.html",
      //     template: 'sunburst'
      //   }) as PluginOption]
      //   : [visualizer({
      //     open: false,
      //     gzipSize: true,
      //     emitFile: true,
      //     filename: "stats.html",
      //     template: 'sunburst'
      //   })]),
      vueJsx(),
      vueDevTools(),
      VueI18nPlugin({
        include: [path.resolve(__dirname, '../../packages/shared/i18n/*')]
      }),
      svgLoader(),
      Components({
        resolvers: [BootstrapVueNextResolver()],
        // exclude: [/\/__tests__\//],
      }),
      {
        name: 'serve-static-media',
        configureServer(server) {
          server.middlewares.use(
            rootEnv.MEDIA_URL_BASE!,
            serveStatic(path.resolve(__dirname, rootEnv.MEDIA_UPLOAD_DIR!)),
          )
        },
      },
      // VitePluginBrowserSync({
      //   dev: {
      //     bs: {
      //       https: {
      //         key: '../../certs/privkey.pem',
      //         cert: '../../certs/fullchain.pem',
      //       },
      //       open: false,
      //       port: 5174,
      //       cors: true,
      //       ui: {
      //         port: 8081,
      //       },
      //       notify: true
      //     }
      //   }
      // }),
      MetaInjectPlugin(mode),
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
      },
    },
  }
})

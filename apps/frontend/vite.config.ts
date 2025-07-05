import fs from 'fs'
import path from 'path'
import { type ConfigEnv, defineConfig, loadEnv, type PluginOption, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'

import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next'
import svgLoader from 'vite-svg-loader'
import serveStatic from 'serve-static'
import VitePluginBrowserSync from 'vite-plugin-browser-sync'
import { server, define } from './vite.common'

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
            if (id.includes('features/auth')) {
              return 'auth'
            }
            if (id.includes('vue-circle-flag')) {
              return 'flags'
            }
            if (id.includes('assets/icons')) {
              return 'icons'
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
      ...(mode === 'development'
        ? [visualizer({
          open: true,
          gzipSize: true,
          emitFile: true,
          filename: "stats.html",
          template: 'sunburst'
        }) as PluginOption]
        : [visualizer({
          open: false,
          gzipSize: true,
          emitFile: true,
          filename: "stats.html",
          template: 'sunburst'
        }) as PluginOption]),
      vueJsx(),
      vueDevTools(),
      svgLoader(),
      Components({
        resolvers: [BootstrapVueNextResolver()],
        // exclude: [/\/__tests__\//],
      }),
      {
        name: 'serve-static-images',
        configureServer(server) {
          server.middlewares.use(
            '/images',
            serveStatic(path.resolve(__dirname, rootEnv.MEDIA_UPLOAD_DIR)),
          )
        },
      },
      VitePluginBrowserSync({
        dev: {
          bs: {
            https: {
              key: '../../certs/key.pem',
              cert: '../../certs/cert.pem',
            },
            open: false,
            port: 5174,
            ui: {
              port: 8081
            },
            notify: false
          }
        }
      })

      // VitePWA({
      //   registerType: 'autoUpdate',
      //   injectRegister: 'auto',
      //   workbox: {
      //     clientsClaim: true,
      //     skipWaiting: true,
      //     maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      //   },
      //   devOptions: {
      //     enabled: true, 
      //   },
      // })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import', 'mixed-decls', 'color-functions', 'global-builtin'],
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

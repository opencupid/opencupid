import path from 'path'
import { defineConfig, type ConfigEnv, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import svgLoader from 'vite-svg-loader'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next'
import { define, loadProjectEnv } from './vite.common'

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = loadProjectEnv(mode)
  return {
    ...define(mode),
    define: {
      __APP_CONFIG__: JSON.stringify({
        API_BASE_URL: env.API_BASE_URL ?? '/api',
        WS_BASE_URL: env.WS_BASE_URL ?? '/ws',
        MEDIA_URL_BASE: env.MEDIA_URL_BASE ?? '/user-content',
        NODE_ENV: env.NODE_ENV ?? 'production',
        VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY ?? '',
        SENTRY_DSN: env.SENTRY_DSN ?? '',
        SITE_NAME: env.SITE_NAME ?? 'OpenCupid',
        JITSI_DOMAIN: env.JITSI_DOMAIN ?? '',
        VOICE_MESSAGE_MAX_DURATION: Number(env.VOICE_MESSAGE_MAX_DURATION) || 120,
        MAPTILER_API_KEY: env.MAPTILER_API_KEY ?? '',
      }),
    },
    build: {
      ssr: 'src/ssr-entry.ts',
      outDir: 'dist-ssr',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
    ssr: {
      noExternal: true,
    },
    plugins: [
      vue(),
      VueI18nPlugin({
        include: [path.resolve(__dirname, '../../packages/shared/i18n/*')],
      }),
      svgLoader(),
      Components({
        resolvers: [BootstrapVueNextResolver()],
      }),
    ],
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

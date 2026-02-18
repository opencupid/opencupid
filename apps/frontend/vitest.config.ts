import { type ConfigEnv, defineConfig, type ViteUserConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

import { server, define } from './vite.common'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

export default defineConfig(({ mode }: ConfigEnv): ViteUserConfig => {

  return {
    ...define(mode),
    ...server(mode),
    plugins: [
      vue(),
      Components({
        resolvers: [BootstrapVueNextResolver()],
        // exclude: [/\/__tests__\//],
      }),
      VueI18nPlugin({
        include: [path.resolve(__dirname, '../../packages/shared/i18n/*')],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../../packages/shared'),
        '@zod': path.resolve(__dirname, '../../packages/shared/zod')
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/tests/setup.ts'],
      include: ['src/**/__tests__/**/*.{spec,test}.ts'],
      exclude: ['e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/tests/',
          '**/*.d.ts'
        ]
      }
    }
  }
})

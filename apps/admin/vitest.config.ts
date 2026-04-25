import { defineConfig, type ViteUserConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(
  (): ViteUserConfig => ({
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@zod': path.resolve(__dirname, '../../packages/shared/zod'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify('0.0.0-test'),
      __APP_CONFIG__: JSON.stringify({ API_BASE_URL: '' }),
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/tests/setup.ts'],
      include: ['src/**/__tests__/**/*.{spec,test}.ts'],
    },
  })
)

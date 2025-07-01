import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/__tests__/**/*.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/__integration_tests__/',
        '**/*.d.ts',
        'prisma/',
        'dist/'
      ]
    }
  },
  server: {
    deps: { external: ['dotenv'] },
  },
  plugins: [tsconfigPaths()],
})

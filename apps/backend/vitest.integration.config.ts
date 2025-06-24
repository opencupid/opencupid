import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/__integration_tests__/**/*.ts'],
    deps: { external: ['dotenv'] },
  },
  server: {
    deps: { external: ['dotenv'] },
  },
  plugins: [tsconfigPaths()],
})

import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  mode: 'test',
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/__integration_tests__/**/*.ts'],
    deps: { external: ['dotenv'] },
    setupFiles: ['src/test-utils/setupIntegrationEnv.ts'],
  },
  server: {
    // deps: { external: ['dotenv'] },
  },
  plugins: [tsconfigPaths()],
})
// apps/backend/src/test-utils/setupIntegrationEnv.ts
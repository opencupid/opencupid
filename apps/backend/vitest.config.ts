import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { getPackageVersion } from '../../packages/shared/version'
import path from 'path'

const appVersion = getPackageVersion(path.join(__dirname, 'package.json'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
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

import { defineConfig } from 'tsup'
import { getPackageVersion } from '../../packages/shared/version'
import path from 'path'

const appVersion = getPackageVersion(path.join(__dirname, 'package.json'))
const frontendVersion = getPackageVersion(path.join(__dirname, '../frontend/package.json'))

export default defineConfig({
  entry: ['src/main.ts'],
  outDir: 'dist',
  format: ['cjs'],
  splitting: false,
  clean: true,
  sourcemap: true,
  dts: false,
  target: 'es2020',
  shims: false,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __FRONTEND_VERSION__: JSON.stringify(frontendVersion),
  },
  loader: {
    '.css': 'text',
  },
})

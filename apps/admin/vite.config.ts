import path from 'path'
import fs from 'fs'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { findUpSync } from 'find-up'
import { getPackageVersion } from '../../packages/shared/version'

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const envFile = findUpSync('.env') ?? findUpSync('.env.example')
  const envDir = envFile ? path.dirname(envFile) : '../../'
  const env = { ...process.env, ...loadEnv(mode, envDir, '') }

  const repoRoot = path.resolve(__dirname, '../..')
  const versions = {
    app: getPackageVersion(path.join(repoRoot, 'package.json')),
  }

  const config: UserConfig = {
    define: {
      __APP_CONFIG__: JSON.stringify({
        API_BASE_URL: env.API_BASE_URL,
      }),
      __APP_VERSION__: JSON.stringify(versions),
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@zod': path.resolve(__dirname, '../../packages/shared/zod'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }

  if (mode === 'development') {
    const keyPath = path.resolve(__dirname, '../../certs/localhost-key.pem')
    const certPath = path.resolve(__dirname, '../../certs/localhost-cert.pem')
    const hasDevCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)

    config.server = {
      allowedHosts: ['localhost', 'oc.dev.froggle.org'],
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
      ...(hasDevCerts
        ? {
            https: {
              key: fs.readFileSync(keyPath),
              cert: fs.readFileSync(certPath),
            },
          }
        : {}),
      fs: {
        allow: [
          path.resolve(__dirname, './'),
          path.resolve(__dirname, '../../packages/shared'),
          path.resolve(__dirname, '../../node_modules'),
        ],
      },
    }
  }

  return config
})

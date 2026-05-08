import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
import { findUpSync } from '../../packages/shared/findUp'
import { defineConfig, env } from 'prisma/config'

// Prisma 7 removed implicit .env loading — load it explicitly so the
// CLI can resolve `env("DATABASE_URL")` below.
const envFile = findUpSync('.env') ?? findUpSync('.env.example')
if (envFile) {
  dotenvExpand.expand(dotenv.config({ path: envFile, quiet: true }))
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed/index.js',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})

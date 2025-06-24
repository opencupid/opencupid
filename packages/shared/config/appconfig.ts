import { findUpSync } from 'find-up'
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
import { configSchema } from './schema'

// This will walk up from the current directory to find the first `.env` file
// If not found, fall back to `.env.example` so tests run with defaults
const envFile = findUpSync('.env') ?? findUpSync('.env.example')
if (!envFile) {
  console.error('Could not find a .env file')
  process.exit(1)
}

const envConfig = dotenv.config({ path: envFile })
dotenvExpand.expand(envConfig)

// Directly parse and export
const parsed = configSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format())
  process.exit(1)
}

export const appConfig = parsed.data
export type AppConfig = typeof appConfig

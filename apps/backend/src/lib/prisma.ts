import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { appConfig } from './appconfig'

// Define process-wide log level
const logLevels: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'production'
    ? ['error'] // In production, log only errors
    : [
        // 'query',
        'error',
        'warn',
      ]

// In development, use global to prevent multiple instances during hot reloading
declare global {
  var prisma: PrismaClient | undefined
}
const txOptions =
  process.env.NODE_ENV === 'development'
    ? {
        transactionOptions: {
          maxWait: 10_000, // optional: wait 10s for connection
          timeout: 300_000, // 5 minutes for interactive transaction
        },
      }
    : undefined

// Create the PrismaClient instance
const prismaClientSingleton = () => {
  // Prisma 7 requires a driver adapter — `datasources` / `datasourceUrl`
  // constructor options were removed.
  const adapter = new PrismaPg({ connectionString: appConfig.DATABASE_URL })
  return new PrismaClient({
    adapter,
    log: logLevels,
    ...txOptions,
  })
}

// Create the singleton
export const prisma = global.prisma ?? prismaClientSingleton()

// Cache in development only
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma
}

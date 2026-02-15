import { Prisma, PrismaClient } from '@prisma/client'

// Define process-wide log level
const logLevels: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'production'
    ? ['error'] // In production, log only errors
    : ['query', 'error', 'warn']

// In development, use global to prevent multiple instances during hot reloading
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}
const txOptions = process.env.NODE_ENV === 'development' ?
  {
    transactionOptions: {
      maxWait: 10_000,  // optional: wait 10s for connection
      timeout: 300_000, // 5 minutes for interactive transaction
    }
  } : undefined

// Create the PrismaClient instance
const prismaClientSingleton = () => {
  console.error("DATABASE_URL -> ", process.env.DATABASE_URL)
  return new PrismaClient({
    log: logLevels,
    ...txOptions,
    // configure connection pooling settings here
    // datasources: {
    //   db: {
    //     url: appConfig.DATABASE_URL,
    //     // These settings can improve performance under high load
    //     poolTimeout: 20, // 20 seconds
    //     connectionLimit: 10 // default is 10
    //   }
    // }
  })
}

// Create the singleton
export const prisma = global.prisma ?? prismaClientSingleton()

// Cache in development only
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma
}

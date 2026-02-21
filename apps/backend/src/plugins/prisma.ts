// apps/backend/src/plugins/prisma.ts
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default fp(async (fastify) => {
  fastify.decorate('prisma', prisma)
})

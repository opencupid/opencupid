import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { CityQuerySchema, CityRecordSchema } from '@/schemas/city.route.schema'

const prisma = new PrismaClient()

const cityRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get('/find', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    // Validate and parse query parameters
    const query = CityQuerySchema.parse(req.query)
    const { q, country, limit, offset } = query

    // Build Prisma where filter
    const where: any = {}
    if (q) where.name = { contains: q, mode: 'insensitive' }
    if (country) where.country = country.toUpperCase()

    // Fetch from database
    const cities = await prisma.city.findMany({
      where,
      select: { id: true, name: true, country: true, lat: true, lon: true },
      take: limit,
      skip: offset,
      orderBy: { name: 'asc' }
    })

    // Validate output and send
    const valid = CityRecordSchema.array().parse(cities)
    return reply.send(valid)
  })
}

export default cityRoutes
import { FastifyPluginAsync } from 'fastify'
import { sendError } from '../helpers'
import { prisma } from '@/lib/prisma'
import { getLast7Days, fillZeroDays } from '../adminHelpers'

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Defense in depth: require trusted header set by nginx mTLS admin proxy
  fastify.addHook('onRequest', async (req, reply) => {
    if (req.headers['x-admin-authenticated'] !== 'true') {
      return reply.code(403).send({ success: false, message: 'Forbidden' })
    }
  })

  // GET /admin/stats/daily — Daily signups & logins (last 7 days)
  fastify.get('/stats/daily', async (_req, reply) => {
    try {
      const days = getLast7Days()
      const since = days[0]

      const [signupRows, loginRows] = await Promise.all([
        prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT DATE("createdAt")::text AS date, COUNT(*)::bigint AS count
          FROM "User"
          WHERE "createdAt" >= ${since}::date
          GROUP BY DATE("createdAt")
          ORDER BY date
        `,
        prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT DATE("lastLoginAt")::text AS date, COUNT(*)::bigint AS count
          FROM "User"
          WHERE "lastLoginAt" >= ${since}::date
          GROUP BY DATE("lastLoginAt")
          ORDER BY date
        `,
      ])

      return reply.code(200).send({
        success: true,
        dailySignups: fillZeroDays(signupRows, days),
        dailyLogins: fillZeroDays(loginRows, days),
      })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching daily stats')
      return sendError(reply, 500, 'Failed to fetch daily stats')
    }
  })

  // GET /admin/stats — Dashboard KPIs
  fastify.get('/stats', async (_req, reply) => {
    try {
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const [
        totalUsers,
        totalProfiles,
        activeProfiles,
        recentSignups,
        blockedUsers,
        reportedProfiles,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.profile.count(),
        prisma.profile.count({ where: { isActive: true } }),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { isBlocked: true } }),
        prisma.profile.count({ where: { isReported: true } }),
      ])

      return reply.code(200).send({
        success: true,
        stats: {
          totalUsers,
          totalProfiles,
          activeProfiles,
          recentSignups,
          blockedUsers,
          reportedProfiles,
        },
      })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching admin stats')
      return sendError(reply, 500, 'Failed to fetch stats')
    }
  })

  // GET /admin/users — Paginated user list
  fastify.get('/users', async (req, reply) => {
    try {
      const { page = '1', pageSize = '25', search = '' } = req.query as Record<string, string>
      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 25))
      const skip = (pageNum - 1) * size

      const where = search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { phonenumber: { contains: search } },
            ],
          }
        : {}

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: size,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            phonenumber: true,
            isActive: true,
            isBlocked: true,
            roles: true,
            createdAt: true,
            lastLoginAt: true,
            profile: { select: { id: true, publicName: true } },
          },
        }),
        prisma.user.count({ where }),
      ])

      return reply.code(200).send({
        success: true,
        users,
        total,
        page: pageNum,
        pageSize: size,
      })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching admin users')
      return sendError(reply, 500, 'Failed to fetch users')
    }
  })

  // GET /admin/users/:id — User detail
  fastify.get('/users/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string }
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          phonenumber: true,
          isActive: true,
          isBlocked: true,
          isRegistrationConfirmed: true,
          roles: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          language: true,
          newsletterOptIn: true,
          isPushNotificationEnabled: true,
          profile: {
            select: {
              id: true,
              publicName: true,
              isActive: true,
              isSocialActive: true,
              isDatingActive: true,
            },
          },
        },
      })

      if (!user) return sendError(reply, 404, 'User not found')

      return reply.code(200).send({ success: true, user })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching admin user detail')
      return sendError(reply, 500, 'Failed to fetch user')
    }
  })

  // PATCH /admin/users/:id — Update user fields
  fastify.patch('/users/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string }
      const body = req.body as { isActive?: boolean; isBlocked?: boolean }

      const data: { isActive?: boolean; isBlocked?: boolean } = {}
      if (typeof body.isActive === 'boolean') data.isActive = body.isActive
      if (typeof body.isBlocked === 'boolean') data.isBlocked = body.isBlocked

      if (Object.keys(data).length === 0) {
        return sendError(reply, 400, 'No valid fields to update')
      }

      const user = await prisma.user.update({ where: { id }, data })

      return reply.code(200).send({ success: true, user })
    } catch (err) {
      fastify.log.error({ err }, 'Error updating admin user')
      return sendError(reply, 500, 'Failed to update user')
    }
  })

  // GET /admin/profiles/countries — Distinct country list
  fastify.get('/profiles/countries', async (_req, reply) => {
    try {
      const groups = await prisma.profile.groupBy({
        by: ['country'],
        where: { country: { not: '' } },
        orderBy: { country: 'asc' },
      })
      const countries = groups.map((g) => g.country)
      return reply.code(200).send({ success: true, countries })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching countries')
      return sendError(reply, 500, 'Failed to fetch countries')
    }
  })

  // GET /admin/profiles — Paginated profile list
  fastify.get('/profiles', async (req, reply) => {
    try {
      const {
        page = '1',
        pageSize = '25',
        search = '',
        country = '',
      } = req.query as Record<string, string>
      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 25))
      const skip = (pageNum - 1) * size

      const conditions: any[] = []
      if (search) {
        conditions.push({
          OR: [
            { publicName: { contains: search, mode: 'insensitive' as const } },
            { cityName: { contains: search, mode: 'insensitive' as const } },
            { country: { contains: search, mode: 'insensitive' as const } },
          ],
        })
      }
      if (country) {
        conditions.push({ country })
      }
      const where = conditions.length > 0 ? { AND: conditions } : {}

      const [profiles, total] = await Promise.all([
        prisma.profile.findMany({
          where,
          skip,
          take: size,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            publicName: true,
            country: true,
            cityName: true,
            isSocialActive: true,
            isDatingActive: true,
            isActive: true,
            isReported: true,
            isBlocked: true,
            isOnboarded: true,
            gender: true,
            createdAt: true,
            userId: true,
            user: { select: { email: true, phonenumber: true } },
          },
        }),
        prisma.profile.count({ where }),
      ])

      return reply.code(200).send({
        success: true,
        profiles,
        total,
        page: pageNum,
        pageSize: size,
      })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching admin profiles')
      return sendError(reply, 500, 'Failed to fetch profiles')
    }
  })

  // GET /admin/profiles/:id — Profile detail
  fastify.get('/profiles/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string }
      const profile = await prisma.profile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phonenumber: true,
              isActive: true,
              isBlocked: true,
              roles: true,
            },
          },
          profileImages: {
            select: { id: true, url: true, position: true },
            orderBy: { position: 'asc' },
          },
        },
      })

      if (!profile) return sendError(reply, 404, 'Profile not found')

      return reply.code(200).send({ success: true, profile })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching admin profile detail')
      return sendError(reply, 500, 'Failed to fetch profile')
    }
  })
}

export default adminRoutes

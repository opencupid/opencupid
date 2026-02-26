import { FastifyPluginAsync } from 'fastify'
import { DeepLClient } from 'deepl-node'
import slugify from 'slugify'
import { sendError } from '../helpers'
import { prisma } from '@/lib/prisma'
import { appConfig } from '@/lib/appconfig'
import { getLast7Days, fillZeroDays } from '../adminHelpers'

// DeepL locale codes require region suffixes for some languages
const DEEPL_LOCALE_MAP: Record<string, string> = {
  en: 'en-GB',
  pt: 'pt-PT',
}

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
            newsletterOptIn: true,
            isRegistrationConfirmed: true,
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

  // POST /admin/tags — Create a new tag
  fastify.post('/tags', async (req, reply) => {
    try {
      const body = req.body as {
        name?: string
        slug?: string
        translations?: { locale: string; name: string }[]
      }

      if (!body.name) {
        return sendError(reply, 400, 'name is required')
      }

      const slug = body.slug || slugify(body.name, { lower: true, strict: true })

      // Build translation creates: always include 'en' from name, plus any extra provided
      const translationCreates: { locale: string; name: string }[] = [
        { locale: 'en', name: body.name },
      ]
      if (body.translations) {
        for (const t of body.translations) {
          if (t.locale && t.name && t.locale !== 'en') {
            translationCreates.push({ locale: t.locale, name: t.name })
          }
        }
      }

      const tag = await prisma.tag.create({
        data: {
          name: body.name,
          slug,
          isApproved: true,
          translations: {
            create: translationCreates,
          },
        },
        include: {
          translations: { select: { locale: true, name: true } },
          _count: { select: { profiles: true } },
        },
      })

      return reply.code(201).send({ success: true, tag })
    } catch (err) {
      fastify.log.error({ err }, 'Error creating admin tag')
      return sendError(reply, 500, 'Failed to create tag')
    }
  })

  // GET /admin/tags — Paginated tag list
  fastify.get('/tags', async (req, reply) => {
    try {
      const { page = '1', pageSize = '25', search = '' } = req.query as Record<string, string>
      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 25))
      const skip = (pageNum - 1) * size

      const where: any = { isDeleted: false }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
          { translations: { some: { name: { contains: search, mode: 'insensitive' as const } } } },
        ]
      }

      const [tags, total] = await Promise.all([
        prisma.tag.findMany({
          where,
          skip,
          take: size,
          orderBy: { profiles: { _count: 'desc' } },
          include: {
            translations: { select: { locale: true, name: true } },
            _count: { select: { profiles: true } },
          },
        }),
        prisma.tag.count({ where }),
      ])

      return reply.code(200).send({
        success: true,
        tags,
        total,
        page: pageNum,
        pageSize: size,
      })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching admin tags')
      return sendError(reply, 500, 'Failed to fetch tags')
    }
  })

  // PATCH /admin/tags/:id — Update tag fields
  fastify.patch('/tags/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string }
      const body = req.body as {
        slug?: string
        name?: string
        isApproved?: boolean
        isHidden?: boolean
        isDeleted?: boolean
        translations?: { locale: string; name: string }[]
      }

      const data: any = {}
      if (typeof body.slug === 'string') data.slug = body.slug
      if (typeof body.name === 'string') data.name = body.name
      if (typeof body.isApproved === 'boolean') data.isApproved = body.isApproved
      if (typeof body.isHidden === 'boolean') data.isHidden = body.isHidden
      if (typeof body.isDeleted === 'boolean') data.isDeleted = body.isDeleted

      if (Array.isArray(body.translations) && body.translations.length > 0) {
        data.translations = {
          upsert: body.translations.map((t) => ({
            where: { tagId_locale: { tagId: id, locale: t.locale } },
            update: { name: t.name },
            create: { locale: t.locale, name: t.name },
          })),
        }
      }

      if (Object.keys(data).length === 0) {
        return sendError(reply, 400, 'No valid fields to update')
      }

      const tag = await prisma.tag.update({
        where: { id },
        data,
        include: { translations: { select: { locale: true, name: true } } },
      })

      return reply.code(200).send({ success: true, tag })
    } catch (err) {
      fastify.log.error({ err }, 'Error updating admin tag')
      return sendError(reply, 500, 'Failed to update tag')
    }
  })

  // POST /admin/tags/merge — Merge loser tags into a winner tag
  fastify.post('/tags/merge', async (req, reply) => {
    try {
      const { winnerTagId, loserTagIds } = req.body as {
        winnerTagId?: string
        loserTagIds?: string[]
      }

      if (!winnerTagId || !Array.isArray(loserTagIds) || loserTagIds.length === 0) {
        return sendError(reply, 400, 'winnerTagId and loserTagIds[] are required')
      }

      if (loserTagIds.includes(winnerTagId)) {
        return sendError(reply, 400, 'winnerTagId must not be in loserTagIds')
      }

      const tag = await prisma.$transaction(async (tx) => {
        // 1. Move translations from losers to winner (skip existing locales)
        const winnerTranslations = await tx.tagTranslation.findMany({
          where: { tagId: winnerTagId },
          select: { locale: true },
        })
        const existingLocales = new Set(winnerTranslations.map((t) => t.locale))

        const loserTranslations = await tx.tagTranslation.findMany({
          where: { tagId: { in: loserTagIds } },
        })

        for (const t of loserTranslations) {
          if (!existingLocales.has(t.locale)) {
            await tx.tagTranslation.update({
              where: { id: t.id },
              data: { tagId: winnerTagId },
            })
            existingLocales.add(t.locale)
          } else {
            await tx.tagTranslation.delete({ where: { id: t.id } })
          }
        }

        // 2. Reassign profile associations
        await tx.$executeRawUnsafe(
          `INSERT INTO "_ProfileTags" ("A", "B")
           SELECT "A", $1 FROM "_ProfileTags"
           WHERE "B" = ANY($2::text[])
           ON CONFLICT DO NOTHING`,
          winnerTagId,
          loserTagIds
        )
        await tx.$executeRawUnsafe(
          `DELETE FROM "_ProfileTags" WHERE "B" = ANY($1::text[])`,
          loserTagIds
        )

        // 3. Reassign filter associations
        await tx.$executeRawUnsafe(
          `INSERT INTO "_SocialMatchFilterToTag" ("A", "B")
           SELECT "A", $1 FROM "_SocialMatchFilterToTag"
           WHERE "B" = ANY($2::text[])
           ON CONFLICT DO NOTHING`,
          winnerTagId,
          loserTagIds
        )
        await tx.$executeRawUnsafe(
          `DELETE FROM "_SocialMatchFilterToTag" WHERE "B" = ANY($1::text[])`,
          loserTagIds
        )

        // 4. Soft-delete losers
        await tx.tag.updateMany({
          where: { id: { in: loserTagIds } },
          data: { isDeleted: true },
        })

        // Return updated winner
        return tx.tag.findUnique({
          where: { id: winnerTagId },
          include: {
            translations: { select: { locale: true, name: true } },
            _count: { select: { profiles: true } },
          },
        })
      })

      return reply.code(200).send({
        success: true,
        mergedCount: loserTagIds.length,
        tag,
      })
    } catch (err) {
      fastify.log.error({ err }, 'Error merging admin tags')
      return sendError(reply, 500, 'Failed to merge tags')
    }
  })

  // POST /admin/tags/translate — Translate tag name via DeepL
  fastify.post('/tags/translate', async (req, reply) => {
    try {
      const { text, targetLocales } = req.body as {
        text?: string
        targetLocales?: string[]
      }

      if (!text || !Array.isArray(targetLocales) || targetLocales.length === 0) {
        return sendError(reply, 400, 'text and targetLocales[] are required')
      }

      if (!appConfig.DEEPL_API_KEY) {
        return sendError(reply, 503, 'DeepL API key is not configured')
      }

      const client = new DeepLClient(appConfig.DEEPL_API_KEY)

      const translations: Record<string, string> = {}
      for (const locale of targetLocales) {
        const deeplLocale = DEEPL_LOCALE_MAP[locale] || locale
        const result = await client.translateText(text, null, deeplLocale as any)
        translations[locale] = result.text
      }

      return reply.code(200).send({ success: true, translations })
    } catch (err) {
      fastify.log.error({ err }, 'Error translating tag via DeepL')
      return sendError(reply, 500, 'Translation failed')
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

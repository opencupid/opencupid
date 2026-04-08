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

  /**
   * GET /stats/daily
   * Returns daily signup and login counts for the last 7 days.
   * @returns {{ success, dailySignups, dailyLogins }}
   */
  fastify.get('/stats/daily', async (_req, reply) => {
    try {
      const days = getLast7Days()
      const since = days[0]

      const [signupRows, loginRows, interactionRows, matchRows, messageRows] = await Promise.all([
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
        prisma.$queryRaw<{ date: string; count: bigint }[]>`
            SELECT DATE(first_at)::text AS date, COUNT(*)::bigint AS count
            FROM (
              SELECT LEAST("fromId","toId") AS a, GREATEST("fromId","toId") AS b,
                     MIN("createdAt") AS first_at
              FROM "LikedProfile"
              GROUP BY a, b
            ) pairs
            WHERE first_at >= ${since}::date
            GROUP BY DATE(first_at)
            ORDER BY date
          `,
        prisma.$queryRaw<{ date: string; count: bigint }[]>`
            SELECT DATE(GREATEST(a."createdAt", b."createdAt"))::text AS date,
                   COUNT(*)::bigint AS count
            FROM "LikedProfile" a
            JOIN "LikedProfile" b ON a."fromId" = b."toId" AND a."toId" = b."fromId"
            WHERE a."fromId" < a."toId"
              AND GREATEST(a."createdAt", b."createdAt") >= ${since}::date
            GROUP BY DATE(GREATEST(a."createdAt", b."createdAt"))
            ORDER BY date
          `,
        prisma.$queryRaw<{ date: string; count: bigint }[]>`
            SELECT DATE("createdAt")::text AS date, COUNT(*)::bigint AS count
            FROM "Message"
            WHERE "createdAt" >= ${since}::date
            GROUP BY DATE("createdAt")
            ORDER BY date
          `,
      ])

      return reply.code(200).send({
        success: true,
        dailySignups: fillZeroDays(signupRows, days),
        dailyLogins: fillZeroDays(loginRows, days),
        dailyInteractions: fillZeroDays(interactionRows, days),
        dailyMatches: fillZeroDays(matchRows, days),
        dailyMessages: fillZeroDays(messageRows, days),
      })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching daily stats')
      return sendError(reply, 500, 'Failed to fetch daily stats')
    }
  })

  /**
   * GET /stats
   * Returns dashboard KPIs: total users, active profiles, recent signups, blocked/reported counts,
   * and activity segment distribution.
   * @returns {{ success, stats }}
   */
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
        segmentGroups,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.profile.count(),
        prisma.profile.count({ where: { isActive: true } }),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { isBlocked: true } }),
        prisma.profile.count({ where: { isReported: true } }),
        prisma.profileActivitySummary.groupBy({
          by: ['segment'],
          _count: { segment: true },
        }),
      ])

      const segmentCounts = segmentGroups.map((g) => ({
        segment: g.segment,
        count: g._count.segment,
      }))

      return reply.code(200).send({
        success: true,
        stats: {
          totalUsers,
          totalProfiles,
          activeProfiles,
          recentSignups,
          blockedUsers,
          reportedProfiles,
          segmentCounts,
        },
      })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching admin stats')
      return sendError(reply, 500, 'Failed to fetch stats')
    }
  })

  /**
   * GET /users
   * Returns a paginated, searchable list of users.
   * @query {number} [page=1] - Page number
   * @query {number} [pageSize=25] - Page size (max 100)
   * @query {string} [search] - Search by email or phone
   * @returns {{ success, users, total, page, pageSize }}
   */
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
          orderBy: [{ isRegistrationConfirmed: 'desc' }, { createdAt: 'desc' }],
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

  /**
   * GET /users/:id
   * Returns detailed user information including profile data.
   * @param {string} id - User ID
   * @returns {{ success, user }}
   */
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

  /**
   * PATCH /users/:id
   * Updates user admin fields (active/blocked status).
   * @param {string} id - User ID
   * @body {boolean} [isActive] - Active status
   * @body {boolean} [isBlocked] - Blocked status
   * @returns {{ success, user }}
   */
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

      const user = await prisma.user.update({
        where: { id },
        data,
        omit: {
          tokenVersion: true,
          loginToken: true,
          loginTokenExp: true,
        },
      })

      return reply.code(200).send({ success: true, user })
    } catch (err) {
      fastify.log.error({ err }, 'Error updating admin user')
      return sendError(reply, 500, 'Failed to update user')
    }
  })

  /**
   * GET /profiles/countries
   * Returns a sorted list of distinct country codes across all profiles.
   * @returns {{ success, countries: string[] }}
   */
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

  /**
   * GET /profiles
   * Returns a paginated, searchable list of profiles with optional country filter.
   * @query {number} [page=1] - Page number
   * @query {number} [pageSize=25] - Page size (max 100)
   * @query {string} [search] - Search by name, city, or country
   * @query {string} [country] - Country code filter
   * @query {string} [segments] - Comma-separated activity segments filter (e.g. "new,frequent")
   * @returns {{ success, profiles, total, page, pageSize }}
   */
  fastify.get('/profiles', async (req, reply) => {
    try {
      const {
        page = '1',
        pageSize = '25',
        search = '',
        country = '',
        segments = '',
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
      if (segments) {
        const segmentList = segments.split(',').filter(Boolean)
        if (segmentList.length > 0) {
          conditions.push({
            activitySummary: { segment: { in: segmentList } },
          })
        }
      }
      const where = conditions.length > 0 ? { AND: conditions } : {}

      const [profiles, total] = await Promise.all([
        prisma.profile.findMany({
          where,
          skip,
          take: size,
          orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
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
            activitySummary: { select: { segment: true } },
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

  /**
   * POST /tags
   * Creates a new admin-approved tag with optional translations.
   * @body {string} name - Tag display name (used as 'en' translation)
   * @body {string} [slug] - URL slug (auto-generated from name if omitted)
   * @body {{ locale: string, name: string }[]} [translations] - Additional translations
   * @returns {{ success, tag }} 201
   */
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

  /**
   * GET /tags
   * Returns a paginated tag list, ordered by usage count. Excludes soft-deleted tags.
   * @query {number} [page=1] - Page number
   * @query {number} [pageSize=25] - Page size (max 100)
   * @query {string} [search] - Search by name, slug, or translation
   * @query {string} [userSubmitted] - Filter by isUserCreated flag ("true" to show only user-submitted)
   * @returns {{ success, tags, total, page, pageSize }}
   */
  fastify.get('/tags', async (req, reply) => {
    try {
      const {
        page = '1',
        pageSize = '25',
        search = '',
        userSubmitted = '',
      } = req.query as Record<string, string>
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
      if (userSubmitted === 'true') {
        where.isUserCreated = true
      } else if (userSubmitted === 'false') {
        where.isUserCreated = false
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

  /**
   * PATCH /tags/:id
   * Updates tag fields and/or upserts translations.
   * @param {string} id - Tag ID
   * @body {string} [slug] - URL slug
   * @body {string} [name] - Display name
   * @body {boolean} [isApproved] - Approval status
   * @body {boolean} [isHidden] - Hidden from search
   * @body {boolean} [isDeleted] - Soft-delete
   * @body {{ locale: string, name: string }[]} [translations] - Upsert translations
   * @returns {{ success, tag }}
   */
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

  /**
   * POST /tags/merge
   * Merges multiple "loser" tags into a single "winner" tag. Moves translations, profile
   * associations, and filter associations to the winner, then soft-deletes the losers.
   * @body {string} winnerTagId - Tag to keep
   * @body {string[]} loserTagIds - Tags to merge into the winner
   * @returns {{ success, mergedCount, tag }}
   */
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

        // 3. Soft-delete losers
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

  /**
   * POST /tags/translate
   * Translates a tag name into multiple languages using the DeepL API.
   * @body {string} text - Source text to translate
   * @body {string[]} targetLocales - Target language codes
   * @returns {{ success, translations: Record<string, string> }}
   */
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

  /**
   * GET /subscribers
   * Returns subscriber data for external newsletter sync (active profiles with email).
   * @returns {{ success, subscribers: { id, email, name, language, newsletterOptIn }[] }}
   */
  fastify.get('/subscribers', async (_req, reply) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          email: { not: null },
          profile: { isActive: true },
        },
        select: {
          id: true,
          email: true,
          language: true,
          newsletterOptIn: true,
          profile: { select: { publicName: true } },
        },
      })

      const subscribers = users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.profile?.publicName ?? '',
        language: u.language,
        newsletterOptIn: u.newsletterOptIn,
      }))

      return reply.code(200).send({ success: true, subscribers })
    } catch (err) {
      fastify.log.error({ err }, 'Error fetching subscribers')
      return sendError(reply, 500, 'Failed to fetch subscribers')
    }
  })

  /**
   * GET /profiles/:id
   * Returns detailed profile information including user data and images.
   * @param {string} id - Profile ID
   * @returns {{ success, profile }}
   */
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

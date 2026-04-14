import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { profileImageInclude } from '../db/includes/profileIncludes'
import { blocklistWhereClause } from '../db/includes/blocklistWhereClause'
import {
  POST_FTS_DICTIONARY,
  PROFILE_FTS_DICTIONARY_BY_LOCALE,
  profileFtsDictionary,
} from '../lib/fts'
import { TagService } from './tag.service'
import type { TagWithTranslations } from '@zod/tag/tag.db'
import type { DbProfileSummary } from '@zod/profile/profile.db'
import type { DbPostForSummary } from '../api/mappers/post.mappers'
import type { LocationDTO } from '@zod/dto/location.dto'
import {
  SEARCH_LOCATION_LIMIT,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_POST_LIMIT,
  SEARCH_PROFILE_LIMIT,
  SEARCH_TAG_LIMIT,
} from '@zod/search/search.dto'

export interface SearchResults {
  tags: TagWithTranslations[]
  profiles: DbProfileSummary[]
  posts: DbPostForSummary[]
  locations: LocationDTO[]
}

const EMPTY_RESULTS: SearchResults = {
  tags: [],
  profiles: [],
  posts: [],
  locations: [],
}

/**
 * Multi-kind search: fans out to tag, profile-FTS, post-FTS, and location
 * queries in parallel, then returns grouped results for an omnibox UI.
 */
export class SearchService {
  private static instance: SearchService

  private constructor() {}

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService()
    }
    return SearchService.instance
  }

  public async search(
    rawQuery: string,
    locale: string,
    myProfileId: string
  ): Promise<SearchResults> {
    const term = rawQuery.trim().replace(/\s+/g, ' ')
    if (term.length < SEARCH_MIN_QUERY_LENGTH) {
      return { ...EMPTY_RESULTS }
    }

    const [tags, profiles, posts, locations] = await Promise.all([
      this.searchTags(term, locale),
      this.searchProfiles(term, locale, myProfileId),
      this.searchPosts(term, myProfileId),
      this.searchLocations(term, myProfileId),
    ])

    return { tags, profiles, posts, locations }
  }

  // ── Tags ────────────────────────────────────────────────────────────
  private async searchTags(term: string, locale: string): Promise<TagWithTranslations[]> {
    return TagService.getInstance().search(term, locale, { limit: SEARCH_TAG_LIMIT })
  }

  // ── Profiles (FTS on LocalizedProfileField.tsv) ─────────────────────
  private async searchProfiles(
    term: string,
    locale: string,
    myProfileId: string
  ): Promise<DbProfileSummary[]> {
    // Rows whose locale is the session locale OR English are eligible —
    // mirrors the display fallback in `mapProfileToPublic`. We UNION one
    // subquery per locale, each using its matching dictionary so stemming
    // is correct per row.
    const sessionDict = profileFtsDictionary(locale)
    const englishDict = PROFILE_FTS_DICTIONARY_BY_LOCALE.en

    // If the session locale is English, session + en collapse to one branch.
    const branches: Array<{ locale: string; dict: string }> =
      locale === 'en'
        ? [{ locale: 'en', dict: englishDict }]
        : [
            { locale, dict: sessionDict },
            { locale: 'en', dict: englishDict },
          ]

    const unionSql = branches
      .map(
        (b, i) => `
          SELECT lpf."profileId" AS profile_id,
                 ts_rank(lpf."tsv", plainto_tsquery($${i * 2 + 2}::regconfig, $1)) AS rank
          FROM "LocalizedProfileField" lpf
          WHERE lpf."locale" = $${i * 2 + 3}
            AND lpf."tsv" @@ plainto_tsquery($${i * 2 + 2}::regconfig, $1)
        `
      )
      .join(' UNION ALL ')

    const params: unknown[] = [term]
    for (const branch of branches) {
      params.push(branch.dict, branch.locale)
    }

    // Aggregate (max rank per profile), then join Profile and apply the
    // same gating used elsewhere: active + onboarded + social-active, and
    // blocklist in either direction.
    const sql = `
      WITH matches AS (
        ${unionSql}
      )
      SELECT m.profile_id AS id, MAX(m.rank) AS rank
      FROM matches m
      JOIN "Profile" p ON p.id = m.profile_id
      WHERE p."isActive" = true
        AND p."isOnboarded" = true
        AND p."isSocialActive" = true
        AND NOT EXISTS (
          SELECT 1 FROM "_BlockedProfiles" bp
          WHERE (bp."A" = p.id AND bp."B" = $${params.length + 1})
             OR (bp."B" = p.id AND bp."A" = $${params.length + 1})
        )
      GROUP BY m.profile_id
      ORDER BY rank DESC
      LIMIT ${SEARCH_PROFILE_LIMIT}
    `
    params.push(myProfileId)

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; rank: number }>>(sql, ...params)

    if (rows.length === 0) return []

    const ids = rows.map((r) => r.id)
    const profiles = await prisma.profile.findMany({
      where: { id: { in: ids } },
      include: profileImageInclude(),
    })

    // Preserve rank order
    const byId = new Map(profiles.map((p) => [p.id, p]))
    return rows.map((r) => byId.get(r.id)).filter((p): p is (typeof profiles)[number] => Boolean(p))
  }

  // ── Posts (FTS on Post.tsv, 'simple' dictionary) ────────────────────
  private async searchPosts(term: string, myProfileId: string): Promise<DbPostForSummary[]> {
    const rows = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
      SELECT p.id,
             ts_rank(p."tsv", plainto_tsquery(${POST_FTS_DICTIONARY}::regconfig, ${term})) AS rank
      FROM "Post" p
      JOIN "Profile" pr ON pr.id = p."postedById"
      WHERE p."isVisible" = true
        AND p."isDeleted" = false
        AND p."tsv" @@ plainto_tsquery(${POST_FTS_DICTIONARY}::regconfig, ${term})
        AND pr."isActive" = true
        AND pr."isOnboarded" = true
        AND pr."isSocialActive" = true
        AND NOT EXISTS (
          SELECT 1 FROM "_BlockedProfiles" bp
          WHERE (bp."A" = pr.id AND bp."B" = ${myProfileId})
             OR (bp."B" = pr.id AND bp."A" = ${myProfileId})
        )
      ORDER BY rank DESC
      LIMIT ${Prisma.raw(String(SEARCH_POST_LIMIT))}
    `

    if (rows.length === 0) return []

    const ids = rows.map((r) => r.id)
    const posts = await prisma.post.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        type: true,
        content: true,
        postedBy: {
          select: {
            id: true,
            publicName: true,
            profileImages: {
              orderBy: { position: 'asc' },
              select: { storagePath: true },
            },
          },
        },
      },
    })

    const byId = new Map(posts.map((p) => [p.id, p]))
    return rows.map((r) => byId.get(r.id)).filter((p): p is (typeof posts)[number] => Boolean(p))
  }

  // ── Locations (distinct cities across Profile + Post) ───────────────
  private async searchLocations(term: string, myProfileId: string): Promise<LocationDTO[]> {
    const [profileRows, postRows] = await Promise.all([
      prisma.profile.findMany({
        where: {
          cityName: { contains: term, mode: 'insensitive' },
          isActive: true,
          isOnboarded: true,
          isSocialActive: true,
          ...blocklistWhereClause(myProfileId),
        },
        select: { cityName: true, country: true, lat: true, lon: true },
        take: 50,
      }),
      prisma.post.findMany({
        where: {
          cityName: { contains: term, mode: 'insensitive' },
          isVisible: true,
          isDeleted: false,
          postedBy: {
            is: {
              isActive: true,
              isOnboarded: true,
              isSocialActive: true,
              ...blocklistWhereClause(myProfileId),
            },
          },
        },
        select: { cityName: true, country: true, lat: true, lon: true },
        take: 50,
      }),
    ])

    const seen = new Set<string>()
    const out: LocationDTO[] = []
    for (const row of [...profileRows, ...postRows]) {
      const city = row.cityName ?? ''
      if (!city) continue
      const key = city.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        country: row.country ?? '',
        cityName: city,
        lat: row.lat ?? null,
        lon: row.lon ?? null,
      })
      if (out.length >= SEARCH_LOCATION_LIMIT) break
    }
    return out
  }
}

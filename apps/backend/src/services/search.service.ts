import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { profileImageInclude } from '../db/includes/profileIncludes'
import { TagService } from './tag.service'
import type { TagWithTranslations } from '@zod/tag/tag.db'
import type { DbProfileSummary } from '@zod/profile/profile.db'
import type { DbPostForSummary } from '../api/mappers/post.mappers'
import {
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_POST_LIMIT,
  SEARCH_PROFILE_LIMIT,
  SEARCH_TAG_LIMIT,
} from '@zod/search/search.dto'

export interface SearchResults {
  tags: TagWithTranslations[]
  profiles: DbProfileSummary[]
  posts: DbPostForSummary[]
}

/** Factory so callers never share array references with each other. */
function emptyResults(): SearchResults {
  return { tags: [], profiles: [], posts: [] }
}

/**
 * Escape LIKE metacharacters (`%`, `_`, `\`) so the user's raw query is
 * treated as a literal substring. The caller wraps the result in `%...%`
 * before passing it to ILIKE.
 */
function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * Multi-kind search: fans out to tag, profile trigram, post trigram, and
 * location queries in parallel, then returns grouped results for an
 * omnibox UI.
 *
 * Profile intro text and post content are indexed with pg_trgm GIN indexes
 * (see migrations/20260415000000_add_search_trgm_indexes). This gives fast,
 * language-agnostic substring matching — no per-locale dictionary
 * configuration is needed.
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
      return emptyResults()
    }

    const [tags, profiles, posts] = await Promise.all([
      this.searchTags(term, locale),
      this.searchProfiles(term, locale, myProfileId),
      this.searchPosts(term, myProfileId),
    ])

    return { tags, profiles, posts }
  }

  // ── Tags ────────────────────────────────────────────────────────────
  private async searchTags(term: string, locale: string): Promise<TagWithTranslations[]> {
    return TagService.getInstance().search(term, locale, { limit: SEARCH_TAG_LIMIT })
  }

  // ── Profiles (trigram substring on LocalizedProfileField.value) ─────
  private async searchProfiles(
    term: string,
    locale: string,
    myProfileId: string
  ): Promise<DbProfileSummary[]> {
    // Rows in the session locale OR English are eligible — mirrors the
    // display fallback in `mapProfileToPublic`. Trigram substring match
    // via pg_trgm GIN index; ranking uses `similarity()`.
    const pattern = `%${escapeLikePattern(term)}%`
    const localeFilter = locale === 'en' ? ['en'] : [locale, 'en']

    const rows = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
      SELECT lpf."profileId" AS id,
             MAX(similarity(lpf."value", ${term})) AS rank
      FROM "LocalizedProfileField" lpf
      JOIN "Profile" p ON p.id = lpf."profileId"
      WHERE lpf."locale" IN (${Prisma.join(localeFilter)})
        AND lpf."value" ILIKE ${pattern}
        AND p."isActive" = true
        AND p."isOnboarded" = true
        AND p."isSocialActive" = true
        AND NOT EXISTS (
          SELECT 1 FROM "_BlockedProfiles" bp
          WHERE (bp."A" = p.id AND bp."B" = ${myProfileId})
             OR (bp."B" = p.id AND bp."A" = ${myProfileId})
        )
      GROUP BY lpf."profileId"
      ORDER BY rank DESC
      LIMIT ${SEARCH_PROFILE_LIMIT}
    `

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

  // ── Posts (trigram substring on UserContent.content where kind=post) ──
  private async searchPosts(term: string, myProfileId: string): Promise<DbPostForSummary[]> {
    const pattern = `%${escapeLikePattern(term)}%`

    const rows = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
      SELECT p.id,
             similarity(p."content", ${term}) AS rank
      FROM "UserContent" p
      JOIN "Profile" pr ON pr.id = p."postedById"
      WHERE p."kind" = 'post'::"ContentKind"
        AND p."isVisible" = true
        AND p."isDeleted" = false
        AND p."content" ILIKE ${pattern}
        AND pr."isActive" = true
        AND pr."isOnboarded" = true
        AND pr."isSocialActive" = true
        AND NOT EXISTS (
          SELECT 1 FROM "_BlockedProfiles" bp
          WHERE (bp."A" = pr.id AND bp."B" = ${myProfileId})
             OR (bp."B" = pr.id AND bp."A" = ${myProfileId})
        )
      ORDER BY rank DESC
      LIMIT ${SEARCH_POST_LIMIT}
    `

    if (rows.length === 0) return []

    const ids = rows.map((r) => r.id)
    // `galleryImages` is loaded with the joined Image so downstream mappers
    // (toPublicImage) receive the full row — they need mimeType, altText,
    // position and blurhash, not just storagePath.
    const posts = await prisma.userContent.findMany({
      where: { id: { in: ids }, kind: 'post' },
      select: {
        id: true,
        kind: true,
        content: true,
        country: true,
        cityName: true,
        lat: true,
        lon: true,
        post: { select: { type: true } },
        postedBy: {
          select: {
            id: true,
            publicName: true,
            galleryImages: {
              include: { image: true },
              orderBy: { image: { position: 'asc' } },
            },
          },
        },
      },
    })

    const byId = new Map(posts.map((p) => [p.id, p]))
    return rows
      .map((r) => byId.get(r.id))
      .filter(
        (p): p is (typeof posts)[number] & { post: { type: DbPostForSummary['post']['type'] } } =>
          Boolean(p?.post)
      )
      .map((p) => ({
        id: p.id,
        kind: 'post' as const,
        content: p.content,
        country: p.country,
        cityName: p.cityName,
        lat: p.lat,
        lon: p.lon,
        postedBy: p.postedBy,
        post: { type: p.post.type },
      }))
  }
}

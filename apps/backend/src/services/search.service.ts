import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { profileImageInclude } from '../db/includes/profileIncludes'
import { TagService } from './tag.service'
import type { TagWithTranslations } from '@zod/tag/tag.db'
import type { DbProfileSummary } from '@zod/profile/profile.db'
import type {
  DbPostForSummary,
  DbEventForSummary,
  DbCommunityForSummary,
} from '../api/mappers/post.mappers'
import {
  SEARCH_COMMUNITY_LIMIT,
  SEARCH_EVENT_LIMIT,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_POST_LIMIT,
  SEARCH_PROFILE_LIMIT,
  SEARCH_TAG_LIMIT,
} from '@zod/search/search.dto'

export interface SearchResults {
  tags: TagWithTranslations[]
  profiles: DbProfileSummary[]
  posts: DbPostForSummary[]
  events: DbEventForSummary[]
  communities: DbCommunityForSummary[]
}

/** Factory so callers never share array references with each other. */
function emptyResults(): SearchResults {
  return { tags: [], profiles: [], posts: [], events: [], communities: [] }
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
 * Multi-kind search: fans out to tag, profile trigram, and UserContent
 * trigram queries (one per kind) in parallel, then returns grouped results
 * for an omnibox UI.
 *
 * Profile intro text and UserContent.content are indexed with pg_trgm GIN
 * indexes (see migrations/20260415000000_add_search_trgm_indexes). This
 * gives fast, language-agnostic substring matching — no per-locale
 * dictionary configuration is needed.
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

    const [tags, profiles, posts, events, communities] = await Promise.all([
      this.searchTags(term, locale),
      this.searchProfiles(term, locale, myProfileId),
      this.searchPosts(term, myProfileId),
      this.searchEvents(term, myProfileId),
      this.searchCommunities(term, myProfileId),
    ])

    return { tags, profiles, posts, events, communities }
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

  // ── UserContent search shared between post / event / community ──────
  /**
   * Trigram substring rank over `UserContent.content` for one ContentKind.
   * Filters apply uniformly across kinds: visible, non-deleted content
   * authored by an active, onboarded, social-active profile not in a
   * blocking relationship with the searcher.
   *
   * `Prisma.sql` interpolation is used for the kind literal because Prisma's
   * tagged template parameter substitution doesn't compose inside enum casts
   * — `${kind}::"ContentKind"` would be sent as a parameter, breaking the
   * cast. The kind value comes from a closed enum, not user input, so this
   * interpolation is safe.
   */
  private async searchUserContent(
    kind: 'post' | 'event' | 'community',
    limit: number,
    term: string,
    myProfileId: string
  ): Promise<Array<{ id: string; rank: number }>> {
    const pattern = `%${escapeLikePattern(term)}%`
    const kindLiteral = Prisma.sql([`'${kind}'::"ContentKind"`])

    return prisma.$queryRaw<Array<{ id: string; rank: number }>>`
      SELECT p.id,
             similarity(p."content", ${term}) AS rank
      FROM "UserContent" p
      JOIN "Profile" pr ON pr.id = p."postedById"
      WHERE p."kind" = ${kindLiteral}
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
      LIMIT ${limit}
    `
  }

  // ── Posts ───────────────────────────────────────────────────────────
  private async searchPosts(term: string, myProfileId: string): Promise<DbPostForSummary[]> {
    const rows = await this.searchUserContent('post', SEARCH_POST_LIMIT, term, myProfileId)
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.id)
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
            profileImages: {
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

  // ── Events ──────────────────────────────────────────────────────────
  private async searchEvents(term: string, myProfileId: string): Promise<DbEventForSummary[]> {
    const rows = await this.searchUserContent('event', SEARCH_EVENT_LIMIT, term, myProfileId)
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.id)
    const events = await prisma.userContent.findMany({
      where: { id: { in: ids }, kind: 'event' },
      select: {
        id: true,
        kind: true,
        content: true,
        country: true,
        cityName: true,
        lat: true,
        lon: true,
        event: { select: { startsAt: true } },
        postedBy: {
          select: {
            id: true,
            publicName: true,
            profileImages: {
              include: { image: true },
              orderBy: { image: { position: 'asc' } },
            },
          },
        },
      },
    })

    const byId = new Map(events.map((e) => [e.id, e]))
    return rows
      .map((r) => byId.get(r.id))
      .filter((e): e is (typeof events)[number] & { event: { startsAt: Date } } =>
        Boolean(e?.event)
      )
      .map((e) => ({
        id: e.id,
        kind: 'event' as const,
        content: e.content,
        country: e.country,
        cityName: e.cityName,
        lat: e.lat,
        lon: e.lon,
        postedBy: e.postedBy,
        event: { startsAt: e.event.startsAt },
      }))
  }

  // ── Communities ─────────────────────────────────────────────────────
  private async searchCommunities(
    term: string,
    myProfileId: string
  ): Promise<DbCommunityForSummary[]> {
    const rows = await this.searchUserContent(
      'community',
      SEARCH_COMMUNITY_LIMIT,
      term,
      myProfileId
    )
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.id)
    const communities = await prisma.userContent.findMany({
      where: { id: { in: ids }, kind: 'community' },
      select: {
        id: true,
        kind: true,
        content: true,
        country: true,
        cityName: true,
        lat: true,
        lon: true,
        community: { select: { yearFounded: true } },
        postedBy: {
          select: {
            id: true,
            publicName: true,
            profileImages: {
              include: { image: true },
              orderBy: { image: { position: 'asc' } },
            },
          },
        },
      },
    })

    const byId = new Map(communities.map((c) => [c.id, c]))
    return rows
      .map((r) => byId.get(r.id))
      .filter(
        (c): c is (typeof communities)[number] & { community: { yearFounded: number | null } } =>
          Boolean(c?.community)
      )
      .map((c) => ({
        id: c.id,
        kind: 'community' as const,
        content: c.content,
        country: c.country,
        cityName: c.cityName,
        lat: c.lat,
        lon: c.lon,
        postedBy: c.postedBy,
        community: { yearFounded: c.community.yearFounded },
      }))
  }
}

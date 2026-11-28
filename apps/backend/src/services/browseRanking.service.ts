import type { ActivitySegment } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { haversineKm, type UserContentKind } from '@shared/maps'

/**
 * Ordering of the browse grid (GET /find/list). See
 * docs/design/browse-grid-ranking-spec.md. Only the list uses this; the map
 * clusters are unaffected.
 *
 *   score = W_ACT · activity + W_DIST · proximity + W_MATCH · match + W_RAND · jitter
 *
 * Activity data never leaves the server: it only decides the order.
 */
export const W_ACT = 0.35
export const W_DIST = 0.3
export const W_MATCH = 0.15
export const W_RAND = 0.2

/** Distance (km) at which proximity drops to one half. */
export const PROXIMITY_HALF_KM = 25

/** Dormant stays above 0 so a very close dormant profile can still rank well. */
export const ACTIVITY_WEIGHT: Record<ActivitySegment, number> = {
  frequent: 1.0,
  new: 0.8,
  returning: 0.7,
  dormant: 0.1,
}

/** Per-item ranking inputs. */
export interface RankInput {
  /** Profiles without an activity summary row count as dormant. */
  segment: ActivitySegment
  /** Distance from the viewer's home. */
  distanceKm: number
}

export interface RankableRef {
  id: string
  /** A potential dating match of the viewer. */
  highlighted: boolean
}

export function proximity(distanceKm: number): number {
  return 1 / (1 + distanceKm / PROXIMITY_HALF_KM)
}

/** FNV-1a 32-bit hash. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Deterministic value in [0, 1) for (seed, id). */
export function jitter(seed: string, id: string): number {
  return fnv1a(`${seed}:${id}`) / 0x100000000
}

export function rankScore(input: RankInput, highlighted: boolean, jitterValue: number): number {
  return (
    W_ACT * ACTIVITY_WEIGHT[input.segment] +
    W_DIST * proximity(input.distanceKm) +
    W_MATCH * (highlighted ? 1 : 0) +
    W_RAND * jitterValue
  )
}

/**
 * Sorts refs by descending score, with id as the final tie-break so the order
 * is total. The same seed always gives the same order. Every ref must have an
 * entry in `inputs`.
 */
export function rankListRefs<T extends RankableRef>(
  refs: T[],
  inputs: Map<string, RankInput>,
  seed: string
): T[] {
  const scored = refs.map((ref) => {
    const input = inputs.get(ref.id)
    if (!input) throw new Error(`browse ranking: no rank input for ${ref.id}`)
    return { ref, score: rankScore(input, ref.highlighted, jitter(seed, ref.id)) }
  })
  scored.sort((a, b) => b.score - a.score || a.ref.id.localeCompare(b.ref.id))
  return scored.map((s) => s.ref)
}

export interface RankablePoint {
  kind: UserContentKind
  id: string
  lat: number
  lon: number
}

/**
 * Loads the rank inputs for `points`: each profile's activity segment (a
 * content item takes its poster's) and its distance from the viewer's home.
 */
export async function loadRankInputs(
  viewerId: string,
  points: RankablePoint[]
): Promise<Map<string, RankInput>> {
  const profileIds = points.filter((p) => p.kind === 'profile').map((p) => p.id)
  const contentIds = points.filter((p) => p.kind !== 'profile').map((p) => p.id)

  const [viewer, profiles, contents] = await Promise.all([
    prisma.profile.findUnique({ where: { id: viewerId }, select: { lat: true, lon: true } }),
    profileIds.length
      ? prisma.profile.findMany({
          where: { id: { in: profileIds } },
          select: { id: true, activitySummary: { select: { segment: true } } },
        })
      : Promise.resolve([]),
    contentIds.length
      ? prisma.userContent.findMany({
          where: { id: { in: contentIds } },
          select: {
            id: true,
            postedBy: { select: { activitySummary: { select: { segment: true } } } },
          },
        })
      : Promise.resolve([]),
  ])

  // /find/list requires social mode, and every social profile has a location.
  if (viewer?.lat == null || viewer?.lon == null) {
    throw new Error(`browse ranking: viewer ${viewerId} has no home location`)
  }
  const home = { lat: viewer.lat, lon: viewer.lon }

  const segments = new Map<string, ActivitySegment>()
  for (const p of profiles) segments.set(p.id, p.activitySummary?.segment ?? 'dormant')
  for (const c of contents) segments.set(c.id, c.postedBy?.activitySummary?.segment ?? 'dormant')

  const inputs = new Map<string, RankInput>()
  for (const p of points) {
    inputs.set(p.id, {
      segment: segments.get(p.id) ?? 'dormant',
      distanceKm: haversineKm(home, { lat: p.lat, lon: p.lon }),
    })
  }
  return inputs
}

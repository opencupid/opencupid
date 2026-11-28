import { ClusterService } from './cluster.service'
import { loadRankInputs, rankListRefs, type RankInput } from './browseRanking.service'
import type { UserContentKind } from '@shared/maps'

/** A located item in the browse list, before hydration. */
export interface ListRef {
  kind: UserContentKind
  id: string
  /** Distance from the viewer's home; null when the viewer has no home location. */
  distanceKm: number | null
  /** A potential dating match of the viewer (the map pin's halo). */
  highlighted: boolean
}

/** Matches ClusterService's index lifetime. */
const CACHE_TTL_MS = 30 * 60 * 1000
const CACHE_MAX_SIZE = 200

interface CachedInputs {
  /** The cluster index build these inputs belong to. */
  indexVersion: string
  inputs: Map<string, RankInput>
  createdAt: number
}

/**
 * Pages the browse grid (GET /find/list): the points ClusterService has
 * inside the viewport, minus the viewer's own card, ranked by browseRanking.
 *
 * The shuffle is seeded by the client (one seed per visit), so the order stays
 * put across pages even when the cluster index is rebuilt mid-scroll.
 *
 * Rank inputs are cached per viewer for their current index build, and
 * loaded only for points not seen yet (panning brings in new ones). A rebuilt
 * index (TTL, a profile change, new content) replaces the viewer's entry, so
 * changed segments and a moved home are picked up.
 */
export class BrowseListService {
  private cache = new Map<string, CachedInputs>()
  private static instance: BrowseListService

  private constructor() {}

  static getInstance(): BrowseListService {
    if (!BrowseListService.instance) {
      BrowseListService.instance = new BrowseListService()
    }
    return BrowseListService.instance
  }

  async getList(
    viewerId: string,
    bbox: [number, number, number, number],
    tagIds: string[],
    kinds: UserContentKind[],
    page: { limit: number; offset: number },
    seed: string
  ): Promise<{ refs: ListRef[]; total: number }> {
    const { points: inBounds, indexVersion } =
      await ClusterService.getInstance().getOrBuildPointsInBounds(viewerId, bbox, tagIds, kinds)
    // The index keeps the viewer's own pin for the map; the grid lists other people.
    const points = inBounds.filter((p) => !(p.kind === 'profile' && p.id === viewerId))

    this.prune()
    let entry = this.cache.get(viewerId)
    if (!entry || entry.indexVersion !== indexVersion) {
      entry = { indexVersion, inputs: new Map(), createdAt: Date.now() }
      this.cache.delete(viewerId)
      this.cache.set(viewerId, entry)
    }
    const missing = points.filter((p) => !entry.inputs.has(p.id))
    if (missing.length) {
      for (const [id, input] of await loadRankInputs(viewerId, missing)) {
        entry.inputs.set(id, input)
      }
    }

    const refs: ListRef[] = points.map((p) => ({
      kind: p.kind,
      id: p.id,
      distanceKm: entry.inputs.get(p.id)!.distanceKm,
      highlighted: p.highlighted,
    }))
    const ranked = rankListRefs(refs, entry.inputs, seed)

    return {
      refs: ranked.slice(page.offset, page.offset + page.limit),
      total: ranked.length,
    }
  }

  private prune(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > CACHE_TTL_MS) this.cache.delete(key)
    }
    // Map iteration is insertion order, so the first keys are the oldest.
    for (const key of this.cache.keys()) {
      if (this.cache.size <= CACHE_MAX_SIZE) break
      this.cache.delete(key)
    }
  }
}

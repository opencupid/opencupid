import { ClusterService } from './cluster.service'
import { loadRankInputs, rankListRefs, type RankInput } from './browseRanking.service'
import type { UserContentKind } from '@shared/maps'

/** A located item in the browse list, before hydration. */
export interface ListRef {
  kind: UserContentKind
  id: string
  /** Distance from the viewer's home. */
  distanceKm: number
  /** A potential dating match of the viewer (the map pin's halo). */
  highlighted: boolean
}

/** Matches ClusterService's index lifetime; entries for rebuilt indexes go unused. */
const CACHE_TTL_MS = 30 * 60 * 1000
const CACHE_MAX_SIZE = 200

interface CachedInputs {
  inputs: Map<string, RankInput>
  createdAt: number
}

/**
 * Pages the browse grid (GET /find/list): the points ClusterService has
 * inside the viewport, ranked by browseRanking.
 *
 * The shuffle is seeded with the cluster index version, so the order stays put
 * while the viewer pages through one index build and changes when the index
 * is rebuilt. Rank inputs are cached per index version for the same reason,
 * and loaded only for points not seen yet (panning brings in new ones).
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
    page: { limit: number; offset: number }
  ): Promise<{ refs: ListRef[]; total: number }> {
    const { points, indexVersion } = await ClusterService.getInstance().getOrBuildPointsInBounds(
      viewerId,
      bbox,
      tagIds,
      kinds
    )

    this.prune()
    let entry = this.cache.get(indexVersion)
    if (!entry) {
      entry = { inputs: new Map(), createdAt: Date.now() }
      this.cache.set(indexVersion, entry)
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
    const ranked = rankListRefs(refs, entry.inputs, indexVersion)

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

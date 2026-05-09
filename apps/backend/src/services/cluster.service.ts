import Supercluster from 'supercluster'
import type { Feature, Point } from 'geojson'
import { ProfileMatchService } from './profileMatch.service'
import { UserContentService } from './userContent.service'
import { ImageService } from './image.service'
import type { ClusterFeature, PointFeature, MapFeature } from '@shared/zod/map/cluster.dto'
import type { TagWithTranslations } from '@shared/zod/tag/tag.db'
import { MAP_MAX_ZOOM, type UserContentKind } from '@shared/maps'
import type { ContentKind } from '@shared/zod/userContent/userContent.dto'
const CLUSTER_RADIUS = 40
const INDEX_TTL_MS = 30 * 60 * 1000 // 30 minutes
const INDEX_MAX_SIZE = 200

interface PointProperties {
  kind: 'profile' | 'post' | 'event'
  id: string
  publicName: string
  image: { blurhash?: string | null; url?: string } | null
  highlighted: boolean
  hasPost?: boolean
  postContent?: string
}

interface CachedIndex {
  index: Supercluster<PointProperties, Supercluster.AnyProps>
  tags: TagWithTranslations[]
  updatedAt: Date
}

/**
 * Deterministic cache key from profileId, tag selection, and layer kinds.
 * Sorting both arrays guarantees the same set always produces the same key.
 * The `|kinds` segment uses a different separator than `:tags` so the two
 * segments never collide.
 */
function buildCacheKey(profileId: string, tagIds: string[], kinds: UserContentKind[]): string {
  const tagPart = tagIds.length === 0 ? '' : `:${[...tagIds].sort().join(',')}`
  const kindPart = `|${[...kinds].sort().join(',')}`
  return `${profileId}${tagPart}${kindPart}`
}

export class ClusterService {
  private indexes = new Map<string, CachedIndex>()
  private static instance: ClusterService

  private constructor() {}

  static getInstance(): ClusterService {
    if (!ClusterService.instance) {
      ClusterService.instance = new ClusterService()
    }
    return ClusterService.instance
  }

  async buildIndex(profileId: string, tagIds: string[], kinds: UserContentKind[]): Promise<void> {
    const profileMatchService = ProfileMatchService.getInstance()
    const userContentService = UserContentService.getInstance()

    const wantProfiles = kinds.includes('profile')
    const contentKinds = kinds.filter((k): k is ContentKind => k !== 'profile')
    const wantContent = contentKinds.length > 0

    const [profiles, matchIds, contentRows] = await Promise.all([
      wantProfiles
        ? profileMatchService.findSocialProfilesWithLocation(profileId, tagIds)
        : Promise.resolve(
            [] as Awaited<ReturnType<typeof profileMatchService.findSocialProfilesWithLocation>>
          ),
      wantProfiles
        ? profileMatchService.findMutualMatchIds(profileId)
        : Promise.resolve([] as string[]),
      wantContent
        ? userContentService.findAllWithLocation(profileId, contentKinds)
        : Promise.resolve([] as Awaited<ReturnType<typeof userContentService.findAllWithLocation>>),
    ])

    const matchSet = new Set(matchIds)
    const imageService = ImageService.getInstance()

    const profileFeatures: Feature<Point, PointProperties>[] = profiles
      .filter((p) => p.lat != null && p.lon != null)
      .map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lon!, p.lat!],
        },
        properties: {
          kind: 'profile' as const,
          id: p.id,
          publicName: p.publicName ?? '',
          image: p.profileImages?.[0]
            ? {
                blurhash: p.profileImages[0].blurhash ?? null,
                url: imageService.getImageUrls(p.profileImages[0]).find((v) => v.size === 'thumb')
                  ?.url,
              }
            : null,
          highlighted: matchSet.has(p.id),
        },
      }))

    const profileIndexById = new Map<string, number>()
    profileFeatures.forEach((f, i) => profileIndexById.set(f.properties.id, i))

    const postFeatures: Feature<Point, PointProperties>[] = []
    for (const c of contentRows) {
      if (c.lat == null || c.lon == null) continue

      // For posts only: dedup against poster's profile pin
      if (c.kind === 'post') {
        const profileIdx = profileIndexById.get(c.postedById)
        if (profileIdx !== undefined && c.postedBy?.lat === c.lat && c.postedBy?.lon === c.lon) {
          profileFeatures[profileIdx].properties.hasPost = true
          continue
        }
      }

      postFeatures.push({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [c.lon!, c.lat!],
        },
        properties: {
          kind: c.kind,
          id: c.id,
          publicName: c.postedBy?.publicName ?? '',
          image: c.postedBy?.profileImages?.[0]
            ? {
                blurhash: c.postedBy.profileImages[0].blurhash ?? null,
                url: imageService
                  .getImageUrls(c.postedBy.profileImages[0])
                  .find((v) => v.size === 'thumb')?.url,
              }
            : null,
          highlighted: false,
          postContent: c.content?.substring(0, 50),
        },
      })
    }

    // Collect unique tags from profiles (raw, translated at request time)
    const tagMap = new Map<string, TagWithTranslations>()
    for (const profile of profiles) {
      for (const tag of profile.tags ?? []) {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag as TagWithTranslations)
        }
      }
    }

    const index = new Supercluster<PointProperties, Supercluster.AnyProps>({
      radius: CLUSTER_RADIUS,
      maxZoom: MAP_MAX_ZOOM - 1,
      minPoints: 2,
    })

    index.load([...profileFeatures, ...postFeatures])
    this.indexes.set(buildCacheKey(profileId, tagIds, kinds), {
      index,
      tags: Array.from(tagMap.values()),
      updatedAt: new Date(),
    })
  }

  getClusters(
    profileId: string,
    bbox: [number, number, number, number],
    zoom: number,
    tagIds: string[],
    kinds: UserContentKind[]
  ): { features: MapFeature[]; tags: TagWithTranslations[] } {
    const key = buildCacheKey(profileId, tagIds, kinds)
    const cached = this.indexes.get(key)
    if (!cached) return { features: [], tags: [] }

    const raw = cached.index.getClusters(bbox, Math.round(zoom))
    return {
      features: raw.map((f) => this.mapFeature(f, key)),
      tags: cached.tags,
    }
  }

  async getOrBuildClusters(
    profileId: string,
    bbox: [number, number, number, number],
    zoom: number,
    tagIds: string[],
    kinds: UserContentKind[]
  ): Promise<{ features: MapFeature[]; tags: TagWithTranslations[] }> {
    this.pruneIndexes()
    const key = buildCacheKey(profileId, tagIds, kinds)
    if (!this.indexes.has(key)) {
      await this.buildIndex(profileId, tagIds, kinds)
    }
    return this.getClusters(profileId, bbox, zoom, tagIds, kinds)
  }

  getExpansionZoom(
    profileId: string,
    clusterId: number,
    tagIds: string[],
    kinds: UserContentKind[]
  ): number {
    const cached = this.indexes.get(buildCacheKey(profileId, tagIds, kinds))
    if (!cached) return MAP_MAX_ZOOM
    return cached.index.getClusterExpansionZoom(clusterId)
  }

  getLeaves(
    profileId: string,
    clusterId: number,
    tagIds: string[],
    kinds: UserContentKind[]
  ): PointFeature[] {
    const cacheKey = buildCacheKey(profileId, tagIds, kinds)
    const cached = this.indexes.get(cacheKey)
    if (!cached) return []

    return cached.index
      .getLeaves(clusterId, Infinity, 0)
      .map((f) => this.mapFeature(f, cacheKey) as PointFeature)
  }

  /**
   * Evicts all cached indexes for a profile, regardless of their tag-filter
   * variants. Called when the user's underlying data changes (block, dating
   * prefs updated) so stale clusters are rebuilt on the next query.
   */
  evict(profileId: string): void {
    for (const key of this.indexes.keys()) {
      if (key === profileId || key.startsWith(`${profileId}:`) || key.startsWith(`${profileId}|`)) {
        this.indexes.delete(key)
      }
    }
  }

  /**
   * Evicts the entire cluster cache. Called when data visible to all viewers
   * changes (e.g. a new post is created).
   */
  evictAll(): void {
    this.indexes.clear()
  }

  hasIndex(profileId: string, tagIds: string[], kinds: UserContentKind[]): boolean {
    return this.indexes.has(buildCacheKey(profileId, tagIds, kinds))
  }

  private pruneIndexes(): void {
    const now = Date.now()

    // Evict expired entries
    for (const [id, cached] of this.indexes) {
      if (now - cached.updatedAt.getTime() > INDEX_TTL_MS) {
        this.indexes.delete(id)
      }
    }

    // Enforce size cap by evicting oldest entries
    if (this.indexes.size > INDEX_MAX_SIZE) {
      const sorted = [...this.indexes.entries()].sort(
        (a, b) => a[1].updatedAt.getTime() - b[1].updatedAt.getTime()
      )
      const excess = this.indexes.size - INDEX_MAX_SIZE
      for (let i = 0; i < excess; i++) {
        this.indexes.delete(sorted[i][0])
      }
    }
  }

  private mapFeature(
    f:
      | Supercluster.ClusterFeature<Supercluster.AnyProps>
      | Supercluster.PointFeature<PointProperties>,
    cacheKey: string
  ): MapFeature {
    const p = f.properties as Record<string, unknown>
    if ('cluster' in p && p.cluster) {
      const clusterId = p.cluster_id as number
      return {
        type: 'cluster',
        id: clusterId,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        count: p.point_count as number,
        expansionZoom: Math.min(
          this.indexes.get(cacheKey)!.index.getClusterExpansionZoom(clusterId),
          MAP_MAX_ZOOM
        ),
      } satisfies ClusterFeature
    }

    const props = f.properties as PointProperties
    return {
      type: 'point',
      kind: props.kind,
      id: props.id,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      publicName: props.publicName,
      image: props.image,
      highlighted: props.highlighted,
      ...(props.hasPost ? { hasPost: true } : {}),
      ...(props.kind === 'post' || props.kind === 'event'
        ? { postContent: props.postContent }
        : {}),
    } satisfies PointFeature
  }
}

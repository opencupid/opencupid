import Supercluster from 'supercluster'
import type { Feature, Point } from 'geojson'
import type { PrismaClient } from '@prisma/client'
import { ProfileMatchService } from './profileMatch.service'
import { PostService } from './post.service'
import { ImageService } from './image.service'
import type { ClusterFeature, PointFeature, MapFeature } from '@shared/zod/map/cluster.dto'
import type { TagWithTranslations } from '@shared/zod/tag/tag.db'
import { MAP_MAX_ZOOM } from '@shared/maps'
const CLUSTER_RADIUS = 40
const INDEX_TTL_MS = 30 * 60 * 1000 // 30 minutes
const INDEX_MAX_SIZE = 200

interface PointProperties {
  kind: 'profile' | 'post'
  id: string
  publicName: string
  image: { blurhash?: string | null; url?: string } | null
  highlighted: boolean
  postContent?: string
  postType?: string
}

interface CachedIndex {
  index: Supercluster<PointProperties, Supercluster.AnyProps>
  tags: TagWithTranslations[]
  updatedAt: Date
}

/**
 * Builds a deterministic cache key from profileId and the current tag
 * filter selection. Sorting guarantees the same set of IDs always produces
 * the same key regardless of the order they were selected.
 */
function buildCacheKey(profileId: string, tagIds: string[]): string {
  if (tagIds.length === 0) return profileId
  return `${profileId}:${[...tagIds].sort().join(',')}`
}

export class ClusterService {
  private indexes = new Map<string, CachedIndex>()
  private static instance: ClusterService
  private prisma: PrismaClient | null = null

  static getInstance(prisma?: PrismaClient): ClusterService {
    if (!ClusterService.instance) {
      ClusterService.instance = new ClusterService()
    }
    if (prisma && !ClusterService.instance.prisma) {
      ClusterService.instance.prisma = prisma
    }
    return ClusterService.instance
  }

  async buildIndex(profileId: string, tagIds: string[] = []): Promise<void> {
    const profileMatchService = ProfileMatchService.getInstance()
    const postService = PostService.getInstance()

    const [profiles, matchIds, posts] = await Promise.all([
      profileMatchService.findSocialProfilesWithLocation(profileId, tagIds),
      profileMatchService.findMutualMatchIds(profileId),
      postService.findAllWithLocation(),
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

    const postFeatures: Feature<Point, PointProperties>[] = posts
      .filter((p) => p.lat != null && p.lon != null)
      .map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lon!, p.lat!],
        },
        properties: {
          kind: 'post' as const,
          id: p.id,
          publicName: p.postedBy?.publicName ?? '',
          image: p.postedBy?.profileImages?.[0]
            ? {
                blurhash: p.postedBy.profileImages[0].blurhash ?? null,
                url: imageService
                  .getImageUrls(p.postedBy.profileImages[0])
                  .find((v) => v.size === 'thumb')?.url,
              }
            : null,
          highlighted: false,
          postContent: p.content?.substring(0, 50),
          postType: p.type,
        },
      }))

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
    this.indexes.set(buildCacheKey(profileId, tagIds), {
      index,
      tags: Array.from(tagMap.values()),
      updatedAt: new Date(),
    })
  }

  getClusters(
    profileId: string,
    bbox: [number, number, number, number],
    zoom: number,
    tagIds: string[] = []
  ): { features: MapFeature[]; tags: TagWithTranslations[] } {
    const key = buildCacheKey(profileId, tagIds)
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
    tagIds: string[] = []
  ): Promise<{ features: MapFeature[]; tags: TagWithTranslations[] }> {
    this.pruneIndexes()
    const key = buildCacheKey(profileId, tagIds)
    if (!this.indexes.has(key)) {
      await this.buildIndex(profileId, tagIds)
    }
    return this.getClusters(profileId, bbox, zoom, tagIds)
  }

  getExpansionZoom(profileId: string, clusterId: number, tagIds: string[] = []): number {
    const cached = this.indexes.get(buildCacheKey(profileId, tagIds))
    if (!cached) return MAP_MAX_ZOOM
    return cached.index.getClusterExpansionZoom(clusterId)
  }

  getLeaves(profileId: string, clusterId: number, tagIds: string[] = []): PointFeature[] {
    const cached = this.indexes.get(buildCacheKey(profileId, tagIds))
    if (!cached) return []

    const leaves = cached.index.getLeaves(clusterId, Infinity, 0)
    return leaves.map((f) => ({
      type: 'point' as const,
      kind: f.properties.kind,
      id: f.properties.id,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      publicName: f.properties.publicName,
      image: f.properties.image,
      highlighted: f.properties.highlighted,
      ...(f.properties.kind === 'post'
        ? { postContent: f.properties.postContent, postType: f.properties.postType }
        : {}),
    }))
  }

  /**
   * Evicts all cached indexes for a profile, regardless of their tag-filter
   * variants. Called when the user's underlying data changes (block, dating
   * prefs updated) so stale clusters are rebuilt on the next query.
   */
  evict(profileId: string): void {
    for (const key of this.indexes.keys()) {
      if (key === profileId || key.startsWith(`${profileId}:`)) {
        this.indexes.delete(key)
      }
    }
  }

  hasIndex(profileId: string, tagIds: string[] = []): boolean {
    return this.indexes.has(buildCacheKey(profileId, tagIds))
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
      ...(props.kind === 'post'
        ? { postContent: props.postContent, postType: props.postType }
        : {}),
    } satisfies PointFeature
  }
}

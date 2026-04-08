import Supercluster from 'supercluster'
import type { Feature, Point } from 'geojson'
import { ProfileMatchService } from './profileMatch.service'
import { ImageService } from './image.service'
import type { ClusterFeature, PointFeature, MapFeature } from '@shared/zod/map/cluster.dto'
import { MAP_MAX_ZOOM } from '@shared/maps'
const CLUSTER_RADIUS = 40
const INDEX_TTL_MS = 30 * 60 * 1000 // 30 minutes
const INDEX_MAX_SIZE = 200

interface PointProperties {
  id: string
  publicName: string
  image: { blurhash?: string | null; url?: string } | null
  highlighted: boolean
}

interface CachedIndex {
  index: Supercluster<PointProperties, Supercluster.AnyProps>
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

  static getInstance(): ClusterService {
    if (!ClusterService.instance) {
      ClusterService.instance = new ClusterService()
    }
    return ClusterService.instance
  }

  async buildIndex(profileId: string, tagIds: string[] = []): Promise<void> {
    const profileMatchService = ProfileMatchService.getInstance()

    const [profiles, matchIds] = await Promise.all([
      profileMatchService.findSocialProfilesWithLocation(profileId, tagIds),
      profileMatchService.findMutualMatchIds(profileId),
    ])

    const matchSet = new Set(matchIds)

    const features: Feature<Point, PointProperties>[] = profiles
      .filter((p) => p.lat != null && p.lon != null)
      .map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lon!, p.lat!],
        },
        properties: {
          id: p.id,
          publicName: p.publicName ?? '',
          image: p.profileImages?.[0]
            ? {
                blurhash: p.profileImages[0].blurhash ?? null,
                url: ImageService.getInstance()
                  .getImageUrls(p.profileImages[0])
                  .find((v) => v.size === 'thumb')?.url,
              }
            : null,
          highlighted: matchSet.has(p.id),
        },
      }))

    const index = new Supercluster<PointProperties, Supercluster.AnyProps>({
      radius: CLUSTER_RADIUS,
      maxZoom: MAP_MAX_ZOOM - 1,
      minPoints: 2,
    })

    index.load(features)
    this.indexes.set(buildCacheKey(profileId, tagIds), { index, updatedAt: new Date() })
  }

  getClusters(
    profileId: string,
    bbox: [number, number, number, number],
    zoom: number,
    tagIds: string[] = []
  ): MapFeature[] {
    const key = buildCacheKey(profileId, tagIds)
    const cached = this.indexes.get(key)
    if (!cached) return []

    const raw = cached.index.getClusters(bbox, Math.round(zoom))
    return raw.map((f) => this.mapFeature(f, key))
  }

  async getOrBuildClusters(
    profileId: string,
    bbox: [number, number, number, number],
    zoom: number,
    tagIds: string[] = []
  ): Promise<MapFeature[]> {
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
      id: f.properties.id,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      publicName: f.properties.publicName,
      image: f.properties.image,
      highlighted: f.properties.highlighted,
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
      id: props.id,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      publicName: props.publicName,
      image: props.image,
      highlighted: props.highlighted,
    } satisfies PointFeature
  }
}

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

export class ClusterService {
  private indexes = new Map<string, CachedIndex>()
  private static instance: ClusterService

  static getInstance(): ClusterService {
    if (!ClusterService.instance) {
      ClusterService.instance = new ClusterService()
    }
    return ClusterService.instance
  }

  async buildIndex(profileId: string): Promise<void> {
    const profileMatchService = ProfileMatchService.getInstance()

    const [profiles, matchIds] = await Promise.all([
      profileMatchService.findSocialProfilesWithLocation(profileId, undefined),
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
    this.indexes.set(profileId, { index, updatedAt: new Date() })
  }

  getClusters(
    profileId: string,
    bbox: [number, number, number, number],
    zoom: number
  ): MapFeature[] {
    const cached = this.indexes.get(profileId)
    if (!cached) return []

    const raw = cached.index.getClusters(bbox, Math.round(zoom))
    return raw.map((f) => this.mapFeature(f, profileId))
  }

  async getOrBuildClusters(
    profileId: string,
    bbox: [number, number, number, number],
    zoom: number
  ): Promise<MapFeature[]> {
    this.pruneIndexes()
    if (!this.indexes.has(profileId)) {
      await this.buildIndex(profileId)
    }
    return this.getClusters(profileId, bbox, zoom)
  }

  getExpansionZoom(profileId: string, clusterId: number): number {
    const cached = this.indexes.get(profileId)
    if (!cached) return MAP_MAX_ZOOM
    return cached.index.getClusterExpansionZoom(clusterId)
  }

  getLeaves(profileId: string, clusterId: number): PointFeature[] {
    const cached = this.indexes.get(profileId)
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

  evict(profileId: string): void {
    this.indexes.delete(profileId)
  }

  hasIndex(profileId: string): boolean {
    return this.indexes.has(profileId)
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
    _profileId: string
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
          this.indexes.get(_profileId)!.index.getClusterExpansionZoom(clusterId),
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

import Supercluster from 'supercluster'
import type { Feature, Point, GeoJsonProperties } from 'geojson'
import { prisma } from '../lib/prisma'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { profileImageInclude, tagsInclude } from '@/db/includes/profileIncludes'
import type { DbProfileWithImages } from '@zod/profile/profile.db'
import type { SocialMatchFilterWithTags } from '@zod/match/filters.dto'

interface ProfilePointProps {
  profileId: string
}

type ProfileFeature = Feature<Point, ProfilePointProps>

export interface MapClusterItem {
  cluster: true
  clusterId: number
  count: number
  lat: number
  lon: number
  expansionZoom: number
}

export interface MapPointItem {
  cluster: false
  profileId: string
  lat: number
  lon: number
}

export type MapClusterResult = MapClusterItem | MapPointItem

const statusFlags = {
  isActive: true,
  isOnboarded: true,
}

export class MapClusterService {
  private static instance: MapClusterService
  private index: Supercluster<ProfilePointProps> | null = null
  private profileIds = new Set<string>()
  private lastBuildTime = 0

  /** How long to keep the global index before rebuilding (ms). */
  private static readonly INDEX_TTL_MS = 60_000

  private constructor() {}

  static getInstance(): MapClusterService {
    if (!MapClusterService.instance) {
      MapClusterService.instance = new MapClusterService()
    }
    return MapClusterService.instance
  }

  /**
   * Build (or re-build) the global Supercluster index from all social-active
   * profiles that have a location. The index is shared across users; per-user
   * filtering (blocklist, tag prefs) is applied as a post-filter on results.
   */
  async ensureIndex(): Promise<void> {
    if (this.index && Date.now() - this.lastBuildTime < MapClusterService.INDEX_TTL_MS) {
      return
    }
    await this.rebuildIndex()
  }

  async rebuildIndex(): Promise<void> {
    const profiles = await prisma.profile.findMany({
      where: {
        ...statusFlags,
        isSocialActive: true,
        lat: { not: null },
        lon: { not: null },
      },
      select: {
        id: true,
        lat: true,
        lon: true,
      },
    })

    const features: ProfileFeature[] = profiles.map(
      (p: { id: string; lat: number | null; lon: number | null }) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lon!, p.lat!],
        },
        properties: {
          profileId: p.id,
        },
      })
    )

    const sc = new Supercluster<ProfilePointProps>({
      radius: 60,
      maxZoom: 16,
      minZoom: 0,
      minPoints: 2,
    })
    sc.load(features)

    this.index = sc
    this.profileIds = new Set(profiles.map((p: { id: string }) => p.id))
    this.lastBuildTime = Date.now()
  }

  /**
   * Return clusters + individual points for the given bounding box and zoom.
   * Applies per-user blocklist filtering as a post-filter.
   */
  getClusters(
    bbox: [number, number, number, number],
    zoom: number,
    excludeIds: Set<string>
  ): MapClusterResult[] {
    if (!this.index) return []

    const raw = this.index.getClusters(bbox, zoom)
    const results: MapClusterResult[] = []

    for (const feature of raw) {
      const props = feature.properties as GeoJsonProperties
      const [lon, lat] = feature.geometry.coordinates

      if (props?.cluster) {
        const clusterId = props.cluster_id as number
        // For clusters, subtract excluded profiles from count.
        // If only 0-1 remain after filtering, skip the cluster entirely
        // (a cluster of 1 makes no sense).
        const leaves = this.index.getLeaves(clusterId, Infinity)
        const validLeaves = leaves.filter((l) => !excludeIds.has(l.properties.profileId))

        if (validLeaves.length === 0) continue
        if (validLeaves.length === 1) {
          // Degenerate cluster — emit as single point
          const [pLon, pLat] = validLeaves[0].geometry.coordinates
          results.push({
            cluster: false,
            profileId: validLeaves[0].properties.profileId,
            lat: pLat,
            lon: pLon,
          })
          continue
        }

        results.push({
          cluster: true,
          clusterId,
          count: validLeaves.length,
          lat,
          lon,
          expansionZoom: this.index.getClusterExpansionZoom(clusterId),
        })
      } else {
        const profileId = props?.profileId as string
        if (excludeIds.has(profileId)) continue
        results.push({ cluster: false, profileId, lat, lon })
      }
    }

    return results
  }

  /**
   * Fetch full profile data for a set of profile IDs (the unclustered points
   * visible at the current zoom). Applies the caller's social match filter
   * (tag preferences) and blocklist.
   */
  async getProfilesByIds(
    ids: string[],
    callerProfileId: string,
    userPrefs: SocialMatchFilterWithTags | null
  ): Promise<DbProfileWithImages[]> {
    if (ids.length === 0) return []

    const tagIds = userPrefs?.tags?.map((t) => t.id)
    const tagFilter = tagIds?.length ? { tags: { some: { id: { in: tagIds } } } } : {}

    return prisma.profile.findMany({
      where: {
        id: { in: ids },
        ...statusFlags,
        isSocialActive: true,
        ...tagFilter,
        ...blocklistWhereClause(callerProfileId),
      },
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
    })
  }

  /**
   * Collect profile IDs that should be excluded from results for this user
   * (blocked profiles + the user's own profile).
   */
  async getExcludedIds(profileId: string): Promise<Set<string>> {
    const excluded = new Set<string>([profileId])

    const [blockedBy, blocking] = await Promise.all([
      prisma.profile.findMany({
        where: { blockedProfiles: { some: { id: profileId } } },
        select: { id: true },
      }),
      prisma.profile.findMany({
        where: { blockedByProfiles: { some: { id: profileId } } },
        select: { id: true },
      }),
    ])

    for (const p of blockedBy) excluded.add(p.id)
    for (const p of blocking) excluded.add(p.id)

    return excluded
  }
}

import { defineStore } from 'pinia'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import type { PublicProfile } from '@zod/profile/profile.dto'
import type { GetMatchIdsResponse, GetPublicProfileResponse } from '@zod/apiResponse.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import { ClusterMapResponseSchema, type MapFeature } from '@shared/zod/map/cluster.dto'
import { storeSuccess, storeError, type StoreVoidSuccess, type StoreError } from '@/store/helpers'
import { bus } from '@/lib/bus'
import { useBrowseFiltersStore } from './browseFiltersStore'
import type { MapBounds } from '@/features/map/types/map.types'
import { boundsContain, padBounds } from '../utils/boundsUtils'

let clusterAbortController: AbortController | null = null
let lastZoom = 7
let cachedClusterZoom: number | null = null
let cachedClusterBounds: MapBounds | null = null
let cachedClusterTagSig = ''
const popupCache = new Map<string, PublicProfile>()
const POPUP_CACHE_MAX = 20

/**
 * Stable signature for a tag selection, used for cache keying. Sorting
 * guarantees that the same set always produces the same string regardless
 * of selection order.
 */
function tagSignature(tagIds: string[]): string {
  if (tagIds.length === 0) return ''
  return [...tagIds].sort().join(',')
}

/**
 * Serializes the tag selection for HTTP transport. Returns `undefined` when
 * empty so axios omits the `tagIds` query param entirely (keeps URLs clean
 * in dev tools and matches the backend's "empty string means no filter"
 * parser).
 */
function tagIdsParam(tagIds: string[]): string | undefined {
  return tagIds.length > 0 ? tagIds.join(',') : undefined
}

function sameViewport(a: MapBounds | null, aZoom: number, b: MapBounds, bZoom: number): boolean {
  return (
    aZoom === bZoom &&
    a !== null &&
    a.south === b.south &&
    a.north === b.north &&
    a.west === b.west &&
    a.east === b.east
  )
}

function invalidateBoundsCache(): void {
  cachedClusterBounds = null
  cachedClusterZoom = null
  cachedClusterTagSig = ''
  popupCache.clear()
}

type FindProfileStoreState = {
  clusterFeatures: MapFeature[]
  matchedProfileIds: Set<string>
  lastMapBounds: MapBounds | null
  isLoading: boolean
  availableTags: PublicTag[]
}

export const useFindProfileStore = defineStore('findProfile', {
  state: (): FindProfileStoreState => ({
    clusterFeatures: [] as MapFeature[],
    matchedProfileIds: new Set<string>(),
    lastMapBounds: null,
    isLoading: false,
    availableTags: [] as PublicTag[],
  }),

  actions: {
    async findClustersForMapBounds(
      bounds: MapBounds,
      zoom: number
    ): Promise<StoreVoidSuccess | StoreError> {
      // Supercluster requires integer zoom; Leaflet can report fractional values
      // during fitBounds or mid-animation.
      zoom = Math.round(zoom)

      if (clusterAbortController) {
        clusterAbortController.abort()
      }
      const controller = new AbortController()
      clusterAbortController = controller
      this.lastMapBounds = bounds

      const tagIds = useBrowseFiltersStore().selectedTagIds
      const sig = tagSignature(tagIds)

      const sameTags = sig === cachedClusterTagSig
      const zoomChanged = cachedClusterZoom !== zoom
      if (
        sameTags &&
        !zoomChanged &&
        cachedClusterBounds &&
        boundsContain(cachedClusterBounds, bounds)
      ) {
        this.isLoading = false
        return storeSuccess()
      }

      try {
        this.isLoading = true

        const paddedBounds = padBounds(bounds, 0.3)
        const res = await safeApiCall(() =>
          api.get('/find/social/map/clusters', {
            params: { ...paddedBounds, zoom, tagIds: tagIdsParam(tagIds) },
            signal: controller.signal,
          })
        )

        const parsed = ClusterMapResponseSchema.parse(res.data)
        this.clusterFeatures = parsed.features
        this.availableTags = parsed.tags
        cachedClusterBounds = paddedBounds
        cachedClusterZoom = zoom
        cachedClusterTagSig = sig

        return storeSuccess()
      } catch (error: any) {
        if (error instanceof CanceledError) {
          return storeSuccess()
        }
        this.clusterFeatures = []
        return storeError(error, 'Failed to fetch map clusters')
      } finally {
        if (clusterAbortController === controller) {
          this.isLoading = false
        }
      }
    },

    /**
     * Unified bounds handler — deduplicates viewport, then fetches
     * clusters (including posts and tags) in a single request.
     */
    async fetchBounds(bounds: MapBounds, zoom: number): Promise<void> {
      if (sameViewport(this.lastMapBounds, lastZoom, bounds, zoom)) return
      lastZoom = zoom
      await this.findClustersForMapBounds(bounds, zoom)
    },

    async fetchProfileForPopup(profileId: string): Promise<PublicProfile | null> {
      const cached = popupCache.get(profileId)
      if (cached) return cached

      try {
        const res = await safeApiCall(() =>
          api.get<GetPublicProfileResponse>(`/profiles/${profileId}`)
        )
        const profile = res.data.profile
        if (popupCache.size >= POPUP_CACHE_MAX) {
          const firstKey = popupCache.keys().next().value!
          popupCache.delete(firstKey)
        }
        popupCache.set(profileId, profile)
        return profile
      } catch {
        return null
      }
    },

    async fetchDatingMatchIds(): Promise<void> {
      try {
        const res = await safeApiCall(() => api.get<GetMatchIdsResponse>('/find/dating/match-ids'))
        this.matchedProfileIds = new Set(res.data.ids)
      } catch {
        this.matchedProfileIds = new Set()
      }
    },

    async refetchBounds(): Promise<void> {
      invalidateBoundsCache()
      if (this.lastMapBounds) {
        await this.findClustersForMapBounds(this.lastMapBounds, lastZoom)
      }
    },

    teardown() {
      if (clusterAbortController) {
        clusterAbortController.abort()
        clusterAbortController = null
      }
      invalidateBoundsCache()
      this.clusterFeatures = []
      this.matchedProfileIds = new Set()
      this.lastMapBounds = null
      this.isLoading = false
      this.availableTags = []
    },
  },
})

bus.on('auth:logout', () => {
  useFindProfileStore().teardown()
})

bus.on('profile:dating-prefs-updated', () => {
  useFindProfileStore().refetchBounds()
})

bus.on('profile:blocked', () => {
  useFindProfileStore().refetchBounds()
})

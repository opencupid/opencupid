import { defineStore } from 'pinia'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import type { PublicProfile } from '@zod/profile/profile.dto'
import { PublicProfileArraySchema } from '@zod/profile/profile.dto'
import type {
  GetMatchIdsResponse,
  GetProfilesResponse,
  GetPublicProfileResponse,
} from '@zod/apiResponse.dto'
import { ClusterMapResponseSchema, type MapFeature } from '@shared/zod/map/cluster.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError,
} from '@/store/helpers'
import { bus } from '@/lib/bus'
import { useBrowseFiltersStore } from './browseFiltersStore'

export type MapBounds = { south: number; north: number; west: number; east: number }

let mapBoundsAbortController: AbortController | null = null
const cachedProfiles = new Map<string, PublicProfile>()
let cachedBounds: MapBounds | null = null
let cachedBoundsTagSig = ''

let clusterAbortController: AbortController | null = null
let cachedClusterZoom: number | null = null
let cachedClusterBounds: MapBounds | null = null
let cachedClusterTagSig = ''
const popupCache = new Map<string, PublicProfile>()
const POPUP_CACHE_MAX = 20

function boundsContain(outer: MapBounds, inner: MapBounds): boolean {
  return (
    outer.south <= inner.south &&
    outer.north >= inner.north &&
    outer.west <= inner.west &&
    outer.east >= inner.east
  )
}

function padBounds(bounds: MapBounds, factor: number): MapBounds {
  const latPad = (bounds.north - bounds.south) * factor
  const lonPad = (bounds.east - bounds.west) * factor
  return {
    south: bounds.south - latPad,
    north: bounds.north + latPad,
    west: bounds.west - lonPad,
    east: bounds.east + lonPad,
  }
}

function unionBounds(a: MapBounds, b: MapBounds): MapBounds {
  return {
    south: Math.min(a.south, b.south),
    north: Math.max(a.north, b.north),
    west: Math.min(a.west, b.west),
    east: Math.max(a.east, b.east),
  }
}

function profileInBounds(profile: PublicProfile, bounds: MapBounds): boolean {
  const lat = profile.location?.lat
  const lon = profile.location?.lon
  if (lat == null || lon == null) return false
  return lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east
}

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

function invalidateBoundsCache(): void {
  cachedProfiles.clear()
  cachedBounds = null
  cachedBoundsTagSig = ''
  cachedClusterBounds = null
  cachedClusterZoom = null
  cachedClusterTagSig = ''
  popupCache.clear()
}

type FindProfileStoreState = {
  profileList: PublicProfile[] // List of public profiles
  clusterFeatures: MapFeature[] // Map cluster features
  matchedProfileIds: Set<string> // IDs of mutual dating preference matches
  lastMapBounds: MapBounds | null // Last map viewport bounds (for re-fetch on pref change)
  isLoading: boolean // Loading state
}

export const useFindProfileStore = defineStore('findProfile', {
  state: (): FindProfileStoreState => ({
    profileList: [] as PublicProfile[],
    clusterFeatures: [] as MapFeature[],
    matchedProfileIds: new Set<string>(),
    lastMapBounds: null,
    isLoading: false,
  }),

  actions: {
    async findProfilesForMapBounds(
      bounds: MapBounds
    ): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
      if (mapBoundsAbortController) {
        mapBoundsAbortController.abort()
      }
      const controller = new AbortController()
      mapBoundsAbortController = controller
      this.lastMapBounds = bounds

      const tagIds = useBrowseFiltersStore().selectedTagIds
      const sig = tagSignature(tagIds)

      if (sig === cachedBoundsTagSig && cachedBounds && boundsContain(cachedBounds, bounds)) {
        this.profileList = [...cachedProfiles.values()].filter((p) => profileInBounds(p, bounds))
        this.isLoading = false
        return storeSuccess()
      }

      // Tag selection changed — throw out the old bounds cache, it was
      // keyed to a different filter.
      if (sig !== cachedBoundsTagSig) {
        cachedProfiles.clear()
        cachedBounds = null
        cachedBoundsTagSig = sig
      }

      try {
        this.isLoading = true

        const paddedBounds = padBounds(bounds, 0.3)
        const res = await api.get<GetProfilesResponse>('/find/social/map/bounds', {
          params: { ...paddedBounds, tagIds: tagIdsParam(tagIds) },
          signal: controller.signal,
        })
        const fetched = PublicProfileArraySchema.parse(res.data.profiles)

        for (const profile of fetched) {
          cachedProfiles.set(profile.id, profile)
        }
        cachedBounds = cachedBounds ? unionBounds(cachedBounds, paddedBounds) : paddedBounds

        this.profileList = [...cachedProfiles.values()].filter((p) => profileInBounds(p, bounds))

        return storeSuccess()
      } catch (error: any) {
        if (error instanceof CanceledError) {
          return storeSuccess()
        }
        this.profileList = []
        return storeError(error, 'Failed to fetch bounded map profiles')
      } finally {
        if (mapBoundsAbortController === controller) {
          this.isLoading = false
        }
      }
    },

    async findClustersForMapBounds(
      bounds: MapBounds,
      zoom: number
    ): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
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
        const res = await api.get('/find/social/map/clusters', {
          params: { ...paddedBounds, zoom, tagIds: tagIdsParam(tagIds) },
          signal: controller.signal,
        })

        this.clusterFeatures = ClusterMapResponseSchema.parse(res.data).features
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

    async fetchProfileForPopup(profileId: string): Promise<PublicProfile | null> {
      const cached = popupCache.get(profileId)
      if (cached) return cached

      try {
        const res = await api.get<GetPublicProfileResponse>(`/profiles/${profileId}`)
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
      const lastZoom = cachedClusterZoom ?? 7
      invalidateBoundsCache()
      if (this.lastMapBounds) {
        await this.findClustersForMapBounds(this.lastMapBounds, lastZoom)
      }
    },

    invalidateMapCache(): void {
      invalidateBoundsCache()
    },

    hide(profileId: string): void {
      const profileIndex = this.profileList.findIndex((p) => p.id === profileId)
      if (profileIndex !== -1) {
        this.profileList.splice(profileIndex, 1) // Remove profile from list
      }
    },

    teardown() {
      if (mapBoundsAbortController) {
        mapBoundsAbortController.abort()
        mapBoundsAbortController = null
      }
      if (clusterAbortController) {
        clusterAbortController.abort()
        clusterAbortController = null
      }
      invalidateBoundsCache()
      this.profileList = []
      this.clusterFeatures = []
      this.matchedProfileIds = new Set()
      this.lastMapBounds = null
      this.isLoading = false
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

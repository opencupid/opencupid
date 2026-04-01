import { defineStore } from 'pinia'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import type { PublicProfile } from '@zod/profile/profile.dto'
import { PublicProfileArraySchema } from '@zod/profile/profile.dto'
import type { GetMatchIdsResponse, GetProfilesResponse, GetPublicProfileResponse } from '@zod/apiResponse.dto'
import type { MapFeature } from '@shared/zod/map/cluster.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError,
  type StoreSuccess,
} from '@/store/helpers'
import { bus } from '@/lib/bus'

export type MapBounds = { south: number; north: number; west: number; east: number }

let mapBoundsAbortController: AbortController | null = null
const cachedProfiles = new Map<string, PublicProfile>()
let cachedBounds: MapBounds | null = null

let clusterAbortController: AbortController | null = null
let cachedClusterZoom: number | null = null
let cachedClusterBounds: MapBounds | null = null
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

function invalidateBoundsCache(): void {
  cachedProfiles.clear()
  cachedBounds = null
  cachedClusterBounds = null
  cachedClusterZoom = null
  popupCache.clear()
}

type FindProfileStoreState = {
  profileList: PublicProfile[] // List of public profiles
  clusterFeatures: MapFeature[] // Map cluster features
  matchedProfileIds: Set<string> // IDs of mutual dating preference matches
  lastMapBounds: MapBounds | null // Last map viewport bounds (for re-fetch on pref change)
  isLoading: boolean // Loading state
  // Infinite scroll state
  isLoadingMore: boolean // Loading more profiles
  hasMoreProfiles: boolean // Whether there are more profiles to load
  currentPage: number // Current page for pagination
  pageSize: number // Number of profiles per page
}

type StoreProfileListResponse = StoreSuccess<{ result: PublicProfile[] }> | StoreError

export const useFindProfileStore = defineStore('findProfile', {
  state: (): FindProfileStoreState => ({
    profileList: [] as PublicProfile[],
    clusterFeatures: [] as MapFeature[],
    matchedProfileIds: new Set<string>(),
    lastMapBounds: null,
    isLoading: false,
    // Infinite scroll state
    isLoadingMore: false,
    hasMoreProfiles: true,
    currentPage: 0,
    pageSize: 10,
  }),

  actions: {
    async findProfiles(): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
      try {
        this.isLoading = true
        this.currentPage = 0
        this.hasMoreProfiles = true

        const res = await safeApiCall(() => api.get<GetProfilesResponse>('/find/social'))
        const fetched = PublicProfileArraySchema.parse(res.data.profiles)
        this.profileList = fetched
        this.hasMoreProfiles = fetched.length === this.pageSize

        return storeSuccess()
      } catch (error: any) {
        this.profileList = []
        return storeError(error, 'Failed to fetch profiles')
      } finally {
        this.isLoading = false
      }
    },

    async findProfilesForMapBounds(
      bounds: MapBounds
    ): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
      if (mapBoundsAbortController) {
        mapBoundsAbortController.abort()
      }
      const controller = new AbortController()
      mapBoundsAbortController = controller
      this.lastMapBounds = bounds

      if (cachedBounds && boundsContain(cachedBounds, bounds)) {
        this.profileList = [...cachedProfiles.values()].filter((p) => profileInBounds(p, bounds))
        this.hasMoreProfiles = false
        this.isLoading = false
        return storeSuccess()
      }

      try {
        this.isLoading = true
        this.hasMoreProfiles = false

        const paddedBounds = padBounds(bounds, 0.3)
        const res = await api.get<GetProfilesResponse>('/find/social/map/bounds', {
          params: paddedBounds,
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
      if (clusterAbortController) {
        clusterAbortController.abort()
      }
      const controller = new AbortController()
      clusterAbortController = controller
      this.lastMapBounds = bounds

      const zoomChanged = cachedClusterZoom !== zoom
      if (
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
        const res = await api.get<{ success: true; features: MapFeature[] }>(
          '/find/social/map/clusters',
          {
            params: { ...paddedBounds, zoom },
            signal: controller.signal,
          }
        )

        this.clusterFeatures = res.data.features
        cachedClusterBounds = paddedBounds
        cachedClusterZoom = zoom

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
      invalidateBoundsCache()
      if (this.lastMapBounds) {
        await this.findClustersForMapBounds(this.lastMapBounds, cachedClusterZoom ?? 7)
      }
    },

    invalidateMapCache(): void {
      invalidateBoundsCache()
    },

    async fetchNewProfiles(take: number): Promise<StoreProfileListResponse> {
      try {
        const res = await safeApiCall(() =>
          api.get<GetProfilesResponse>('/find/social/new', { params: { take } })
        )
        const fetched = PublicProfileArraySchema.parse(res.data.profiles)
        return storeSuccess({ result: fetched })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch profiles')
      }
    },

    async loadMoreProfiles(): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
      if (this.isLoadingMore || !this.hasMoreProfiles) {
        return storeSuccess()
      }

      try {
        this.isLoadingMore = true
        const nextPage = this.currentPage + 1
        const skip = nextPage * this.pageSize

        const res = await safeApiCall(() =>
          api.get<GetProfilesResponse>('/find/social', {
            params: { skip, take: this.pageSize },
          })
        )
        const fetched = PublicProfileArraySchema.parse(res.data.profiles)

        if (fetched.length > 0) {
          this.profileList.push(...fetched)
          this.currentPage = nextPage
          this.hasMoreProfiles = fetched.length === this.pageSize
        } else {
          this.hasMoreProfiles = false
        }

        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to load more profiles')
      } finally {
        this.isLoadingMore = false
      }
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
      this.isLoadingMore = false
      this.hasMoreProfiles = true
      this.currentPage = 0
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

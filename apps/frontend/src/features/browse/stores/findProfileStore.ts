import { defineStore } from 'pinia'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import type { PublicProfile } from '@zod/profile/profile.dto'
import { PublicProfileArraySchema } from '@zod/profile/profile.dto'
import type { GetMatchIdsResponse, GetProfilesResponse } from '@zod/apiResponse.dto'
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

type FindProfileStoreState = {
  profileList: PublicProfile[] // List of public profiles
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

      try {
        this.isLoading = true
        this.hasMoreProfiles = false

        const res = await api.get<GetProfilesResponse>('/find/social/map/bounds', {
          params: bounds,
          signal: controller.signal,
        })
        const fetched = PublicProfileArraySchema.parse(res.data.profiles)
        this.profileList = fetched

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

    async fetchDatingMatchIds(): Promise<void> {
      try {
        const res = await safeApiCall(() => api.get<GetMatchIdsResponse>('/find/dating/match-ids'))
        this.matchedProfileIds = new Set(res.data.ids)
      } catch {
        this.matchedProfileIds = new Set()
      }
    },

    async refreshAfterDatingPrefsUpdate(): Promise<void> {
      await this.fetchDatingMatchIds()
      if (this.lastMapBounds) {
        await this.findProfilesForMapBounds(this.lastMapBounds)
      }
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
      this.profileList = []
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
  useFindProfileStore().refreshAfterDatingPrefsUpdate()
})

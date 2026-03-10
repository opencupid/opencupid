import { defineStore } from 'pinia'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import type { PublicProfile } from '@zod/profile/profile.dto'
import { PublicProfileArraySchema } from '@zod/profile/profile.dto'
import type {
  GetMatchIdsResponse,
  GetProfilesResponse,
  GetSocialMatchFilterResponse,
} from '@zod/apiResponse.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError,
  type StoreSuccess,
} from '@/store/helpers'
import { bus } from '@/lib/bus'
import {
  SocialMatchFilterDTOSchema,
  type SocialMatchFilterDTO,
  type UpdateSocialMatchFilterPayload,
} from '@zod/match/filters.dto'
import type { LocationDTO, LocationPayload } from '@zod/dto/location.dto'

export type MapBounds = { south: number; north: number; west: number; east: number }

let mapBoundsAbortController: AbortController | null = null

type FindProfileStoreState = {
  socialFilter: SocialMatchFilterDTO | null // Social match filter preferences
  profileList: PublicProfile[] // List of public profiles
  matchedProfileIds: Set<string> // IDs of mutual dating preference matches
  socialSearch: SocialMatchFilterDTO | null // Current social search query
  isLoading: boolean // Loading state
  // Infinite scroll state
  isLoadingMore: boolean // Loading more profiles
  hasMoreProfiles: boolean // Whether there are more profiles to load
  currentPage: number // Current page for pagination
  pageSize: number // Number of profiles per page
}

type StoreProfileListResponse = StoreSuccess<{ result: PublicProfile[] }> | StoreError

function mapLocationToPayload(dto: LocationDTO): LocationPayload {
  const country = dto.country && dto.country !== '' ? dto.country : null
  const cityName = dto.cityName ?? ''

  return {
    country,
    cityName,
    lat: dto.lat ?? null,
    lon: dto.lon ?? null,
  }
}

function mapSocialMatchFilterDTOToPayload(
  dto: SocialMatchFilterDTO
): UpdateSocialMatchFilterPayload {
  const payload = {
    ...dto,
    location: mapLocationToPayload(dto.location),
    tags: dto.tags.map((tag) => tag.id),
  }
  return payload as any as UpdateSocialMatchFilterPayload
}

export const useFindProfileStore = defineStore('findProfile', {
  state: (): FindProfileStoreState => ({
    socialFilter: null,
    profileList: [] as PublicProfile[],
    matchedProfileIds: new Set<string>(),
    socialSearch: null as SocialMatchFilterDTO | null, // Current social search query
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

    async fetchNewProfiles(): Promise<StoreProfileListResponse> {
      try {
        const res = await safeApiCall(() => api.get<GetProfilesResponse>('/find/social/new'))
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

    async fetchSocialFilter(
      defaults?: SocialMatchFilterDTO
    ): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true
        const res = await safeApiCall(() =>
          api.get<GetSocialMatchFilterResponse>('/find/social/filter')
        )
        this.socialFilter = SocialMatchFilterDTOSchema.parse(res.data.filter)
        return storeSuccess()
      } catch (error: any) {
        this.socialFilter = defaults ?? null
        return storeError(error, 'Failed to fetch socialFilter')
      } finally {
        this.isLoading = false
      }
    },

    async persistSocialFilter(): Promise<StoreVoidSuccess | StoreError> {
      if (!this.socialFilter) {
        return storeError(new Error('No social filter to persist'), 'No social filter set')
      }
      try {
        this.isLoading = true
        const payload = mapSocialMatchFilterDTOToPayload(this.socialFilter)
        const res = await safeApiCall(() =>
          api.patch<GetSocialMatchFilterResponse>('/find/social/filter', payload)
        )
        this.socialFilter = SocialMatchFilterDTOSchema.parse(res.data.filter)
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update socialFilter')
      } finally {
        this.isLoading = false
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
      this.socialSearch = null
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

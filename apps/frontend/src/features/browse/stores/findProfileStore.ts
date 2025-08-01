import { defineStore } from 'pinia'
import { api, isApiOnline, safeApiCall } from '@/lib/api'
import type {
  PublicProfile,
} from '@zod/profile/profile.dto'
import {
  PublicProfileArraySchema,
} from '@zod/profile/profile.dto'
import type {
  GetDatingPreferencesResponse,
  GetProfilesResponse,
  GetSocialMatchFilterResponse,
} from '@zod/apiResponse.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError,
  type StoreSuccess
} from '@/store/helpers'
import { bus } from '@/lib/bus'
import {
  DatingPreferencesDTOSchema,
  SocialMatchFilterDTOSchema,
  type DatingPreferencesDTO, type SocialMatchFilterDTO,
  type UpdateSocialMatchFilterPayload
} from '@zod/match/filters.dto'
import type { LocationPayload, SearchLocationDTO } from '@zod/dto/location.dto'

type FindProfileStoreState = {
  datingPrefs: DatingPreferencesDTO | null,
  socialFilter: SocialMatchFilterDTO | null, // Social match filter preferences
  profileList: PublicProfile[]; // List of public profiles
  socialSearch: SocialMatchFilterDTO | null; // Current social search query
  isLoading: boolean; // Loading state
}

type StoreProfileListResponse = StoreSuccess<{ result: PublicProfile[] }> | StoreError

function mapLocationToPayload(
  dto: SearchLocationDTO,
): LocationPayload {
  const country = dto.country && dto.country !== '' ? dto.country : null
  // const cityId = dto.cityId && dto.cityId !== '' ? dto.cityId : null
  const cityName = dto.cityName ?? ''

  return {
    country,
    // cityId,
    cityName,
    lat: dto.lat ?? null,
    lon: dto.lon ?? null,
  }
}


function mapSocialMatchFilterDTOToPayload(dto: SocialMatchFilterDTO): UpdateSocialMatchFilterPayload {
  const payload = {
    ...dto,
    location: mapLocationToPayload(dto.location),
    tags: dto.tags.map(tag => tag.id),
  }
  return payload as any as UpdateSocialMatchFilterPayload
}




export const useFindProfileStore = defineStore('findProfile', {
  state: (): FindProfileStoreState => ({
    datingPrefs: null,
    socialFilter: null,
    profileList: [] as PublicProfile[],
    socialSearch: null as SocialMatchFilterDTO | null, // Current social search query
    isLoading: false,
  }),

  actions: {

    async findSocial(): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
      try {
        this.isLoading = true
        const res = await safeApiCall(() => api.get<GetProfilesResponse>('/find/social'))
        const fetched = PublicProfileArraySchema.parse(res.data.profiles)
        this.profileList = fetched
        return storeSuccess()
      } catch (error: any) {
        this.profileList = []
        return storeError(error, 'Failed to fetch profiles')
      } finally {
        this.isLoading = false
      }
    },

    async findDating(): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
      try {
        this.isLoading = true
        const res = await safeApiCall(() => api.get<GetProfilesResponse>('/find/dating'))
        const fetched = PublicProfileArraySchema.parse(res.data.profiles)
        this.profileList = fetched
        return storeSuccess()
      } catch (error: any) {
        this.profileList = []
        return storeError(error, 'Failed to fetch profiles')
      } finally {
        this.isLoading = false
      }
    },


    async fetchNewSocial(): Promise<StoreProfileListResponse> {
      try {
        const res = await safeApiCall(() => api.get<GetProfilesResponse>('/find/social/new'))
        const fetched = PublicProfileArraySchema.parse(res.data.profiles)
        return storeSuccess({ result: fetched })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch profiles')
      }
    },

    async fetchDatingPrefs(defaults?: DatingPreferencesDTO): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true
        const res = await safeApiCall(() => api.get<GetDatingPreferencesResponse>('/find/dating/filter'))
        const fetched = DatingPreferencesDTOSchema.parse(res.data.prefs)
        this.datingPrefs = fetched
        return storeSuccess()
      } catch (error: any) {
        this.datingPrefs = defaults ?? null
        return storeError(error, 'Failed to fetch datingPrefs')
      } finally {
        this.isLoading = false
      }
    },

    async persistDatingPrefs(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true
        const res = await safeApiCall(() => api.patch<GetDatingPreferencesResponse>('/find/dating/filter', this.datingPrefs))
        const updated = DatingPreferencesDTOSchema.parse(res.data.prefs)
        this.datingPrefs = updated
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update profile')
      } finally {
        this.isLoading = false
      }
    },

    async fetchSocialFilter(defaults?: SocialMatchFilterDTO): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true
        const res = await safeApiCall(() => api.get<GetSocialMatchFilterResponse>('/find/social/filter'))
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
        const res = await safeApiCall(() => api.patch<GetSocialMatchFilterResponse>('/find/social/filter', payload))
        this.socialFilter = SocialMatchFilterDTOSchema.parse(res.data.filter)
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update socialFilter')
      } finally {
        this.isLoading = false
      }
    },

    hide(profileId: string): void {
      const profileIndex = this.profileList.findIndex(p => p.id === profileId)
      if (profileIndex !== -1) {
        this.profileList.splice(profileIndex, 1) // Remove profile from list
      }
    },

    teardown() {
      this.profileList = []
      this.socialSearch = null
      this.datingPrefs = null
      this.isLoading = false
    }
  },
})



bus.on('auth:logout', () => {
  useFindProfileStore().teardown()
})

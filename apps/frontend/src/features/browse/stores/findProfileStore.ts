import { defineStore } from 'pinia'
import { api } from '@/lib/api'
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
  type StoreError
} from '@/store/helpers'
import { bus } from '@/lib/bus'
import { DatingPreferencesDTOSchema, SocialMatchFilterDTOSchema, type DatingPreferencesDTO, type SocialMatchFilterDTO } from '@zod/match/filters.dto'

type FindProfileStoreState = {
  datingPrefs: DatingPreferencesDTO | null,
  socialFilter: SocialMatchFilterDTO | null, // Social match filter preferences
  profileList: PublicProfile[]; // List of public profiles
  socialSearch: SocialMatchFilterDTO | null; // Current social search query
  isLoading: boolean; // Loading state
}

export const useFindProfileStore = defineStore('findProfile', {
  state: (): FindProfileStoreState => ({
    datingPrefs: null, // Dating preferences, initially null
    socialFilter: null, // Social match filter preferences, initially null
    profileList: [] as PublicProfile[], // List of public profiles
    socialSearch: null as SocialMatchFilterDTO | null, // Current social search query
    isLoading: false, // Loading state
  }),

  actions: {

    async findSocial(): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetProfilesResponse>('/discover/social')
        const fetched = PublicProfileArraySchema.parse(res.data.profiles)
        this.profileList = fetched // Update local state
        return storeSuccess()
      } catch (error: any) {
        this.profileList = [] // Reset profile list on error
        return storeError(error, 'Failed to fetch profiles')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    async findDating(): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetProfilesResponse>('/discover/dating')
        const fetched = PublicProfileArraySchema.parse(res.data.profiles)
        this.profileList = fetched // Update local state
        return storeSuccess()
      } catch (error: any) {
        this.profileList = [] // Reset profile list on error
        return storeError(error, 'Failed to fetch profiles')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },


    async fetchDatingPrefs(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetDatingPreferencesResponse>('/dating/filter')
        const fetched = DatingPreferencesDTOSchema.parse(res.data.prefs)
        this.datingPrefs = fetched // Update local state
        return storeSuccess()
      } catch (error: any) {
        this.datingPrefs = null // Reset profile on error
        // console.log('Error fetching datingPrefs:', error)
        return storeError(error, 'Failed to fetch datingPrefs')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    async persistDatingPrefs(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.patch<GetDatingPreferencesResponse>('/dating/filter', this.datingPrefs)
        const updated = DatingPreferencesDTOSchema.parse(res.data.prefs)
        this.datingPrefs = updated
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    async fetchSocialFilter(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true
        const res = await api.get<GetSocialMatchFilterResponse>('/social/filter')
        this.socialFilter = SocialMatchFilterDTOSchema.parse(res.data.filter)
        return storeSuccess()
      } catch (error: any) {
        this.socialFilter = null
        return storeError(error, 'Failed to fetch socialFilter')
      } finally {
        this.isLoading = false
      }
    },

    async persistSocialFilter(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true
        const res = await api.patch<GetSocialMatchFilterResponse>('/social/filter', this.socialFilter)
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

    reset() {
      this.profileList = [] // Reset profile list
      this.socialSearch = null // Reset social search query
      this.isLoading = false // Reset loading state
    }
  },
})



bus.on('auth:logout', () => {
  useFindProfileStore().reset()
})

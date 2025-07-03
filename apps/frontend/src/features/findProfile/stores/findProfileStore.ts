import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import type {
  PublicProfile,
} from '@zod/profile/profile.dto'
import {
  PublicProfileArraySchema,
} from '@zod/profile/profile.dto'
import type {
  GetProfilesResponse,
  GetDatingFilterResponse,
  UpdateDatingFilterResponse,
} from '@zod/apiResponse.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError
} from '@/store/helpers'
import type { SocialSearchQuery } from '@zod/match/socialSearch.dto'
import { DatingFilterDTOSchema, type DatingFilterDTO } from '@zod/match/datingFilter.dto'
import { bus } from '@/lib/bus'

type FindProfileStoreState = {
  profileList: PublicProfile[]; // List of public profiles
  socialSearch: SocialSearchQuery | null; // Current social search query
  isLoading: boolean; // Loading state
  datingPrefs: DatingFilterDTO | null;
}

export const useFindProfileStore = defineStore('findProfile', {
  state: (): FindProfileStoreState => ({
    profileList: [] as PublicProfile[], // List of public profiles
    socialSearch: null as SocialSearchQuery | null, // Current social search query
    isLoading: false, // Loading state
    datingPrefs: null,
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
        this.isLoading = true
        const res = await api.get<GetDatingFilterResponse>('/discover/filter')
        const fetched = DatingFilterDTOSchema.parse(res.data.prefs)
        this.datingPrefs = fetched
        return storeSuccess()
      } catch (error: any) {
        this.datingPrefs = null
        return storeError(error, 'Failed to fetch datingPrefs')
      } finally {
        this.isLoading = false
      }
    },

    async persistDatingPrefs(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true
        const res = await api.patch<UpdateDatingFilterResponse>('/discover/filter', this.datingPrefs)
        const updated = DatingFilterDTOSchema.parse(res.data.prefs)
        this.datingPrefs = updated
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update profile')
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
      this.datingPrefs = null
    }
  },
})



bus.on('auth:logout', () => {
  useFindProfileStore().reset()
})

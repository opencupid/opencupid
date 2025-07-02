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
  GetDatingPreferenceseResponse,
  UpdateDatingPreferencesResponse,
} from '@zod/apiResponse.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError
} from '@/store/helpers'
import type { SocialSearchQuery } from '@zod/match/socialSearch.dto'
import { DatingPreferencesDTOSchema, type DatingPreferencesDTO } from '@zod/match/datingPreference.dto'
import { bus } from '@/lib/bus'

type FindProfileStoreState = {
  profileList: PublicProfile[]; // List of public profiles
  socialSearch: SocialSearchQuery | null; // Current social search query
  datingPrefs: DatingPreferencesDTO | null; // Dating preferences
  isLoading: boolean; // Loading state
}

export const useFindProfileStore = defineStore('findProfile', {
  state: (): FindProfileStoreState => ({
    profileList: [] as PublicProfile[], // List of public profiles
    socialSearch: null as SocialSearchQuery | null, // Current social search query
    datingPrefs: null as DatingPreferencesDTO | null, // Dating preferences
    isLoading: false, // Loading state
  }),

  actions: {

    async findSocial(): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetProfilesResponse>('/findProfile/social')
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
        const res = await api.get<GetProfilesResponse>('/findProfile/dating')
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

    hide(profileId: string): void {
      const profileIndex = this.profileList.findIndex(p => p.id === profileId)
      if (profileIndex !== -1) {
        this.profileList.splice(profileIndex, 1) // Remove profile from list
      }
    },

    async fetchDatingPrefs(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetDatingPreferenceseResponse>('/findProfile/datingprefs')
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
        const res = await api.patch<UpdateDatingPreferencesResponse>('/findProfile/datingprefs', this.datingPrefs)
        const updated = DatingPreferencesDTOSchema.parse(res.data.prefs)
        this.datingPrefs = updated
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update dating preferences')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    reset() {
      this.profileList = [] // Reset profile list
      this.socialSearch = null // Reset social search query
      this.datingPrefs = null // Reset dating preferences
      this.isLoading = false // Reset loading state
    }
  },
})



bus.on('auth:logout', () => {
  useFindProfileStore().reset()
})

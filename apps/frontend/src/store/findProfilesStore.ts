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
} from '@shared/dto/apiResponse.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError
} from './helpers'
import { type DatingPreferencesDTO, DatingPreferencesDTOSchema } from '@zod/match/datingPreference.dto'
import type { SocialSearchQuery } from '@zod/match/socialSearch.dto'

export const useFindProfilesStore = defineStore('findProfiles', {
  state: () => ({
    profileList: [] as PublicProfile[], // List of public profiles
    datingPrefs: null as DatingPreferencesDTO | null, // Current user's dating preferences  
    socialSearch: null as SocialSearchQuery | null, // Current social search query

    isLoading: false, // Loading state
  }),

  actions: {
    async findProfiles(): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetProfilesResponse>('/profiles')
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
        const res = await api.get<GetDatingPreferenceseResponse>('/profiles/datingprefs')
        const fetched = DatingPreferencesDTOSchema.parse(res.data.prefs)
        this.datingPrefs = fetched // Update local state
        return storeSuccess()
      } catch (error: any) {
        this.datingPrefs = null // Reset profile on error
        console.log('Error fetching datingPrefs:', error)
        return storeError(error, 'Failed to fetch datingPrefs')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    async persistDatingPrefs(): Promise<StoreVoidSuccess | StoreError> {
      try {
        // console.log('Updating datingPrefs with data:', update)
        this.isLoading = true // Set loading state
        const res = await api.patch<UpdateDatingPreferencesResponse>('/profiles/datingprefs', this.datingPrefs)
        const updated = DatingPreferencesDTOSchema.parse(res.data.prefs)
        this.datingPrefs = updated
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },
  },
})

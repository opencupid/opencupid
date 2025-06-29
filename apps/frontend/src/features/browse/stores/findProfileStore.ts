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
} from '@shared/dto/apiResponse.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError
} from '@/store/helpers'
import type { SocialSearchQuery } from '@zod/match/socialSearch.dto'
import { bus } from '@/lib/bus'

type FindProfileStoreState = {
  profileList: PublicProfile[]; // List of public profiles
  socialSearch: SocialSearchQuery | null; // Current social search query
  isLoading: boolean; // Loading state
}

export const useFindProfileStore = defineStore('findProfile', {
  state: (): FindProfileStoreState => ({
    profileList: [] as PublicProfile[], // List of public profiles
    socialSearch: null as SocialSearchQuery | null, // Current social search query
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

import z from 'zod'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import type {
  ProfileSummary,
  PublicProfileWithContext,
} from '@zod/profile/profile.dto'
import {
  ProfileSummarySchema,
  PublicProfileWithContextSchema,
} from '@zod/profile/profile.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError
} from '@/store/helpers'
import type { GetProfileSummariesResponse, GetPublicProfileResponse } from '@zod/apiResponse.dto'

type PublicProfileStoreState = {
  profile: PublicProfileWithContext | null; // Current public profile
  isLoading: boolean; // Loading state
}
export const usePublicProfileStore = defineStore('publicProfile', {
  state: ():PublicProfileStoreState => ({
    profile: null, // Current public profile
    isLoading: false, // Loading state
  }),

  actions: {
 

    // Fetch a profile by ID
    async getPublicProfile(profileId: string): Promise<StoreResponse<PublicProfileWithContext>> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetPublicProfileResponse>(`/profiles/${profileId}`)
        const fetched = PublicProfileWithContextSchema.parse(res.data.profile)
        return storeSuccess(fetched)
      } catch (error: any) {
        return storeError(error, 'Failed to fetch profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },


    async blockProfile(targetId: string): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.post(`/profiles/${targetId}/block`)
        if (res.status === 204) {
          // Successfully blocked the profile
          return storeSuccess()
        } else {
          return storeError(new Error('Failed to block profile'), 'Failed to block profile')
        }
      } catch (error: any) {
        return storeError(error, 'Failed to block profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    async unblockProfile(targetId: string): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.post(`/profiles/${targetId}/unblock`)
        if (res.status === 204) {
          // Successfully unblocked the profile
          return storeSuccess()
        } else {
          return storeError(new Error('Failed to unblock profile'), 'Failed to unblock profile')
        }
      } catch (error: any) {
        return storeError(error, 'Failed to unblock profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    async listBlockedProfiles(): Promise<StoreResponse<ProfileSummary[]>> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetProfileSummariesResponse>('/profiles/blocked')
        const fetched = z.array(ProfileSummarySchema).parse(res.data.profiles)
        return storeSuccess(fetched)
      } catch (error: any) {
        return storeError(error, 'Failed to fetch profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

  },
})


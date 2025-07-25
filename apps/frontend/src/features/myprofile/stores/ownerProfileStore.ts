import { defineStore } from 'pinia'
import { bus } from '@/lib/bus'
import { api, isApiOnline, safeApiCall } from '@/lib/api'
import type {
  OwnerProfile,
  ProfileScope,
  PublicProfile,
  PublicProfileWithContext,
  UpdateProfileScopePayload,
} from '@zod/profile/profile.dto'
import {
  OwnerProfileSchema,
  PublicProfileSchema,
  UpdateProfileScopeSchemaPayload,
} from '@zod/profile/profile.dto'
import type {
  GetMyProfileResponse,
  GetPublicProfileResponse,
  UpdateProfileResponse,
} from '@zod/apiResponse.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError
} from '../../../store/helpers'
import { type EditProfileForm, ProfileFormToPayloadTransform } from '@zod/profile/profile.form'

export type PublicProfileResponse = StoreResponse<PublicProfileWithContext> | StoreError

interface ProfileStoreState {
  profile: OwnerProfile | null
  profileScopes: ProfileScope[],
  isLoading: boolean
  error: StoreError | null
}

export const useOwnerProfileStore = defineStore('ownerProfile', {
  state: (): ProfileStoreState => ({
    profile: null as OwnerProfile | null,
    profileScopes: [],
    isLoading: false,
    error: null
  }),

  getters: {
    scopes(): ProfileScope[] {
      return [
        ...(this.profile?.isSocialActive ? (['social'] as const) : []),
        ...(this.profile?.isDatingActive ? (['dating'] as const) : []),
      ]
    },
  },
  actions: {
    async fetchOwnerProfile(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await safeApiCall(() => api.get<GetMyProfileResponse>('/profiles/me'))
        const fetched = OwnerProfileSchema.parse(res.data.profile)
        this.profile = fetched // Update local state
        return storeSuccess()
      } catch (error: any) {
        this.profile = null // Reset profile on error
        console.log('Error fetching profile:', error)
        return storeError(error, 'Failed to fetch profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    // Update the current user's social profile
    async createOwnerProfile(profileData: EditProfileForm): Promise<StoreVoidSuccess | StoreError> {
      const update = ProfileFormToPayloadTransform.parse(profileData)

      if (!update) return storeError(new Error('Invalid profile data'), 'Failed to update profile')

      try {
        this.isLoading = true // Set loading state
        const res = await api.post<UpdateProfileResponse>('/profiles/me', update)
        const updated = OwnerProfileSchema.parse(res.data.profile)
        this.profile = updated
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to create profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    // Update the current user's social profile
    async updateOwnerProfile(profileData: EditProfileForm): Promise<StoreVoidSuccess | StoreError> {
      const update = ProfileFormToPayloadTransform.parse(profileData)

      if (!update) return storeError(new Error('Invalid profile data'), 'Failed to update profile')

      if (this.profile) {
        Object.assign(this.profile, update) // Update local state with new data
      }
      return this.persistOwnerProfile() // Persist dating preferences if they exist
    },

    // Update the current user's social profile
    async updateProfileScopes(profileFragment: UpdateProfileScopePayload): Promise<StoreVoidSuccess | StoreError> {
      const parsed = UpdateProfileScopeSchemaPayload.safeParse(profileFragment)

      if (!parsed.success) return storeError(new Error('Invalid profile data'), 'Failed to update profile')
      try {
        this.isLoading = true // Set loading state
        const res = await safeApiCall(() => api.patch<UpdateProfileResponse>('/profiles/scopes', parsed.data))
        const fetched = OwnerProfileSchema.parse(res.data.profile)
        if (this.profile)
          Object.assign(this.profile, fetched) // Update local state with new data  
        return storeSuccess()
      } catch (error: any) {
        this.profile = null // Reset profile on error
        console.log('Error fetching profile:', error)
        return storeError(error, 'Failed to fetch profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },


    async persistOwnerProfile(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await safeApiCall(() => api.patch<UpdateProfileResponse>('/profiles/me', this.profile))
        const updated = OwnerProfileSchema.parse(res.data.profile)
        this.profile = updated
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },


    /**
     * Fetch a profile preview by ID and locale.  Returns the shape of a PublicProfile, with all dating
     * fields.
     * @param profileId 
     * @param locale 
     * @returns 
     */

    async getProfilePreview(profileId: string, locale: string): Promise<StoreResponse<PublicProfile> | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await safeApiCall(() => api.get<GetPublicProfileResponse>(`/profiles/preview/${locale}/${profileId}`))
        const fetched = PublicProfileSchema.parse(res.data.profile)
        return storeSuccess(fetched)
      } catch (error: any) {
        return storeError(error, 'Failed to fetch profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },


    reset() {
      this.profile = null // Reset profile
      this.isLoading = false // Reset loading state
    },

  },
})


bus.on('auth:logout', () => {
  useOwnerProfileStore().reset()
})

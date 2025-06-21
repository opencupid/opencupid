import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import type {
  OwnerProfile,
  PublicProfile,
  PublicProfileWithConversation,
} from '@zod/profile/profile.dto'
import {
  OwnerProfileSchema,
  PublicProfileSchema,
  PublicProfileWithConversationSchema,
} from '@zod/profile/profile.dto'
import type {
  GetMyProfileResponse,
  GetPublicProfileResponse,
  UpdateProfileResponse,
} from '@shared/dto/apiResponse.dto'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError
} from './helpers'
import { type EditProfileForm, ProfileFormToPayloadTransform, type EditFieldProfileFormWithImages } from '@zod/profile/profile.form'
import { DatingPreferencesDTO } from '@zod/profile/datingPreference.dto'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: null as OwnerProfile | null,// Current user's profile
    profileList: [] as PublicProfile[], // List of public profiles
    datingPrefs: null as DatingPreferencesDTO | null, // Current user's dating preferences  

    isLoading: false, // Loading state

    // Modal state for editing profile fields. Bit of an abusal of this store and maybe should be
    // moved to a more specific store, but for now it works.
    fieldEditModal: false,
    currentField: '' as keyof EditFieldProfileFormWithImages | null, // Field being edited
  }),

  actions: {
    async fetchOwnerProfile(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetMyProfileResponse>('/profiles/me')
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
    async updateOwnerProfile(profileData: EditProfileForm): Promise<StoreVoidSuccess | StoreError> {
      const update = ProfileFormToPayloadTransform.parse(profileData)

      if (!update) return storeError(new Error('Invalid profile data'), 'Failed to update profile')

      if (this.profile) {
        Object.assign(this.profile, update) // Update local state with new data
      }
      return this.persistOwnerProfile() // Persist dating preferences if they exist
    },

    async persistOwnerProfile(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.patch<UpdateProfileResponse>('/profiles/me', this.profile)
        const updated = OwnerProfileSchema.parse(res.data.profile)
        this.profile = updated
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },



    // Fetch a profile by ID
    async getPublicProfile(profileId: string): Promise<StoreResponse<PublicProfileWithConversation>> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetPublicProfileResponse>(`/profiles/${profileId}`)
        const fetched = PublicProfileWithConversationSchema.parse(res.data.profile)
        return storeSuccess(fetched)
      } catch (error: any) {
        return storeError(error, 'Failed to fetch profile')
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

    async getProfilePreview(profileId: string, locale:string): Promise<StoreResponse<PublicProfile>> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetPublicProfileResponse>(`/profiles/preview/${locale}/${profileId}`)
        const fetched = PublicProfileSchema.parse(res.data.profile)
        console.log('Fetched profile preview:', fetched )
        return storeSuccess(fetched)
      } catch (error: any) {
        return storeError(error, 'Failed to fetch profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },





    open() {
      this.fieldEditModal = true
    },

    close() {
      this.fieldEditModal = false
    }
  },
})

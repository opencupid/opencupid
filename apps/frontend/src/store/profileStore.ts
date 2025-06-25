import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import type {
  OwnerProfile,
  ProfileSummary,
  PublicProfile,
  PublicProfileWithContext,
  UpdateProfileScopePayload,
} from '@zod/profile/profile.dto'
import {
  OwnerProfileSchema,
  ProfileSummarySchema,
  PublicProfileSchema,
  PublicProfileWithContextSchema,
  UpdateProfileScopeSchemaPayload,
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
import { bus } from '@/lib/bus'
import { type GetProfileSummariesResponse } from '@zod/apiResponse.dto'
import z from 'zod'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: null as OwnerProfile | null,// Current user's profile
    // profileList: [] as PublicProfile[], // List of public profiles
    // datingPrefs: null as DatingPreferencesDTO | null, // Current user's dating preferences  

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
        const res = await api.patch<UpdateProfileResponse>('/profiles/scopes', parsed.data)
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

    /**
     * Fetch a profile preview by ID and locale.  Returns the shape of a PublicProfile, with all dating
     * fields.
     * @param profileId 
     * @param locale 
     * @returns 
     */

    async getProfilePreview(profileId: string, locale: string): Promise<StoreResponse<PublicProfile>> {
      try {
        this.isLoading = true // Set loading state
        const res = await api.get<GetPublicProfileResponse>(`/profiles/preview/${locale}/${profileId}`)
        const fetched = PublicProfileSchema.parse(res.data.profile)
        console.log('Fetched profile preview:', fetched)
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

    reset() {
      this.profile = null // Reset profile
      this.isLoading = false // Reset loading state
    },

    // async findProfiles(): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
    //   try {
    //     this.isLoading = true // Set loading state
    //     const res = await api.get<GetProfilesResponse>('/profiles')
    //     const fetched = PublicProfileArraySchema.parse(res.data.profiles)
    //     this.profileList = fetched // Update local state
    //     return storeSuccess()
    //   } catch (error: any) {
    //     this.profileList = [] // Reset profile list on error
    //     return storeError(error, 'Failed to fetch profiles')
    //   } finally {
    //     this.isLoading = false // Reset loading state
    //   }
    // },

    // async fetchDatingPrefs(): Promise<StoreVoidSuccess | StoreError> {
    //   try {
    //     this.isLoading = true // Set loading state
    //     const res = await api.get<GetDatingPreferenceseResponse>('/profiles/datingprefs')
    //     const fetched = DatingPreferencesDTOSchema.parse(res.data.prefs)
    //     this.datingPrefs = fetched // Update local state
    //     return storeSuccess()
    //   } catch (error: any) {
    //     this.datingPrefs = null // Reset profile on error
    //     console.log('Error fetching datingPrefs:', error)
    //     return storeError(error, 'Failed to fetch datingPrefs')
    //   } finally {
    //     this.isLoading = false // Reset loading state
    //   }
    // },

    // async persistDatingPrefs(): Promise<StoreVoidSuccess | StoreError> {
    //   try {
    //     // console.log('Updating datingPrefs with data:', update)
    //     this.isLoading = true // Set loading state
    //     const res = await api.patch<UpdateDatingPreferencesResponse>('/profiles/datingprefs', this.datingPrefs)
    //     const updated = DatingPreferencesDTOSchema.parse(res.data.prefs)
    //     this.datingPrefs = updated
    //     return storeSuccess()
    //   } catch (error: any) {
    //     return storeError(error, 'Failed to update profile')
    //   } finally {
    //     this.isLoading = false // Reset loading state
    //   }
    // },


    open() {
      this.fieldEditModal = true
    },

    close() {
      this.fieldEditModal = false
    }
  },
})

bus.on('auth:logout', () => {
  useProfileStore().reset()
})

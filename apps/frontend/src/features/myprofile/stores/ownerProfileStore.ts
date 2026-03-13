import { defineStore } from 'pinia'
import { bus } from '@/lib/bus'
import { api, isApiOnline, safeApiCall } from '@/lib/api'
import type {
  OwnerProfile,
  ProfileOptInSettings,
  ProfileScope,
  PublicProfile,
  PublicProfileWithContext,
  UpdateProfileOptInPayload,
  UpdateProfileScopePayload,
} from '@zod/profile/profile.dto'
import {
  ProfileOptInSettingsSchema,
  OwnerProfileSchema,
  UpdateProfileOptInPayloadSchema,
  PublicProfileSchema,
  UpdateProfileScopeSchemaPayload,
} from '@zod/profile/profile.dto'

import type {
  GetDatingPreferencesResponse,
  GetProfileOptInResponse,
  GetMyProfileResponse,
  GetPublicProfileResponse,
  UpdateProfileOptInResponse,
  UpdateProfileResponse,
  UpdateDatingPreferencesResponse,
  UpdateProfileScopeResponse,
} from '@zod/apiResponse.dto'
import { DatingPreferencesDTOSchema, type DatingPreferencesDTO } from '@zod/match/filters.dto'

const defaultOptInSettings: ProfileOptInSettings = {
  isCallable: true,
  newsletterOptIn: true,
  isPushNotificationEnabled: false,
}
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreResponse,
  type StoreError,
} from '../../../store/helpers'
import {
  type EditProfileForm,
  type CreateProfileForm,
  ProfileFormToPayloadTransform,
  CreateProfileFormToPayloadTransform,
} from '@zod/profile/profile.form'

export type PublicProfileResponse = StoreResponse<PublicProfileWithContext> | StoreError

interface ProfileStoreState {
  profile: OwnerProfile | null
  datingPrefs: DatingPreferencesDTO | null
  optInSettings: ProfileOptInSettings
  profileScopes: ProfileScope[]
  isLoading: boolean
  error: StoreError | null
}

export const useOwnerProfileStore = defineStore('ownerProfile', {
  state: (): ProfileStoreState => ({
    profile: null as OwnerProfile | null,
    datingPrefs: null as DatingPreferencesDTO | null,
    optInSettings: { ...defaultOptInSettings },
    profileScopes: [],
    isLoading: false,
    error: null,
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
        return storeError(error, 'Failed to fetch profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    // Create the current user's profile (onboarding)
    async createOwnerProfile(profileData: CreateProfileForm): Promise<StoreVoidSuccess | StoreError> {
      const update = CreateProfileFormToPayloadTransform.parse(profileData)

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

    async updateProfileScopes(
      profileFragment: UpdateProfileScopePayload
    ): Promise<StoreVoidSuccess | StoreError> {
      const parsed = UpdateProfileScopeSchemaPayload.safeParse(profileFragment)

      if (!parsed.success)
        return storeError(new Error('Invalid profile data'), 'Failed to update profile')
      try {
        this.isLoading = true
        const res = await safeApiCall(() =>
          api.patch<UpdateProfileScopeResponse>('/profiles/scopes', parsed.data)
        )
        if (this.profile) {
          this.profile.isDatingActive = res.data.isDatingActive
          this.profile.isActive = res.data.isActive
        }
        bus.emit('profile:dating-prefs-updated')
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update profile scopes')
      } finally {
        this.isLoading = false
      }
    },

    async fetchOptInSettings(): Promise<StoreResponse<ProfileOptInSettings> | StoreError> {
      try {
        this.isLoading = true
        const res = await safeApiCall(() => api.get<GetProfileOptInResponse>('/profiles/me/optin'))
        const parsed = ProfileOptInSettingsSchema.safeParse(res.data.optIn)
        if (!parsed.success) {
          return storeError(parsed.error, 'Invalid opt-in settings received')
        }
        this.optInSettings = parsed.data
        if (this.profile) {
          this.profile.isCallable = parsed.data.isCallable
        }
        return storeSuccess(parsed.data)
      } catch (error: any) {
        return storeError(error, 'Failed to fetch opt-in settings')
      } finally {
        this.isLoading = false
      }
    },

    async updateOptInSettings(
      payload: UpdateProfileOptInPayload
    ): Promise<StoreResponse<ProfileOptInSettings> | StoreError> {
      const parsedPayload = UpdateProfileOptInPayloadSchema.safeParse(payload)
      if (!parsedPayload.success) {
        return storeError(parsedPayload.error, 'Invalid opt-in settings update payload')
      }

      try {
        this.isLoading = true
        const res = await safeApiCall(() =>
          api.patch<UpdateProfileOptInResponse>('/profiles/me/optin', parsedPayload.data)
        )
        const parsed = ProfileOptInSettingsSchema.safeParse(res.data.optIn)
        if (!parsed.success) {
          return storeError(parsed.error, 'Invalid opt-in settings received')
        }

        this.optInSettings = parsed.data
        if (this.profile) {
          this.profile.isCallable = parsed.data.isCallable
        }

        return storeSuccess(parsed.data)
      } catch (error: any) {
        return storeError(error, 'Failed to update opt-in settings')
      } finally {
        this.isLoading = false
      }
    },

    async persistOwnerProfile(): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await safeApiCall(() =>
          api.patch<UpdateProfileResponse>('/profiles/me', this.profile)
        )
        const updated = OwnerProfileSchema.parse(res.data.profile)
        this.profile = updated
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update profile')
      } finally {
        this.isLoading = false // Reset loading state
      }
    },

    async fetchDatingPrefs(
      defaults?: DatingPreferencesDTO
    ): Promise<StoreVoidSuccess | StoreError> {
      try {
        this.isLoading = true
        const res = await safeApiCall(() =>
          api.get<GetDatingPreferencesResponse>('/find/dating/filter')
        )
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
        const res = await safeApiCall(() =>
          api.patch<UpdateDatingPreferencesResponse>('/find/dating/filter', this.datingPrefs)
        )
        const updated = DatingPreferencesDTOSchema.parse(res.data.prefs)
        this.datingPrefs = updated
        bus.emit('profile:dating-prefs-updated')
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to update dating preferences')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Fetch a profile preview by ID and locale.  Returns the shape of a PublicProfile, with all dating
     * fields.
     * @param profileId
     * @param locale
     * @returns
     */

    async getProfilePreview(
      profileId: string,
      locale: string
    ): Promise<StoreResponse<PublicProfile> | StoreError> {
      try {
        this.isLoading = true // Set loading state
        const res = await safeApiCall(() =>
          api.get<GetPublicProfileResponse>(`/profiles/preview/${locale}/${profileId}`)
        )
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
      this.datingPrefs = null
      this.optInSettings = { ...defaultOptInSettings }
      this.isLoading = false // Reset loading state
    },
  },
})

bus.on('auth:logout', () => {
  useOwnerProfileStore().reset()
})

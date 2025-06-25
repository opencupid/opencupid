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
} from '@/store/helpers'
import { type DatingPreferencesDTO, DatingPreferencesDTOSchema } from '@zod/match/datingPreference.dto'
import type { SocialSearchQuery } from '@zod/match/socialSearch.dto'
import type { ProfileScope, OwnerProfile } from '@zod/profile/profile.dto';
import { bus } from '@/lib/bus'
import { watch } from 'vue'

export const useFindProfilesStore = defineStore('findProfiles', {
  state: () => ({
    profileList: [] as PublicProfile[], // List of public profiles
    datingPrefs: null as DatingPreferencesDTO | null, // Current user's dating preferences  
    socialSearch: null as SocialSearchQuery | null, // Current social search query

    isLoading: false, // Loading state
    currentScope: null as ProfileScope | null, // Current profile scope (social or dating)
    scopes: [] as ProfileScope[], // Available scopes based on user profile
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
        const res = await api.get<GetDatingPreferenceseResponse>('/profiles/datingprefs')
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
    async initialize(me: OwnerProfile, defaultScope: ProfileScope | undefined) {
      console.log('Initializing FindMatchViewModel with defaultScope:', defaultScope)

      this.scopes = [
        ...(me.isSocialActive ? (['social'] as const) : []),
        ...(me.isDatingActive ? (['dating'] as const) : []),
      ]
      this.currentScope = defaultScope ?
        defaultScope : this.scopes.length > 0 ? this.scopes[0] : null

      await this.fetchDatingPrefs()

      watch(() => this.currentScope, (newScope) => {
        if (newScope === 'social') {
          this.findSocial()
        } else if (newScope === 'dating') {
          this.findDating()
        }
      }, { immediate: true }) // Watch for scope changes immediately
    },
    setCurrentScope(scope: ProfileScope) {
      this.currentScope = scope // Set current scope if valid
    },
    reset() {
      this.profileList = [] // Reset profile list
      this.datingPrefs = null // Reset dating preferences
      this.socialSearch = null // Reset social search query
      this.isLoading = false // Reset loading state
      this.currentScope = null // Reset current scope
      this.scopes = [] // Reset available scopes
    }
  },
})



bus.on('auth:logout', () => {
  useFindProfilesStore().reset()
})

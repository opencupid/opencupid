import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, safeApiCall } from '@/lib/api'
import { bus } from '@/lib/bus'
import { useAuthStore } from '@/features/auth/stores/authStore'
import {
  storeSuccess,
  storeError,
  type StoreResponse,
  type StoreVoidSuccess,
  type StoreError,
} from '@/store/helpers'

import { type SettingsUser, SettingsUserSchema } from '@zod/user/user.dto'
import type { GetUserSettingsResponse, UpdateUserLanguageResponse } from '@zod/apiResponse.dto'

export const useUserStore = defineStore('user', () => {
  const user = ref<SettingsUser | null>(null)
  const isLoading = ref(false)

  async function fetchUser(): Promise<StoreResponse<SettingsUser>> {
    isLoading.value = true
    try {
      const res = await safeApiCall(() => api.get<GetUserSettingsResponse>('/users/me'))
      const parsed = SettingsUserSchema.parse(res.data.user)
      user.value = parsed
      return storeSuccess(parsed)
    } catch (error) {
      return storeError(error, 'Failed to fetch user')
    } finally {
      isLoading.value = false
    }
  }

  async function updateLanguage(language: string): Promise<StoreVoidSuccess | StoreError> {
    isLoading.value = true
    try {
      await safeApiCall(() => api.patch<UpdateUserLanguageResponse>('/users/me', { language }))
      if (user.value) {
        user.value = { ...user.value, language }
      }
      return storeSuccess()
    } catch (error) {
      return storeError(error, 'Failed to update language')
    } finally {
      isLoading.value = false
    }
  }

  return { user, isLoading, fetchUser, updateLanguage }
})

// Module-level bus listeners (run once when module is imported)
let lastSyncedLanguage: string | null = null
bus.on('language:changed', async ({ language }) => {
  const authStore = useAuthStore()
  if (!authStore.isLoggedIn) return
  if (language === lastSyncedLanguage) return
  lastSyncedLanguage = language
  const store = useUserStore()
  await store.updateLanguage(language)
})

bus.on('auth:logout', () => {
  const store = useUserStore()
  store.user = null
  lastSyncedLanguage = null
})

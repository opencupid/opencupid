import { defineStore } from 'pinia'
import { api, getVersionInfo } from '@/lib/api'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'
import { type VersionDTO } from '@zod/dto/version.dto'
import type { LocationResponse } from '@zod/apiResponse.dto'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'

export const useAppStore = defineStore('app', {
  state: () => ({
    isLoading: false,
    updateAvailable: false,
    latestVersion: '',
  }),
  actions: {
    async fetchLocation(): Promise<StoreResponse<LocationDTO>> {
      try {
        this.isLoading = true
        const res = await api.get<LocationResponse>('/app/location')
        const parsed = LocationSchema.parse(res.data.location)
        return storeSuccess(parsed)
      } catch (err: unknown) {
        return storeError(err, 'Failed to fetch location')
      } finally {
        this.isLoading = false
      }
    },
    async checkVersion(): Promise<StoreResponse<VersionDTO>> {
      try {
        const parsed = await getVersionInfo()

        // Update state
        this.updateAvailable = parsed.updateAvailable
        this.latestVersion = parsed.frontendVersion

        return storeSuccess(parsed)
      } catch (err: unknown) {
        return storeError(err, 'Failed to check update availability')
      }
    },
  },
})

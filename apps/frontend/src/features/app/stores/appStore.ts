import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'
import { VersionSchema, type VersionDTO } from '@zod/dto/version.dto'
import type { LocationResponse, VersionResponse } from '@zod/apiResponse.dto'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'

// Get the current frontend version
const CURRENT_VERSION = __APP_VERSION__?.app || 'unknown'

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
        const res = await api.get<VersionResponse>('/app/version', {
          params: { v: CURRENT_VERSION }
        })
        const parsed = VersionSchema.parse(res.data.version)

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

import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'
import { VersionSchema, type VersionDTO, UpdateAvailableSchema, type UpdateAvailableDTO } from '@zod/dto/version.dto'
import type { LocationResponse, VersionResponse, UpdateAvailableResponse } from '@zod/apiResponse.dto'
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
    async fetchVersion(): Promise<StoreResponse<VersionDTO>> {
      try {
        this.isLoading = true
        const res = await api.get<VersionResponse>('/app/version')
        const parsed = VersionSchema.parse(res.data.version)
        return storeSuccess(parsed)
      } catch (err: unknown) {
        return storeError(err, 'Failed to fetch version')
      } finally {
        this.isLoading = false
      }
    },
    async checkUpdateAvailable(): Promise<StoreResponse<UpdateAvailableDTO>> {
      try {
        const res = await api.get<UpdateAvailableResponse>('/app/updateavailable', {
          params: { v: CURRENT_VERSION }
        })
        const parsed = UpdateAvailableSchema.parse(res.data.updateInfo)
        
        // Update state
        this.updateAvailable = parsed.updateAvailable
        this.latestVersion = parsed.latestVersion
        
        return storeSuccess(parsed)
      } catch (err: unknown) {
        return storeError(err, 'Failed to check update availability')
      }
    },
  },
})

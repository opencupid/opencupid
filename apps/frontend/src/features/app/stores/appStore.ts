import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'
import { VersionSchema, type VersionDTO } from '@zod/dto/version.dto'
import type { LocationResponse, VersionResponse } from '@zod/apiResponse.dto'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'

export const useAppStore = defineStore('app', {
  state: () => ({
    isLoading: false,
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
  },
})

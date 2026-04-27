import { defineStore } from 'pinia'
import { bus } from '@/lib/bus'
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
    canInstallPwa: false,
    shareCtaDismissed: false,
    geoipCountry: '' as string,
  }),
  actions: {
    /**
     * One-shot startup hook called once from main.ts. Fires off background
     * lookups (currently just the geoip country) so subsequent UI surfaces
     * (onboarding, geocoding bias) can read them from the store. Failures
     * are swallowed — geoipCountry stays empty, callers handle that.
     */
    initialize() {
      void this.fetchLocation()
    },
    async fetchLocation(): Promise<StoreResponse<LocationDTO>> {
      try {
        this.isLoading = true
        const res = await api.get<LocationResponse>('/app/location')
        const parsed = LocationSchema.parse(res.data.location)
        this.geoipCountry = parsed.country ?? ''
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

bus.on('auth:logout', () => {
  useAppStore().$reset()
})

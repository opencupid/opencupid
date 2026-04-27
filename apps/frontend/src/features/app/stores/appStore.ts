import { defineStore } from 'pinia'
import { bus } from '@/lib/bus'
import { api, getVersionInfo, safeApiCall } from '@/lib/api'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'
import { type VersionDTO } from '@zod/dto/version.dto'
import type { LocationResponse } from '@zod/apiResponse.dto'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'

interface AppState {
  isLoading: boolean
  updateAvailable: boolean
  latestVersion: string
  canInstallPwa: boolean
  shareCtaDismissed: boolean
  geoipLocation: LocationDTO | null
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    isLoading: false,
    updateAvailable: false,
    latestVersion: '',
    canInstallPwa: false,
    shareCtaDismissed: false,
    geoipLocation: null,
  }),
  actions: {
    async fetchLocation(): Promise<StoreResponse<void>> {
      try {
        const res = await safeApiCall(() => api.get<LocationResponse>('/app/location'))
        // 204 means the lookup succeeded but geoip-api had no result for the
        // client IP (private/loopback, unknown range). Distinct from a 5xx.
        if (res.status === 200) {
          const resultLocation = LocationSchema.parse(res.data.location)
          this.geoipLocation = resultLocation
          return storeSuccess()
        }
        this.geoipLocation = null
        return storeError(res.status, 'IP not found')
      } catch (err) {
        return storeError(err, 'Failed to fetch location')
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

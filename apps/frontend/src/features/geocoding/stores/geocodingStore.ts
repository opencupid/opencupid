import { defineStore } from 'pinia'
import { useGeocoder } from '../composables/useGeocoder'
import type { GeocodingResult } from '../types'

export type { GeocodingResult }

export const useGeocodingStore = defineStore('geocoding', {
  state: () => ({
    results: [] as GeocodingResult[],
    isLoading: false,
  }),

  actions: {
    async search(query: string, lang: string): Promise<GeocodingResult[]> {
      if (!query) {
        this.results = []
        return this.results
      }
      this.isLoading = true
      try {
        const { search } = useGeocoder()
        this.results = await search(query, lang)
        return this.results
      } catch (err) {
        console.error('Geocoding search failed:', err)
        this.results = []
        return this.results
      } finally {
        this.isLoading = false
      }
    },
  },
})

import { defineStore } from 'pinia'
import { axios } from '@/lib/api'
import type { FeatureCollection, Point } from 'geojson'

const searchOSMTagFilters = ['place:city', 'place:town', 'place:village', 'place:hamlet']
export interface KomootLocation {
  name: string
  country: string
  lat: number
  lon: number
}

// Define Komoot API response interfaces
interface KomootFeatureProperties {
  name: string
  countrycode: string
  [key: string]: unknown
}

interface KomootFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: KomootFeatureProperties
}

interface KomootFeatureCollection {
  type: 'FeatureCollection'
  features: KomootFeature[]
}

export const useKomootStore = defineStore('komoot', {
  state: () => ({
    results: [] as KomootLocation[],
    isLoading: false,
  }),

  actions: {
    async search(query: string, lang: string): Promise<KomootLocation[]> {
      if (!query) {
        this.results = []
        return this.results
      }
      this.isLoading = true
      // komoot API doesn't support languges other than 'en' and 'de', so we default to 'en'
      const defaultLang = 'en'

      const params = new URLSearchParams()
      params.set('q', query)
      params.set('lang', defaultLang)
      params.set('limit', '10')
      // params.set('dedupe', '1')
      for (const tag of searchOSMTagFilters) {
        params.append('osm_tag', tag)
      }

      try {
        const res = await axios.get<KomootFeatureCollection>('https://photon.komoot.io/api/', {
          params,
        })
        const features = res.data.features ?? []
        this.results = features.map((f) => ({
          name: f.properties.name,
          country: f.properties.countrycode,
          lat: f.geometry?.coordinates[1] ?? 0,
          lon: f.geometry?.coordinates[0] ?? 0,
        }))
        return this.results
      } catch (err) {
        console.error('Komoot search failed:', err)
        this.results = []
        return this.results
      } finally {
        this.isLoading = false
      }
    },
  },
})

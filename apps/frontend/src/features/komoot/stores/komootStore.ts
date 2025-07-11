import { defineStore } from 'pinia'
import { axios } from '@/lib/api'
import type { FeatureCollection, Point } from 'geojson'

const searchOSMTagFilters = [
  'place:city',
  'place:town',
  'place:village',
  'place:hamlet',
]
export interface KomootLocation {
  name: string
  country: string
  lat: number
  lon: number
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
        const res = await axios.get<FeatureCollection<Point>>(
          'https://photon.komoot.io/api/',
          {
            params,
          },
        )
        const features = res.data.features ?? []
        this.results = features.map(f => ({
          name: (f.properties as any).name,
          country: (f.properties as any).countrycode,
          lat: (f.geometry?.coordinates[1] as number) ?? 0,
          lon: (f.geometry?.coordinates[0] as number) ?? 0,
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

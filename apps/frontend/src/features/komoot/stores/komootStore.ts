import { defineStore } from 'pinia'
import { axios } from '@/lib/api'
import type { FeatureCollection } from 'geojson'

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
      try {
        const res = await axios.get<FeatureCollection>(
          'https://photon.komoot.io/api/',
          { params: { q: query, lang } },
        )
        const features = res.data.features ?? []
        this.results = features.map(f => ({
          name: (f.properties as any).name,
          country: (f.properties as any).country,
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

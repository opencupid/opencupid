import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useGeocoder } from '../composables/useGeocoder'
import type { GeocodingResult } from '../types'

export type { GeocodingResult }

const { search: geocode } = useGeocoder()

export const useGeocodingStore = defineStore('geocoding', () => {
  let _abortController: AbortController | null = null

  const results = ref<GeocodingResult[]>([])
  const isLoading = ref(false)

  async function searchNearby(
    country: string,
    query: string,
    lang: string,
    take: number = 5
  ): Promise<GeocodingResult[]> {
    await search(query, lang)
    const preferred = country.toUpperCase()
    // Stable sort: entries already ranked by exact-name match in search(),
    // here we only promote in-country matches to the top without disturbing
    // that secondary order.
    results.value = [...results.value]
      .sort(
        (a, b) =>
          Number(a.country.toUpperCase() !== preferred) -
          Number(b.country.toUpperCase() !== preferred)
      )
      .slice(0, take)
    return results.value
  }

  async function search(query: string, lang: string): Promise<GeocodingResult[]> {
    if (!query) {
      _abortController?.abort()
      _abortController = null
      results.value = []
      isLoading.value = false
      return results.value
    }

    _abortController?.abort()
    _abortController = new AbortController()
    const { signal } = _abortController

    const normalizedQuery = query.trim().toLowerCase()

    isLoading.value = true
    try {
      const data = await geocode(query, lang, signal)
      if (!signal.aborted) {
        results.value = data.sort(
          (a, b) =>
            Number(a.name.toLowerCase() !== normalizedQuery) -
            Number(b.name.toLowerCase() !== normalizedQuery)
        )
      }
      return results.value
    } catch (err) {
      if (err instanceof Error && err.name === 'CanceledError') {
        return results.value
      }
      console.error('Geocoding search failed:', err)
      results.value = []
      return results.value
    } finally {
      if (!signal.aborted) {
        isLoading.value = false
      }
    }
  }

  return { results, isLoading, search, searchNearby }
})

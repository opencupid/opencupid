import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useGeocoder } from '../composables/useGeocoder'
import { toGeoPoint, type LocationDTO } from '@zod/dto/location.dto'
import type { GeocodingResult } from '../types'

export type { GeocodingResult }

const { search: geocode } = useGeocoder()

export const useGeocodingStore = defineStore('geocoding', () => {
  let _abortController: AbortController | null = null

  const results = ref<GeocodingResult[]>([])
  const isLoading = ref(false)

  async function search(
    query: string,
    lang: string,
    locationBias?: LocationDTO | null,
    take: number = 5
  ): Promise<GeocodingResult[]> {
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
    const bias = toGeoPoint(locationBias)

    isLoading.value = true
    try {
      const data = await geocode(query, lang, signal, bias)
      if (!signal.aborted) {
        // Photon's ranking blends name match, popularity and our location
        // bias. Re-sort to guarantee an exact name match wins regardless of
        // popularity within the bias-respecting result order (sort is stable).
        results.value = data
          .sort(
            (a, b) =>
              Number(a.name.toLowerCase() !== normalizedQuery) -
              Number(b.name.toLowerCase() !== normalizedQuery)
          )
          .slice(0, take)
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

  function clear() {
    _abortController?.abort()
    _abortController = null
    results.value = []
    isLoading.value = false
  }

  const hasResults = computed(() => results.value.length > 0)

  return { results, isLoading, hasResults, search, clear }
})

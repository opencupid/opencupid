import { computed, ref } from 'vue'
import * as Sentry from '@sentry/vue'

import { searchPhoton } from '../providers/photon'
// import { searchNominatim } from '../providers/nominatim'
import { toGeoPoint, type LocationDTO } from '@zod/dto/location.dto'
import type { GeocodingResult } from '../types'

export type { GeocodingResult }

// Provider seam — swap here to change geocoding backend app-wide.
const providerSearch = searchPhoton

export function useGeocoder() {
  let abortController: AbortController | null = null

  const results = ref<GeocodingResult[]>([])
  const isLoading = ref(false)
  const hasResults = computed(() => results.value.length > 0)

  async function search(
    query: string,
    lang: string,
    locationBias?: LocationDTO | null,
    take = 5
  ): Promise<GeocodingResult[]> {
    if (!query) {
      abortController?.abort()
      abortController = null
      results.value = []
      isLoading.value = false
      return results.value
    }

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    const bias = toGeoPoint(locationBias)

    isLoading.value = true
    try {
      const data = await providerSearch(query, lang, signal, bias)
      if (!signal.aborted) {
        results.value = data.slice(0, take)
        if (data.length === 0) {
          Sentry.captureMessage('Geocoder returned no results', {
            level: 'info',
            tags: { feature: 'geocoding', outcome: 'empty' },
            extra: { query, lang, bias },
          })
        }
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

  function setResults(items: GeocodingResult[]) {
    results.value = items
  }

  function clear() {
    abortController?.abort()
    abortController = null
    results.value = []
    isLoading.value = false
  }

  return { results, isLoading, hasResults, search, setResults, clear }
}

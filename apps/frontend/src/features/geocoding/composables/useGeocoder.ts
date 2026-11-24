import { computed, ref } from 'vue'
import * as Sentry from '@sentry/vue'

import { searchPhoton, reversePhoton } from '../providers/photon'
// import { searchNominatim } from '../providers/nominatim'
import { toGeoPoint, type LocationDTO } from '@zod/dto/location.dto'
import type { GeocodingResult } from '../types'

export type { GeocodingResult }

/** Outcome of the latest search; `idle` while none has finished. */
export type GeocoderStatus = 'idle' | 'found' | 'empty' | 'error'

// Provider seam — swap here to change geocoding backend app-wide.
const providerSearch = searchPhoton
/** Nearest settlement to a point, from the same provider as `search`. */
export const reverseGeocode = reversePhoton

export function useGeocoder() {
  let abortController: AbortController | null = null

  const results = ref<GeocodingResult[]>([])
  const isLoading = ref(false)
  const status = ref<GeocoderStatus>('idle')
  const hasResults = computed(() => results.value.length > 0)

  async function search(
    query: string,
    lang: string,
    locationBias?: LocationDTO | null,
    take = 5
  ): Promise<GeocodingResult[]> {
    status.value = 'idle'
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
        status.value = data.length > 0 ? 'found' : 'empty'
      }
      return results.value
    } catch (err) {
      if (err instanceof Error && err.name === 'CanceledError') {
        return results.value
      }
      Sentry.captureException(err, {
        tags: { feature: 'geocoding', outcome: 'error', op: 'search' },
        extra: { query, lang },
      })
      results.value = []
      status.value = 'error'
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
    status.value = 'idle'
  }

  return { results, isLoading, hasResults, status, search, setResults, clear }
}

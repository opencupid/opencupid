import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useGeocoder } from '../composables/useGeocoder'
import { useAppStore } from '@/features/app/stores/appStore'
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
    // Bias toward the explicit country when one is supplied; otherwise fall
    // back to the country detected from the client IP at app startup. Either
    // way the bias is a stable sort that promotes in-country hits without
    // disturbing the exact-name ranking applied in search().
    const preferred = (country || useAppStore().geoipCountry).toUpperCase()
    if (!preferred) {
      results.value = results.value.slice(0, take)
      return results.value
    }
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
    const geoipCountry = useAppStore().geoipCountry.toUpperCase()

    isLoading.value = true
    try {
      const data = await geocode(query, lang, signal)
      if (!signal.aborted) {
        results.value = data.sort((a, b) => {
          const exactMatchDiff =
            Number(a.name.toLowerCase() !== normalizedQuery) -
            Number(b.name.toLowerCase() !== normalizedQuery)
          if (exactMatchDiff !== 0 || !geoipCountry) return exactMatchDiff
          // Within the same exact-match tier, promote results from the
          // geoip-detected country so the user sees regionally-relevant
          // hits first when no other country bias is in play.
          return (
            Number(a.country.toUpperCase() !== geoipCountry) -
            Number(b.country.toUpperCase() !== geoipCountry)
          )
        })
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

  return { results, isLoading, hasResults, search, searchNearby, clear }
})

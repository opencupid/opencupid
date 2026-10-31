import { ref, type Ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { MapBounds } from '@/features/map/types/map.types'
import { reverseGeocode } from './useGeocoder'

const CACHE_LIMIT = 200
/** Names by locale and centre rounded to ~1 km, shared across instances. */
const cache = new Map<string, string | null>()

function remember(key: string, name: string | null) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
  cache.set(key, name)
}

/**
 * Name of the settlement at the centre of `bounds` ("Szentendre"), for the
 * browse grid's header. Looks it up only while `enabled`; `name` is null
 * when nothing is found or the lookup fails.
 */
export function useAreaName(bounds: Ref<MapBounds | null>, enabled: Ref<boolean>) {
  const name = ref<string | null>(null)
  const { locale } = useI18n()
  let controller: AbortController | null = null

  watchDebounced(
    [bounds, enabled, locale],
    async () => {
      const b = bounds.value
      if (!enabled.value || !b) return
      const point = { lat: (b.south + b.north) / 2, lon: (b.west + b.east) / 2 }
      const key = `${locale.value}:${point.lat.toFixed(2)},${point.lon.toFixed(2)}`
      if (cache.has(key)) {
        controller?.abort()
        name.value = cache.get(key) ?? null
        return
      }

      controller?.abort()
      const current = new AbortController()
      controller = current
      try {
        const result = await reverseGeocode(point, locale.value, current.signal)
        if (current.signal.aborted) return
        const found = result?.name ?? null
        remember(key, found)
        name.value = found
      } catch (err) {
        if (current.signal.aborted || (err instanceof Error && err.name === 'CanceledError')) return
        name.value = null
      }
    },
    { debounce: 300, immediate: true }
  )

  return { name }
}

/** Test helper: forget cached names. */
export function clearAreaNameCache() {
  cache.clear()
}

import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import type { Map as LMap } from 'leaflet'

import { spreadMarkers, type SpreadMarker, type SpreadingConfig } from '../utils/markerSpreading'

export interface UseMarkerSpreadingOptions extends SpreadingConfig {
  /** Toggle the algorithm off without unmounting the composable. */
  enabled?: boolean
}

/**
 * Reactive marker-spreading driver. Given a Vue ref of input markers and
 * a (possibly-deferred) Leaflet map ref, this composable produces a
 * `spread` ref whose markers' `current` coordinates are updated to lay
 * dense groups out on a deterministic spiral.
 *
 * Recomputation triggers:
 *  - input markers change (Vue watch)
 *  - map zoom finishes (`zoomend`)
 *  - map pan finishes (`moveend`)
 *  - viewport resizes (`resize`)
 *
 * The composable subscribes/unsubscribes Leaflet listeners lazily based
 * on the map ref so callers can pass `shallowRef<LMap | null>()` and the
 * map can arrive on a later tick (the usual Leaflet init dance).
 */
export function useMarkerSpreading<T>(
  markers: Ref<SpreadMarker<T>[]>,
  mapRef: Ref<LMap | null | undefined>,
  options: UseMarkerSpreadingOptions = {}
) {
  const spread = shallowRef<SpreadMarker<T>[]>([])
  const isSpreading = ref(false)

  let attachedMap: LMap | null = null

  function recompute(): void {
    const map = mapRef.value
    if (!map) {
      spread.value = markers.value
      return
    }
    if (options.enabled === false) {
      spread.value = markers.value
      return
    }
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) {
      // Map element has no dimensions yet (e.g. KeepAlive deactivated):
      // skip the projection round-trip rather than emit nonsense
      // coordinates that would force a needless re-render later.
      spread.value = markers.value
      return
    }
    isSpreading.value = true
    try {
      spread.value = spreadMarkers(markers.value, map, map.getZoom(), options)
    } finally {
      isSpreading.value = false
    }
  }

  function attach(map: LMap): void {
    if (attachedMap === map) return
    detach()
    map.on('zoomend', recompute)
    map.on('moveend', recompute)
    map.on('resize', recompute)
    attachedMap = map
  }

  function detach(): void {
    if (!attachedMap) return
    attachedMap.off('zoomend', recompute)
    attachedMap.off('moveend', recompute)
    attachedMap.off('resize', recompute)
    attachedMap = null
  }

  watch(
    mapRef,
    (map) => {
      if (!map) {
        detach()
        spread.value = markers.value
        return
      }
      attach(map)
      recompute()
    },
    { immediate: true }
  )

  watch(markers, recompute)

  onBeforeUnmount(() => {
    detach()
  })

  return { spread, isSpreading, recompute }
}

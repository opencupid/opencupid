import { onScopeDispose, ref, watch, type Ref } from 'vue'
import type { Map as LMap } from 'leaflet'

import {
  DEFAULT_SPREAD_CONFIG,
  spreadMarkers,
  type MarkerInput,
  type PositionPlan,
  type SpreadConfig,
} from '../utils/markerSpreading'

export type UseMarkerSpreadingOptions = Partial<SpreadConfig>

/**
 * Reactive spread-position planner. Recomputes positions on Leaflet
 * `zoomend` / `moveend` / `resize` and whenever the input markers change,
 * exposing the resulting plan as a reactive ref. Standalone from the rest
 * of the map controller — callers that aren't using `useMapController`
 * (custom layers, alternative renderers) can drop this in and render
 * markers from `positions.value`.
 *
 * Lifecycle is bound to the current scope: listeners detach on unmount or
 * when the map ref switches to null.
 */
export function useMarkerSpreading<T extends MarkerInput>(
  markers: Ref<readonly T[]>,
  map: Ref<LMap | null>,
  options: UseMarkerSpreadingOptions = {}
) {
  const config: SpreadConfig = { ...DEFAULT_SPREAD_CONFIG, ...options }
  const positions = ref<PositionPlan<T>[]>([]) as Ref<PositionPlan<T>[]>

  function recompute(): void {
    const m = map.value
    if (!m) {
      positions.value = []
      return
    }
    const size = m.getSize()
    if (size.x === 0 || size.y === 0) {
      positions.value = []
      return
    }
    positions.value = spreadMarkers(markers.value, m, m.getZoom(), config)
  }

  let attached: LMap | null = null
  function detach(): void {
    if (!attached) return
    attached.off('zoomend', recompute)
    attached.off('moveend', recompute)
    attached.off('resize', recompute)
    attached = null
  }
  function attach(m: LMap): void {
    detach()
    attached = m
    m.on('zoomend', recompute)
    m.on('moveend', recompute)
    m.on('resize', recompute)
    recompute()
  }

  watch(map, (m) => (m ? attach(m) : detach()), { immediate: true })
  watch(markers, recompute, { deep: false })
  onScopeDispose(detach)

  return { positions, recompute }
}

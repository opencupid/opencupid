import { describe, it, expect, vi } from 'vitest'
import { defineComponent, nextTick, ref, shallowRef } from 'vue'
import { mount } from '@vue/test-utils'
import type { Map as LMap } from 'leaflet'

import { useMarkerSpreading } from '../useMarkerSpreading'
import type { SpreadMarker } from '../../utils/markerSpreading'

/**
 * Minimal Leaflet map stub. 10 px/° projection so analytical positions
 * are easy to reason about in tests.
 */
function makeMap(initialZoom = 8) {
  const handlers = new Map<string, Set<() => void>>()
  let zoom = initialZoom
  let size = { x: 1000, y: 800 }
  const map = {
    on: vi.fn((event: string, fn: () => void) => {
      let set = handlers.get(event)
      if (!set) {
        set = new Set()
        handlers.set(event, set)
      }
      set.add(fn)
    }),
    off: vi.fn((event: string, fn: () => void) => {
      handlers.get(event)?.delete(fn)
    }),
    getZoom: () => zoom,
    getSize: () => size,
    latLngToContainerPoint(latlng: [number, number] | { lat: number; lng: number }) {
      const lat = Array.isArray(latlng) ? latlng[0] : latlng.lat
      const lng = Array.isArray(latlng) ? latlng[1] : latlng.lng
      return { x: lng * 10, y: -lat * 10 }
    },
    containerPointToLatLng(point: [number, number] | { x: number; y: number }) {
      const x = Array.isArray(point) ? point[0] : point.x
      const y = Array.isArray(point) ? point[1] : point.y
      return { lat: -y / 10, lng: x / 10 }
    },
  }
  return {
    map: map as unknown as LMap,
    fire(event: string) {
      handlers.get(event)?.forEach((fn) => fn())
    },
    setZoom(z: number) {
      zoom = z
    },
    setSize(x: number, y: number) {
      size = { x, y }
    },
    handlers,
  }
}

function makeMarker(id: string, lat: number, lng: number): SpreadMarker<{ name: string }> {
  return { id, original: { lat, lng }, current: { lat, lng }, data: { name: id } }
}

/**
 * Composables that bind to Vue lifecycle hooks (onBeforeUnmount) must run
 * inside a component setup() — use a tiny harness wrapper to mount/unmount.
 */
function mountComposable<R>(setupFn: () => R): { instance: R; unmount: () => void } {
  let exposed!: R
  const Harness = defineComponent({
    setup() {
      exposed = setupFn()
      return () => null
    },
  })
  const wrapper = mount(Harness)
  return { instance: exposed, unmount: () => wrapper.unmount() }
}

describe('useMarkerSpreading', () => {
  it('returns input markers when no map is attached', async () => {
    const markers = ref([makeMarker('a', 47.5, 19.0), makeMarker('b', 47.5, 19.0)])
    const mapRef = shallowRef<LMap | null>(null)

    const { instance, unmount } = mountComposable(() => useMarkerSpreading(markers, mapRef))
    await nextTick()

    expect(instance.spread.value).toEqual(markers.value)
    unmount()
  })

  it('spreads overlapping markers once a map is attached', async () => {
    const markers = ref([makeMarker('a', 47.5, 19.0), makeMarker('b', 47.5, 19.0)])
    const m = makeMap(8)
    const mapRef = shallowRef<LMap | null>(null)

    const { instance, unmount } = mountComposable(() => useMarkerSpreading(markers, mapRef))
    mapRef.value = m.map
    await nextTick()

    const positions = instance.spread.value.map((p) => `${p.current.lat},${p.current.lng}`)
    expect(new Set(positions).size).toBe(2)
    expect(instance.spread.value.every((p) => p.isSpread === true)).toBe(true)
    unmount()
  })

  it('recomputes on zoomend', async () => {
    const markers = ref([makeMarker('a', 47.5, 19.0), makeMarker('b', 47.5, 19.0)])
    const m = makeMap(8)
    const mapRef = shallowRef<LMap | null>(m.map)

    const { instance, unmount } = mountComposable(() => useMarkerSpreading(markers, mapRef))
    await nextTick()

    const before = instance.spread.value.map((p) => ({ ...p.current }))

    m.setZoom(13) // smaller spread radius
    m.fire('zoomend')
    await nextTick()

    const after = instance.spread.value.map((p) => ({ ...p.current }))
    expect(after).not.toEqual(before)
    unmount()
  })

  it('disables spreading at or above the cutoff zoom', async () => {
    const markers = ref([makeMarker('a', 47.5, 19.0), makeMarker('b', 47.5, 19.0)])
    const m = makeMap(15)
    const mapRef = shallowRef<LMap | null>(m.map)

    const { instance, unmount } = mountComposable(() =>
      useMarkerSpreading(markers, mapRef, { minZoomToSpread: 11, maxZoomCutoffOffset: 4 })
    )
    await nextTick()

    expect(instance.spread.value.every((p) => p.isSpread !== true)).toBe(true)
    expect(instance.spread.value[0]!.current).toEqual({ lat: 47.5, lng: 19.0 })
    unmount()
  })

  it('skips computation when the map has zero-size viewport', async () => {
    const markers = ref([makeMarker('a', 47.5, 19.0), makeMarker('b', 47.5, 19.0)])
    const m = makeMap(8)
    m.setSize(0, 0)
    const mapRef = shallowRef<LMap | null>(m.map)

    const { instance, unmount } = mountComposable(() => useMarkerSpreading(markers, mapRef))
    await nextTick()

    expect(instance.spread.value).toEqual(markers.value)
    unmount()
  })

  it('detaches Leaflet listeners on unmount', async () => {
    const markers = ref([makeMarker('a', 47.5, 19.0)])
    const m = makeMap(8)
    const mapRef = shallowRef<LMap | null>(m.map)

    const { unmount } = mountComposable(() => useMarkerSpreading(markers, mapRef))
    await nextTick()

    const totalHandlersBefore = [...m.handlers.values()].reduce((n, s) => n + s.size, 0)
    expect(totalHandlersBefore).toBeGreaterThan(0)

    unmount()

    const totalHandlersAfter = [...m.handlers.values()].reduce((n, s) => n + s.size, 0)
    expect(totalHandlersAfter).toBe(0)
  })

  it('recomputes when the markers ref changes', async () => {
    const markers = ref([makeMarker('a', 47.5, 19.0), makeMarker('b', 47.5, 19.0)])
    const m = makeMap(8)
    const mapRef = shallowRef<LMap | null>(m.map)

    const { instance, unmount } = mountComposable(() => useMarkerSpreading(markers, mapRef))
    await nextTick()
    const lenBefore = instance.spread.value.length

    markers.value = [
      makeMarker('a', 47.5, 19.0),
      makeMarker('b', 47.5, 19.0),
      makeMarker('c', 47.5, 19.0),
    ]
    await nextTick()

    expect(instance.spread.value.length).toBe(lenBefore + 1)
    unmount()
  })

  it('passes markers through unchanged when enabled is false', async () => {
    const markers = ref([makeMarker('a', 47.5, 19.0), makeMarker('b', 47.5, 19.0)])
    const m = makeMap(8)
    const mapRef = shallowRef<LMap | null>(m.map)

    const { instance, unmount } = mountComposable(() =>
      useMarkerSpreading(markers, mapRef, { enabled: false })
    )
    await nextTick()

    expect(instance.spread.value).toEqual(markers.value)
    unmount()
  })
})

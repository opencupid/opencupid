import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref, shallowRef } from 'vue'

vi.mock('leaflet', () => {
  const latLng = vi.fn((lat: number, lng: number) => ({ lat, lng }))
  const point = vi.fn((x: number, y: number) => ({ x, y }))
  return { default: { latLng, point }, latLng, point }
})

import type { Map as LMap } from 'leaflet'
import { useMarkerSpreading } from '../useMarkerSpreading'

/**
 * Minimal Leaflet stub that records bound event handlers so tests can fire
 * map events synchronously. Keeps the composable wiring honest without
 * pulling in real Leaflet (which jsdom can't render anyway).
 */
type FakeMap = LMap & {
  fire: (evt: string) => void
  setZoom: (z: number) => void
}

function makeFakeMap(zoom = 11, size = { x: 800, y: 600 }): FakeMap {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>()
  const getZoom = vi.fn(() => zoom)
  const map = {
    getZoom,
    getSize: vi.fn(() => size),
    latLngToContainerPoint: vi.fn((ll: { lat: number; lng: number }) => ({
      x: ll.lng * 10,
      y: ll.lat * 10,
    })),
    containerPointToLatLng: vi.fn((p: { x: number; y: number }) => ({
      lat: p.y / 10,
      lng: p.x / 10,
    })),
    on: vi.fn((evt: string, cb: (...args: unknown[]) => void) => {
      if (!handlers.has(evt)) handlers.set(evt, new Set())
      handlers.get(evt)!.add(cb)
    }),
    off: vi.fn((evt: string, cb: (...args: unknown[]) => void) => {
      handlers.get(evt)?.delete(cb)
    }),
    fire: (evt: string) => handlers.get(evt)?.forEach((cb) => cb()),
    setZoom: (z: number) => getZoom.mockReturnValue(z),
  }
  return map as unknown as FakeMap
}

describe('useMarkerSpreading', () => {
  it('emits empty positions when the map ref is null', () => {
    const markers = ref<{ id: number; lat: number; lng: number }[]>([])
    const map = shallowRef<LMap | null>(null)
    const scope = effectScope()
    scope.run(() => {
      const { positions } = useMarkerSpreading(markers, map)
      expect(positions.value).toEqual([])
    })
    scope.stop()
  })

  it('plans positions when a map is attached', () => {
    const fakeMap = makeFakeMap()
    const markers = ref([{ id: 1, lat: 0, lng: 0 }])
    const map = shallowRef<LMap | null>(fakeMap)
    const scope = effectScope()
    scope.run(() => {
      const { positions } = useMarkerSpreading(markers, map)
      expect(positions.value).toHaveLength(1)
      expect(positions.value[0]!.marker.id).toBe(1)
    })
    scope.stop()
  })

  it('recomputes on zoomend / moveend / resize', () => {
    const fakeMap = makeFakeMap()
    const markers = ref([
      { id: 1, lat: 47, lng: 19 },
      { id: 2, lat: 47, lng: 19 },
    ])
    const map = shallowRef<LMap | null>(fakeMap)
    const scope = effectScope()
    scope.run(() => {
      const { positions } = useMarkerSpreading(markers, map)
      // Initial: 2 colocated → spread.
      expect(positions.value.every((p) => p.spread)).toBe(true)

      // Zoom past disableAtZoom → no spreading on the next event.
      ;(fakeMap as unknown as { setZoom: (z: number) => void }).setZoom(15)
      ;(fakeMap as unknown as { fire: (e: string) => void }).fire('zoomend')
      expect(positions.value.every((p) => !p.spread)).toBe(true)

      // Pan/resize at low zoom — spreading is back.
      ;(fakeMap as unknown as { setZoom: (z: number) => void }).setZoom(10)
      ;(fakeMap as unknown as { fire: (e: string) => void }).fire('moveend')
      expect(positions.value.every((p) => p.spread)).toBe(true)
    })
    scope.stop()
  })

  it('recomputes when the markers ref changes', async () => {
    const fakeMap = makeFakeMap()
    const markers = ref<{ id: number; lat: number; lng: number }[]>([])
    const map = shallowRef<LMap | null>(fakeMap)
    const scope = effectScope()
    let positionsRef!: ReturnType<
      typeof useMarkerSpreading<{ id: number; lat: number; lng: number }>
    >['positions']
    scope.run(() => {
      positionsRef = useMarkerSpreading(markers, map).positions
    })
    expect(positionsRef.value).toHaveLength(0)
    markers.value = [{ id: 1, lat: 0, lng: 0 }]
    await nextTick()
    expect(positionsRef.value).toHaveLength(1)
    scope.stop()
  })

  it('detaches all map listeners when the scope is disposed', () => {
    const fakeMap = makeFakeMap()
    const markers = ref([{ id: 1, lat: 0, lng: 0 }])
    const map = shallowRef<LMap | null>(fakeMap)
    const scope = effectScope()
    scope.run(() => {
      useMarkerSpreading(markers, map)
    })
    scope.stop()
    expect(fakeMap.off).toHaveBeenCalledWith('zoomend', expect.any(Function))
    expect(fakeMap.off).toHaveBeenCalledWith('moveend', expect.any(Function))
    expect(fakeMap.off).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('emits empty when container has zero dimensions', () => {
    const fakeMap = makeFakeMap(11, { x: 0, y: 0 })
    const markers = ref([{ id: 1, lat: 0, lng: 0 }])
    const map = shallowRef<LMap | null>(fakeMap)
    const scope = effectScope()
    scope.run(() => {
      const { positions } = useMarkerSpreading(markers, map)
      expect(positions.value).toEqual([])
    })
    scope.stop()
  })
})

import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

// jsdom does not provide ResizeObserver — stub it so createLeafletMap() can
// call `new ResizeObserver(cb)` / `.observe()` / `.disconnect()` without error.
// Store callbacks so tests can trigger resize events.
const resizeObserverCallbacks: Array<() => void> = []
const ResizeObserverStub = vi.fn(function (cb: () => void) {
  resizeObserverCallbacks.push(cb)
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
})
vi.stubGlobal('ResizeObserver', ResizeObserverStub)
afterAll(() => vi.unstubAllGlobals())

// Track created markers and their icons
const createdMarkers: { latLng: [number, number]; opts: any; icon?: any }[] = []

// Mock leaflet before imports
vi.mock('leaflet', () => {
  const divIcon = vi.fn((opts: any) => ({ _type: 'divIcon', ...opts }))

  const markerProto = {
    bindPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
    setIcon: vi.fn(function (this: any, icon: any) {
      this._icon = icon
      return this
    }),
    getLatLng: vi.fn(() => ({ lat: 47, lng: 19 })),
    _icon: null as any,
  }

  /** Each marker gets its own `on` spy so we can extract per-marker handlers. */
  const marker = vi.fn((latLng: [number, number], opts: any) => {
    const perMarkerOn = vi.fn().mockReturnThis()
    const m = { ...markerProto, on: perMarkerOn, _icon: opts?.icon }
    createdMarkers.push({ latLng, opts, icon: opts?.icon })
    return m
  })

  const layerGroupProto = {
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  }
  const layerGroup = vi.fn(() => ({ ...layerGroupProto }))

  const latLngBounds = vi.fn(() => ({
    contains: vi.fn((latlng: { lat?: number }) => latlng?.lat === 47),
  }))
  const point = vi.fn((x: number, y: number) => ({ x, y }))

  const mapProto = {
    setView: vi.fn().mockReturnThis(),
    flyTo: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),

    getZoom: vi.fn(() => 10),
    getSize: vi.fn(() => ({ x: 1000, y: 800 })),
    invalidateSize: vi.fn().mockReturnThis(),
    getCenter: vi.fn(() => ({ lat: 47, lng: 19 })),
    latLngToLayerPoint: vi.fn((latlng: { lat: number; lng: number }) => ({
      x: latlng.lng * 10,
      y: latlng.lat * 10,
    })),
    layerPointToLatLng: vi.fn((p: { x: number; y: number }) => ({
      lat: p.y / 10,
      lng: p.x / 10,
    })),
    on: vi.fn().mockReturnThis(),
    once: vi.fn(function (this: any, _event: string, cb: () => void) {
      cb()
      return this
    }),
    off: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    addLayer: vi.fn(),
  }
  const mapFn = vi.fn(() => ({ ...mapProto }))

  const tileLayerProto = {
    addTo: vi.fn().mockReturnThis(),
    once: vi.fn(function (this: any, _event: string, cb: () => void) {
      cb()
      return this
    }),
  }
  const tileLayer = vi.fn(() => ({ ...tileLayerProto }))

  const DomEvent = {
    on: vi.fn(),
    off: vi.fn(),
    stopPropagation: vi.fn((e: any) => e?.stopPropagation?.()),
  }

  const Browser = { touch: false, mobile: false }

  return {
    default: {
      map: mapFn,
      marker,
      divIcon,
      layerGroup,
      latLngBounds,
      point,
      tileLayer,
      DomEvent,
      Browser,
    },
    Map: mapFn,
    Marker: marker,
    map: mapFn,
    marker,
    divIcon,
    layerGroup,
    latLngBounds,
    point,
    tileLayer,
    DomEvent,
    Browser,
  }
})

// Mock OMS — provides a minimal stub for addMarker/removeMarker/clearMarkers/addListener
const omsInstance = {
  addMarker: vi.fn().mockReturnThis(),
  removeMarker: vi.fn().mockReturnThis(),
  clearMarkers: vi.fn().mockReturnThis(),
  addListener: vi.fn().mockReturnThis(),
}
vi.mock('ts-overlapping-marker-spiderfier-leaflet', () => ({
  OverlappingMarkerSpiderfier: vi.fn(() => omsInstance),
}))

// Mock blurhash (canvas unavailable in jsdom)
vi.mock('@/features/images/composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:image/png;blurhash=${hash}`,
}))

import { mount, flushPromises } from '@vue/test-utils'
import OsmPoiMap from '../OsmPoiMap.vue'
import { POI_ICON_SIZE } from '../mapUtils'
import L from 'leaflet'

const DummyPopup = defineComponent({
  props: ['item'],
  render() {
    return h('div', `popup-${this.item?.id}`)
  },
})

const DummyIcon = defineComponent({
  props: ['image', 'isSelected', 'isHighlighted'],
  render() {
    return h('img', {
      src: this.image?.variants?.[0]?.url,
      class: { 'poi-avatar': true, highlighted: this.isHighlighted },
    })
  },
})

function makeImage(url: string, blurhash?: string) {
  return { blurhash: blurhash ?? null, variants: [{ size: 'thumb', url }] }
}

const items = [
  {
    id: '1',
    location: { lat: 47.5, lon: 19.0 },
    title: 'Alice',
    image: makeImage('https://img/alice.jpg'),
    source: { name: 'Alice' },
  },
  {
    id: '2',
    location: { lat: 48.2, lon: 16.3 },
    title: 'Bob',
    image: makeImage('https://img/bob.jpg'),
    source: { name: 'Bob' },
  },
  {
    id: '3',
    location: { lat: 46.0, lon: 18.0 },
    title: 'Carol',
    image: makeImage('https://img/carol.jpg'),
    source: { name: 'Carol' },
  },
]

async function mountMap(props: Partial<Record<string, any>> = {}) {
  const testItems = props.items ?? items
  delete props.items

  const wrapper = mount(OsmPoiMap as any, {
    props: {
      items: [],
      iconComponent: DummyIcon,
      popupComponent: DummyPopup,
      ...props,
    },
    attachTo: document.body,
  })

  // Simulate real app flow: items arrive after mount via reactive update
  await wrapper.setProps({ items: testItems })
  return wrapper
}

beforeEach(() => {
  createdMarkers.length = 0
  resizeObserverCallbacks.length = 0
  vi.clearAllMocks()
  omsInstance.addMarker.mockReturnThis()
  omsInstance.removeMarker.mockReturnThis()
  omsInstance.clearMarkers.mockReturnThis()
  omsInstance.addListener.mockReturnThis()
})

describe('OsmPoiMap', () => {
  it('creates markers for items with images using iconComponent', async () => {
    await mountMap()
    await flushPromises()

    expect(L.marker).toHaveBeenCalledTimes(3)

    const calls = (L.marker as any).mock.calls

    // All items have images → rendered via iconComponent
    expect(calls[0][1].icon.className).toBe('poi-avatar-icon')
    expect(calls[1][1].icon.className).toBe('poi-avatar-icon')
    expect(calls[2][1].icon.className).toBe('poi-avatar-icon')
  })

  it('renders markers for items without image property', async () => {
    const noImageItems = items.map(({ image, ...rest }) => rest)
    await mountMap({ items: noImageItems })
    await flushPromises()

    expect(L.marker).toHaveBeenCalledTimes(noImageItems.length)
  })

  it('uses raster tile layer from MAP_TILE_URL config', async () => {
    const tileUrl = 'https://tiles.example.com/{z}/{x}/{y}.png'
    ;(globalThis as any).__APP_CONFIG__ = { ...__APP_CONFIG__, MAP_TILE_URL: tileUrl }
    await mountMap()
    await flushPromises()

    expect(L.tileLayer).toHaveBeenCalledOnce()
    const [url] = (L.tileLayer as any).mock.calls[0]
    expect(url).toBe(tileUrl)
    ;(globalThis as any).__APP_CONFIG__ = { ...__APP_CONFIG__, MAP_TILE_URL: '' }
  })

  it('skips tile layer and logs error when MAP_TILE_URL is empty', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mountMap()
    await flushPromises()

    expect(L.tileLayer).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('MAP_TILE_URL'))
    errorSpy.mockRestore()
  })

  it('calls popup.update() on nextTick after popupopen to re-measure teleported content', async () => {
    await mountMap()
    await flushPromises()

    // Get the first created marker instance
    const markerInstance = (L.marker as any).mock.results[0].value
    const onCalls = markerInstance.on.mock.calls

    // Find the popupopen handler
    const popupopenCall = onCalls.find((c: any) => c[0] === 'popupopen')
    expect(popupopenCall).toBeDefined()
    const handler = popupopenCall[1]

    // Create a fake popup event with an update spy
    const popupUpdate = vi.fn()
    const fakeEvent = {
      popup: {
        getElement: () => {
          const el = document.createElement('div')
          const content = document.createElement('div')
          content.className = 'leaflet-popup-content'
          el.appendChild(content)
          return el
        },
        update: popupUpdate,
      },
    }

    // Fire the handler — update() should NOT have been called yet (it waits for nextTick)
    handler(fakeEvent)
    expect(popupUpdate).not.toHaveBeenCalled()

    // After nextTick, popup.update() should be called
    await nextTick()
    expect(popupUpdate).toHaveBeenCalledOnce()
  })

  it(`uses ${POI_ICON_SIZE}×${POI_ICON_SIZE} iconSize for avatar icons`, async () => {
    await mountMap()
    await flushPromises()

    const calls = (L.marker as any).mock.calls
    const aliceIcon = calls[0][1].icon
    expect(aliceIcon.iconSize).toEqual([POI_ICON_SIZE, POI_ICON_SIZE])
    expect(aliceIcon.iconAnchor).toEqual([POI_ICON_SIZE / 2, POI_ICON_SIZE / 2])
  })

  it('emits bounds-changed on moveend with viewport bounds', async () => {
    vi.useFakeTimers()
    const wrapper = await mountMap()
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value
    const moveendHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')[1]

    mapInstance.getBounds = vi.fn(() => ({
      getSouth: () => 45.0,
      getNorth: () => 48.0,
      getWest: () => 16.0,
      getEast: () => 23.0,
    }))

    moveendHandler()
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('bounds-changed')).toBeTruthy()
    expect(wrapper.emitted('bounds-changed')![0]).toEqual([
      { bounds: { south: 45.0, north: 48.0, west: 16.0, east: 23.0 }, zoom: expect.any(Number) },
    ])

    vi.useRealTimers()
  })

  it('registers moveend listener during map init', async () => {
    await mountMap()
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value
    const moveendCall = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')
    expect(moveendCall).toBeDefined()
  })

  it('flyTo uses lastStableZoom from zoomend, not mid-animation getZoom', async () => {
    const wrapper = await mountMap({ center: [47.0, 19.0] as [number, number], zoom: 7 })
    await flushPromises()

    // The map instance returned by L.map shares mapProto references
    const mapInstance = (L.map as any).mock.results[0].value

    // Find the zoomend handler registered during ensureMap()
    const zoomendCall = mapInstance.on.mock.calls.find((c: any) => c[0] === 'zoomend')
    expect(zoomendCall).toBeDefined()
    const zoomendHandler = zoomendCall[1]

    // Simulate user zooming to 15: getZoom returns 15 when zoomend fires
    mapInstance.getZoom.mockReturnValue(15)
    zoomendHandler()

    // Simulate a mid-flyTo state where getZoom would return an intermediate value
    mapInstance.getZoom.mockReturnValue(3)

    // Change center — flyTo should use lastStableZoom (15), not the mid-animation value (3)
    await wrapper.setProps({ center: [48.0, 20.0] as [number, number] })
    await nextTick()

    expect(mapInstance.flyTo).toHaveBeenCalledWith([48.0, 20.0], 15, { duration: 1 })
  })

  it('initializes at world view when no center is provided', async () => {
    await mountMap()
    await flushPromises()

    const mapCall = (L.map as any).mock.calls[0][1]
    expect(mapCall.center).toEqual([0, 0])
    expect(mapCall.zoom).toBe(2)
  })

  it('auto-fits to markers when no center is provided', async () => {
    await mountMap()
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value
    expect(mapInstance.fitBounds).toHaveBeenCalled()
  })

  it('does not auto-fit to markers when center is provided', async () => {
    await mountMap({ center: [48.0, 16.0] as [number, number] })
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value
    expect(mapInstance.fitBounds).not.toHaveBeenCalled()
  })

  it('defers flyTo when container has zero dimensions and replays on resize', async () => {
    const wrapper = await mountMap({ center: [47.0, 19.0] as [number, number], zoom: 7 })
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value

    // Simulate zoomend so lastStableZoom is set
    const zoomendHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'zoomend')[1]
    mapInstance.getZoom.mockReturnValue(10)
    zoomendHandler()

    // Simulate zero-size container (KeepAlive deactivation)
    mapInstance.getSize.mockReturnValue({ x: 0, y: 0 })
    mapInstance.flyTo.mockClear()

    // Change center while hidden — flyTo should be deferred, not called
    await wrapper.setProps({ center: [50.0, 14.0] as [number, number] })
    await nextTick()
    expect(mapInstance.flyTo).not.toHaveBeenCalled()

    // Restore non-zero size and trigger the ResizeObserver callback
    mapInstance.getSize.mockReturnValue({ x: 1000, y: 800 })

    const roCallback = resizeObserverCallbacks[resizeObserverCallbacks.length - 1]!
    roCallback()
    expect(mapInstance.flyTo).toHaveBeenCalledWith([50.0, 14.0], 10, { duration: 1 })
  })

  it('suppresses bounds-changed when container has zero dimensions', async () => {
    vi.useFakeTimers()
    const wrapper = await mountMap()
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value
    const moveendHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')[1]

    mapInstance.getBounds = vi.fn(() => ({
      getSouth: () => 45.0,
      getNorth: () => 48.0,
      getWest: () => 16.0,
      getEast: () => 23.0,
    }))

    mapInstance.getSize.mockReturnValue({ x: 0, y: 0 })
    moveendHandler()
    vi.advanceTimersByTime(300)
    expect(wrapper.emitted('bounds-changed')).toBeFalsy()

    mapInstance.getSize.mockReturnValue({ x: 1000, y: 800 })
    moveendHandler()
    vi.advanceTimersByTime(300)
    expect(wrapper.emitted('bounds-changed')).toBeTruthy()

    vi.useRealTimers()
  })

  it('suppresses bounds-changed during programmatic fitBounds from updateMarkers', async () => {
    vi.useFakeTimers()

    // Mount with no items initially — map.once callback fires immediately in mock
    // so suppressBoundsEmit is already cleared. Now we make once NOT call back
    // immediately to simulate the real async moveend.
    const wrapper = await mountMap({ items: [] })
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value
    const moveendHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')[1]

    mapInstance.getBounds = vi.fn(() => ({
      getSouth: () => 45.0,
      getNorth: () => 48.0,
      getWest: () => 16.0,
      getEast: () => 23.0,
    }))

    // Override once to NOT auto-fire (simulates real Leaflet where moveend
    // hasn't fired yet after fitBounds)
    let pendingOnceCallback: (() => void) | null = null
    mapInstance.once = vi.fn((_event: string, cb: () => void) => {
      pendingOnceCallback = cb
      return mapInstance
    })

    // Now set items — triggers updateMarkers → fitBounds → suppressBoundsEmit = true
    await wrapper.setProps({ items })
    await flushPromises()

    // moveend fires while suppress is active
    moveendHandler()
    vi.advanceTimersByTime(300)
    expect(wrapper.emitted('bounds-changed')).toBeFalsy()

    // Simulate the real moveend from fitBounds completing — clears suppress
    pendingOnceCallback!()

    // Now a user-initiated moveend should emit
    moveendHandler()
    vi.advanceTimersByTime(300)
    expect(wrapper.emitted('bounds-changed')).toBeTruthy()

    vi.useRealTimers()
  })

  it('debounces bounds-changed emission on rapid moveend events', async () => {
    vi.useFakeTimers()
    const wrapper = await mountMap()
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value
    const moveendHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')[1]

    mapInstance.getBounds = vi.fn(() => ({
      getSouth: () => 45.0,
      getNorth: () => 48.0,
      getWest: () => 16.0,
      getEast: () => 23.0,
    }))

    moveendHandler()
    moveendHandler()
    moveendHandler()

    expect(wrapper.emitted('bounds-changed')).toBeFalsy()

    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('bounds-changed')).toHaveLength(1)
    expect(wrapper.emitted('bounds-changed')![0]).toEqual([
      { bounds: { south: 45.0, north: 48.0, west: 16.0, east: 23.0 }, zoom: expect.any(Number) },
    ])

    vi.useRealTimers()
  })

  describe('diff-based updateMarkers', () => {
    it('adds only new markers without clearing existing ones on items update', async () => {
      const wrapper = await mountMap({ items: [items[0]] })
      await flushPromises()

      const initialMarkerCount = (L.marker as any).mock.calls.length
      expect(initialMarkerCount).toBe(1)

      const pointLayerInstance = (L.layerGroup as any).mock.results[0].value

      // Update: add one more item
      await wrapper.setProps({ items: [items[0], items[1]] })
      await flushPromises()

      // Should have created only 1 additional marker (not cleared + rebuilt 2)
      expect((L.marker as any).mock.calls.length).toBe(initialMarkerCount + 1)
      // addLayer should have been called for the new marker
      expect(pointLayerInstance.addLayer).toHaveBeenCalled()

      // Trigger another update with same items — no new markers should be created
      const markerCountBefore = (L.marker as any).mock.calls.length
      await wrapper.setProps({ items: [items[0], items[1]] })
      await flushPromises()
      // Same array reference won't trigger the watcher, so force with a new array
      await wrapper.setProps({ items: [...[items[0], items[1]]] })
      await flushPromises()
      expect((L.marker as any).mock.calls.length).toBe(markerCountBefore)
    })

    it('removes stale markers when items are removed', async () => {
      const wrapper = await mountMap({ items: [items[0], items[1]] })
      await flushPromises()

      const pointLayerInstance = (L.layerGroup as any).mock.results[0].value

      // Remove the second item
      await wrapper.setProps({ items: [items[0]] })
      await flushPromises()

      expect(pointLayerInstance.removeLayer).toHaveBeenCalled()
    })

    it('updates marker icon in place when highlighted changes', async () => {
      const item0 = { ...items[0], highlighted: false }
      const wrapper = await mountMap({ items: [item0] })
      await flushPromises()

      const markerInstance = (L.marker as any).mock.results[0].value

      // Change highlighted flag
      const item0Highlighted = { ...items[0], highlighted: true }
      await wrapper.setProps({ items: [item0Highlighted] })
      await flushPromises()

      // Marker should have been updated in-place via setIcon
      expect(markerInstance.setIcon).toHaveBeenCalled()
      // No new markers should have been created
      expect((L.marker as any).mock.calls.length).toBe(1)
    })
  })
})

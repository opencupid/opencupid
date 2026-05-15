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

// jsdom lacks matchMedia; stub it because supportsHover() consults it during
// marker creation to detect hover-capable devices. Use matches: true so
// desktop-hover popup behavior is exercised by these tests.
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: vi.fn((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

afterAll(() => vi.unstubAllGlobals())

// Track created markers and their icons
const createdMarkers: { latLng: [number, number]; opts: any; icon?: any }[] = []

// Mock leaflet before imports
vi.mock('leaflet', () => {
  const divIcon = vi.fn((opts: any) => ({ _type: 'divIcon', ...opts }))

  /** Each marker gets its own `on` and `setLatLng` spy so we can extract
   * per-marker handlers and assert reflows independently. */
  const marker = vi.fn((latLng: [number, number], opts: any) => {
    const perMarkerOn = vi.fn().mockReturnThis()
    const setLatLng = vi.fn().mockReturnThis()
    const m = {
      _icon: opts?.icon,
      _latLng: latLng,
      on: perMarkerOn,
      bindPopup: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      openPopup: vi.fn().mockReturnThis(),
      closePopup: vi.fn().mockReturnThis(),
      setIcon: vi.fn(function (this: any, icon: any) {
        this._icon = icon
        return this
      }),
      setLatLng,
      getLatLng: vi.fn(() => ({ lat: latLng[0], lng: latLng[1], distanceTo: vi.fn(() => 0) })),
    }
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

  const latLng = vi.fn((lat: number, lng: number) => ({ lat, lng }))
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
    getBounds: vi.fn(() => ({
      getSouth: () => 45.0,
      getNorth: () => 48.0,
      getWest: () => 16.0,
      getEast: () => 23.0,
    })),
    invalidateSize: vi.fn().mockReturnThis(),
    getCenter: vi.fn(() => ({ lat: 47, lng: 19 })),
    latLngToContainerPoint: vi.fn((latlng: any) => {
      const lat = Array.isArray(latlng) ? latlng[0] : latlng.lat
      const lng = Array.isArray(latlng) ? latlng[1] : latlng.lng
      return { x: lng * 10, y: -lat * 10 }
    }),
    containerPointToLatLng: vi.fn((p: any) => {
      const x = Array.isArray(p) ? p[0] : p.x
      const y = Array.isArray(p) ? p[1] : p.y
      return { lat: -y / 10, lng: x / 10 }
    }),
    on: vi.fn().mockReturnThis(),
    once: vi.fn(function (this: any, _event: string, cb: () => void) {
      cb()
      return this
    }),
    off: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    addLayer: vi.fn(),
    createPane: vi.fn(() => document.createElement('div')),
    closePopup: vi.fn().mockReturnThis(),
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

  const control = { zoom: vi.fn(() => ({ addTo: vi.fn() })) }

  return {
    default: {
      map: mapFn,
      marker,
      divIcon,
      layerGroup,
      latLng,
      latLngBounds,
      point,
      tileLayer,
      DomEvent,
      Browser,
      control,
    },
    Map: mapFn,
    Marker: marker,
    map: mapFn,
    marker,
    divIcon,
    layerGroup,
    latLng,
    latLngBounds,
    point,
    tileLayer,
    DomEvent,
    Browser,
    control,
  }
})

// Mock blurhash (canvas unavailable in jsdom)
vi.mock('@/features/images/composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:image/png;blurhash=${hash}`,
}))

import { mount, flushPromises } from '@vue/test-utils'
import OsmPoiMap from '../OsmPoiMap.vue'
import { POI_ICON_SIZE } from '../../utils/mapUtils'
import { MAP_DEFAULT_ZOOM } from '@shared/maps'
import type { MapPoi } from '../../types/map.types'
import L from 'leaflet'

const DummyPopup = defineComponent({
  props: ['item'],
  render() {
    return h('div', `popup-${this.item?.id}`)
  },
})

const DummyIcon = (props: {
  image?: { url?: string; blurhash?: string | null }
  isHighlighted?: boolean
}) => {
  const url = props.image?.url ?? ''
  const cls = props.isHighlighted ? 'poi-avatar highlighted' : 'poi-avatar'
  return `<img src="${url}" class="${cls}"/>`
}

function makeImage(url: string, blurhash?: string) {
  return { url, blurhash: blurhash ?? null }
}

function makePoi(overrides: Partial<MapPoi> & { id: string; lat: number; lon: number }): MapPoi {
  return {
    type: 'point',
    kind: 'profile',
    publicName: '',
    image: null,
    highlighted: false,
    ...overrides,
  } as MapPoi
}

const items: MapPoi[] = [
  makePoi({
    id: '1',
    lat: 47.5,
    lon: 19.0,
    publicName: 'Alice',
    image: makeImage('https://img/alice.jpg'),
  }),
  makePoi({
    id: '2',
    lat: 48.2,
    lon: 16.3,
    publicName: 'Bob',
    image: makeImage('https://img/bob.jpg'),
  }),
  makePoi({
    id: '3',
    lat: 46.0,
    lon: 18.0,
    publicName: 'Carol',
    image: makeImage('https://img/carol.jpg'),
  }),
]

async function mountMap(props: Partial<Record<string, any>> = {}) {
  const testItems = props.items ?? items
  delete props.items

  const wrapper = mount(OsmPoiMap as any, {
    props: {
      items: [],
      iconResolver: () => DummyIcon,
      popupResolver: () => DummyPopup,
      initialCenter: [47.0, 19.0] as [number, number],
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
})

describe('OsmPoiMap', () => {
  it('creates markers for items with images using iconResolver', async () => {
    await mountMap()
    await flushPromises()

    expect(L.marker).toHaveBeenCalledTimes(3)

    const calls = (L.marker as any).mock.calls

    // All items have images → rendered via iconResolver
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
        isOpen: () => true,
      },
    }

    // Fire the async handler and wait for it + nextTick to complete
    await handler(fakeEvent)
    await flushPromises()
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

  it('emits bounds:changed on moveend with viewport bounds', async () => {
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
    vi.advanceTimersByTime(500)

    expect(wrapper.emitted('bounds:changed')).toBeTruthy()
    expect(wrapper.emitted('bounds:changed')![0]).toEqual([
      { bounds: { south: 45.0, north: 48.0, west: 16.0, east: 23.0 }, zoom: expect.any(Number) },
    ])

    vi.useRealTimers()
  })

  it('registers moveend and zoomend listeners during map init', async () => {
    await mountMap()
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value
    const moveendCall = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')
    const zoomendCall = mapInstance.on.mock.calls.find((c: any) => c[0] === 'zoomend')
    expect(moveendCall).toBeDefined()
    expect(zoomendCall).toBeDefined()
  })

  it('initializes at the provided initialCenter and the default zoom', async () => {
    await mountMap({ initialCenter: [47.0, 19.0] as [number, number] })
    await flushPromises()

    const mapCall = (L.map as any).mock.calls[0][1]
    expect(mapCall.center).toEqual([47.0, 19.0])
    expect(mapCall.zoom).toBe(MAP_DEFAULT_ZOOM)
  })

  it('defers highlightedLocation when container has zero dimensions and replays on resize', async () => {
    const wrapper = await mountMap({ initialCenter: [47.0, 19.0] as [number, number] })
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value

    // Simulate zero-size container (KeepAlive deactivation)
    mapInstance.getSize.mockReturnValue({ x: 0, y: 0 })
    mapInstance.flyTo.mockClear()

    // Change highlightedLocation while hidden — flyTo should not fire
    await wrapper.setProps({ highlightedLocation: [50.0, 14.0] as [number, number] })
    await nextTick()
    expect(mapInstance.flyTo).not.toHaveBeenCalled()

    // Restore non-zero size and trigger the ResizeObserver callback
    mapInstance.getSize.mockReturnValue({ x: 1000, y: 800 })

    const roCallback = resizeObserverCallbacks[resizeObserverCallbacks.length - 1]!
    roCallback()

    // Deferred highlight is drained: flyTo to the search-focus zoom
    expect(mapInstance.flyTo).toHaveBeenCalledWith([50.0, 14.0], 12, { duration: 1 })
  })

  it('suppresses bounds:changed when container has zero dimensions', async () => {
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
    vi.advanceTimersByTime(500)
    expect(wrapper.emitted('bounds:changed')).toBeFalsy()

    mapInstance.getSize.mockReturnValue({ x: 1000, y: 800 })
    moveendHandler()
    vi.advanceTimersByTime(500)
    expect(wrapper.emitted('bounds:changed')).toBeTruthy()

    vi.useRealTimers()
  })

  it('debounces bounds:changed emission on rapid moveend events', async () => {
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

    expect(wrapper.emitted('bounds:changed')).toBeFalsy()

    vi.advanceTimersByTime(500)

    expect(wrapper.emitted('bounds:changed')).toHaveLength(1)
    expect(wrapper.emitted('bounds:changed')![0]).toEqual([
      { bounds: { south: 45.0, north: 48.0, west: 16.0, east: 23.0 }, zoom: expect.any(Number) },
    ])

    vi.useRealTimers()
  })

  describe('highlightedLocation', () => {
    it('flies to the point at the search-focus zoom', async () => {
      const wrapper = await mountMap()
      await flushPromises()

      const mapInstance = (L.map as any).mock.results[0].value
      mapInstance.flyTo.mockClear()

      await wrapper.setProps({ highlightedLocation: [47.5, 19.0] as [number, number] })
      await flushPromises()

      expect(mapInstance.flyTo).toHaveBeenCalledWith([47.5, 19.0], 12, { duration: 1 })
    })

    it('flies again on subsequent highlightedLocation change', async () => {
      const wrapper = await mountMap()
      await flushPromises()

      const mapInstance = (L.map as any).mock.results[0].value

      await wrapper.setProps({ highlightedLocation: [47.5, 19.0] as [number, number] })
      await flushPromises()
      mapInstance.flyTo.mockClear()

      await wrapper.setProps({ highlightedLocation: [48.0, 16.3] as [number, number] })
      await flushPromises()

      expect(mapInstance.flyTo).toHaveBeenCalledWith([48.0, 16.3], 12, { duration: 1 })
    })
  })

  describe('marker lifecycle', () => {
    it('adds only new markers without recreating existing ones on items update', async () => {
      const wrapper = await mountMap({ items: [items[0]] })
      await flushPromises()

      const initialMarkerCount = (L.marker as any).mock.calls.length
      expect(initialMarkerCount).toBe(1)

      const pointLayerInstance = (L.layerGroup as any).mock.results[0].value

      // Update: add one more item
      await wrapper.setProps({ items: [items[0], items[1]] })
      await flushPromises()

      // Should have created only 1 additional marker
      expect((L.marker as any).mock.calls.length).toBe(initialMarkerCount + 1)
      expect(pointLayerInstance.addLayer).toHaveBeenCalled()

      // Trigger another update with same items — no new markers should be created
      const markerCountBefore = (L.marker as any).mock.calls.length
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

    it('emits item:select when a marker is clicked', async () => {
      const wrapper = await mountMap({ items: [items[0]] })
      await flushPromises()

      const markerInstance = (L.marker as any).mock.results[0].value
      const clickHandler = markerInstance.on.mock.calls.find((c: any) => c[0] === 'click')?.[1]
      expect(clickHandler).toBeDefined()

      clickHandler()
      expect(wrapper.emitted('item:select')).toBeTruthy()
      expect(wrapper.emitted('item:select')![0]).toEqual(['1'])
    })
  })

  describe('density spreading', () => {
    it('reflows existing markers via setLatLng when zoom changes', async () => {
      // Two colocated markers — the spreader will offset them, then a
      // zoom change re-runs the layout and calls setLatLng to animate
      // them to new positions.
      const colocated: MapPoi[] = [
        makePoi({ id: 'a', lat: 47.5, lon: 19.0, publicName: 'A' }),
        makePoi({ id: 'b', lat: 47.5, lon: 19.0, publicName: 'B' }),
      ]
      await mountMap({ items: colocated })
      await flushPromises()

      const markerA = (L.marker as any).mock.results[0].value
      const markerB = (L.marker as any).mock.results[1].value

      // Spread positions should already differ between A and B
      expect(markerA._latLng).not.toEqual(markerB._latLng)

      const mapInstance = (L.map as any).mock.results[0].value
      const zoomendHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'zoomend')[1]

      markerA.setLatLng.mockClear()
      markerB.setLatLng.mockClear()
      mapInstance.getZoom.mockReturnValue(13)
      zoomendHandler()

      expect(markerA.setLatLng).toHaveBeenCalled()
      expect(markerB.setLatLng).toHaveBeenCalled()

      // Restore the shared getZoom mock so later tests in the suite are
      // not silently driven into the no-spread cutoff path. vi.clearAllMocks
      // in beforeEach clears call history but not return values.
      mapInstance.getZoom.mockReturnValue(10)
    })

    it('places colocated markers at distinct lat/lng on creation', async () => {
      const colocated: MapPoi[] = [
        makePoi({ id: 'a', lat: 47.5, lon: 19.0, publicName: 'A' }),
        makePoi({ id: 'b', lat: 47.5, lon: 19.0, publicName: 'B' }),
        makePoi({ id: 'c', lat: 47.5, lon: 19.0, publicName: 'C' }),
      ]
      await mountMap({ items: colocated })
      await flushPromises()

      const positions = (L.marker as any).mock.calls.map((c: any) => `${c[0][0]},${c[0][1]}`)
      expect(new Set(positions).size).toBe(3)
    })
  })

  describe('popup data fetching', () => {
    it('calls fetchPopupData and updates popupItem with full data', async () => {
      const fetchPopupData = vi.fn().mockResolvedValue({ name: 'Alice Full' })
      await mountMap({ fetchPopupData })
      await flushPromises()

      const markerInstance = (L.marker as any).mock.results[0].value
      const popupopenCall = markerInstance.on.mock.calls.find((c: any) => c[0] === 'popupopen')
      const handler = popupopenCall[1]

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
          isOpen: () => true,
        },
      }

      await handler(fakeEvent)
      await flushPromises()
      await nextTick()

      expect(fetchPopupData).toHaveBeenCalledWith('1', expect.any(AbortSignal))
      expect(popupUpdate).toHaveBeenCalled()
    })

    it('does not update popupItem when fetchPopupData rejects', async () => {
      const fetchPopupData = vi.fn().mockRejectedValue(new Error('network'))
      await mountMap({ fetchPopupData })
      await flushPromises()

      const markerInstance = (L.marker as any).mock.results[0].value
      const popupopenCall = markerInstance.on.mock.calls.find((c: any) => c[0] === 'popupopen')
      const handler = popupopenCall[1]

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
          isOpen: () => true,
        },
      }

      // Should not throw
      await handler(fakeEvent)
      await flushPromises()
    })

    it('skips popup update when popup is closed before fetch resolves', async () => {
      let resolvePromise: (v: unknown) => void
      const fetchPopupData = vi.fn(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )
      await mountMap({ fetchPopupData })
      await flushPromises()

      const markerInstance = (L.marker as any).mock.results[0].value
      const popupopenCall = markerInstance.on.mock.calls.find((c: any) => c[0] === 'popupopen')
      const handler = popupopenCall[1]

      const popupUpdate = vi.fn()
      let isOpen = true
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
          isOpen: () => isOpen,
        },
      }

      const handlerPromise = handler(fakeEvent)

      // Close the popup before the fetch resolves
      isOpen = false
      resolvePromise!({ name: 'Alice Full' })

      await handlerPromise
      await flushPromises()
      await nextTick()

      // popup.update should NOT have been called since popup closed
      expect(popupUpdate).not.toHaveBeenCalled()
    })
  })

  describe('init guard', () => {
    it('calls L.map exactly once even after reactive prop updates', async () => {
      const wrapper = await mountMap()
      await flushPromises()

      const mapCallsBefore = (L.map as any).mock.calls.length

      // Additional prop updates should not re-init the map
      await wrapper.setProps({ highlightedLocation: [48.0, 20.0] as [number, number] })
      await flushPromises()
      await wrapper.setProps({ items: [items[0]] })
      await flushPromises()

      expect((L.map as any).mock.calls.length).toBe(mapCallsBefore)
    })
  })
})

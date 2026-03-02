import { vi, describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

// Track created markers and their icons
const createdMarkers: { latLng: [number, number]; opts: any; icon?: any }[] = []

// Track cluster group interactions
const clusterGroupProto = {
  addLayer: vi.fn(),
  clearLayers: vi.fn(),
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  getBounds: vi.fn(() => ({})),
  options: {},
}

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
    off: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    addLayer: vi.fn(),
  }
  const mapFn = vi.fn(() => ({ ...mapProto }))

  const markerClusterGroup = vi.fn(() => ({
    ...clusterGroupProto,
    addLayer: vi.fn(),
    clearLayers: vi.fn(),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({})),
    options: {},
  }))

  const tileLayerProto = {
    addTo: vi.fn().mockReturnThis(),
  }
  const tileLayer = vi.fn(() => ({ ...tileLayerProto }))

  return {
    default: {
      map: mapFn,
      marker,
      divIcon,
      layerGroup,
      latLngBounds,
      markerClusterGroup,
      point,
      tileLayer,
    },
    Map: mapFn,
    Marker: marker,
    map: mapFn,
    marker,
    divIcon,
    layerGroup,
    latLngBounds,
    markerClusterGroup,
    point,
    tileLayer,
  }
})

// Mock leaflet.markercluster (it mutates L as a side effect)
vi.mock('leaflet.markercluster', () => ({}))
vi.mock('leaflet.markercluster/dist/MarkerCluster.css', () => ({}))
vi.mock('leaflet.markercluster/dist/MarkerCluster.Default.css', () => ({}))

// Mock MapTiler layer and CSS
vi.mock('@maptiler/leaflet-maptilersdk', () => {
  const MaptilerLayer = vi.fn(function MaptilerLayerMock() {
    return {
      addTo: vi.fn().mockReturnThis(),
      getMaptilerSDKMap: vi.fn(() => ({ once: vi.fn(), on: vi.fn() })),
    }
  })
  return { MaptilerLayer }
})
vi.mock('@maptiler/sdk/dist/maptiler-sdk.css', () => ({}))

import { mount, flushPromises } from '@vue/test-utils'
import OsmPoiMap from '../OsmPoiMap.vue'
import L from 'leaflet'

const DummyPopup = defineComponent({
  props: ['item'],
  render() {
    return h('div', `popup-${this.item?.id}`)
  },
})

interface TestItem {
  id: string
  location: { lat: number; lon: number }
  name: string
  imageUrl?: string
}

const items: TestItem[] = [
  { id: '1', location: { lat: 47.5, lon: 19.0 }, name: 'Alice', imageUrl: 'https://img/alice.jpg' },
  { id: '2', location: { lat: 48.2, lon: 16.3 }, name: 'Bob' },
  { id: '3', location: { lat: 46.0, lon: 18.0 }, name: 'Carol', imageUrl: 'https://img/carol.jpg' },
]

function mountMap(props: Partial<Record<string, any>> = {}) {
  return mount(OsmPoiMap as any, {
    props: {
      items,
      getLocation: (item: TestItem) => item.location,
      getTitle: (item: TestItem) => item.name,
      popupComponent: DummyPopup,
      ...props,
    },
    attachTo: document.body,
  })
}

beforeEach(() => {
  createdMarkers.length = 0
  vi.clearAllMocks()
})

describe('OsmPoiMap', () => {
  it('creates default dot icons when getImageUrl is not provided', async () => {
    mountMap()
    await flushPromises()

    // Should have created markers via L.marker
    expect(L.marker).toHaveBeenCalledTimes(3)

    // All icons should be divIcons (dot style), none should have poi-avatar class
    for (const call of (L.marker as any).mock.calls) {
      const icon = call[1]?.icon
      expect(icon).toBeDefined()
      expect(icon.html).not.toContain('poi-avatar')
    }
  })

  it('creates avatar icons when getImageUrl returns a URL', async () => {
    const getImageUrl = (item: TestItem) => item.imageUrl

    mountMap({ getImageUrl })
    await flushPromises()

    expect(L.marker).toHaveBeenCalledTimes(3)

    const calls = (L.marker as any).mock.calls

    // Alice (index 0) has imageUrl → avatar icon
    const aliceAvatarHtml = calls[0][1].icon.html.innerHTML
    expect(aliceAvatarHtml).toContain('poi-avatar')
    expect(aliceAvatarHtml).toContain('alice.jpg')
    expect(calls[0][1].icon.className).toBe('poi-avatar-icon')

    // Bob (index 1) has no imageUrl → dot icon
    expect(calls[1][1].icon.html).not.toContain('poi-avatar')
    expect(calls[1][1].icon.html).toContain('poi-dot')

    // Carol (index 2) has imageUrl → avatar icon
    const carolAvatarHtml = calls[2][1].icon.html.innerHTML
    expect(carolAvatarHtml).toContain('poi-avatar')
    expect(carolAvatarHtml).toContain('carol.jpg')
  })

  it('falls back to dot icon for items where getImageUrl returns undefined', async () => {
    const getImageUrl = (_item: TestItem) => undefined

    mountMap({ getImageUrl })
    await flushPromises()

    for (const call of (L.marker as any).mock.calls) {
      expect(call[1].icon.html).toContain('poi-dot')
    }
  })

  it('initializes a markerClusterGroup and adds markers to it', async () => {
    mountMap()
    await flushPromises()

    // Should have created a cluster group
    expect((L as any).markerClusterGroup).toHaveBeenCalledTimes(1)
    const clusterOpts = (L as any).markerClusterGroup.mock.calls[0][0]
    expect(clusterOpts.maxClusterRadius).toBe(40)
    expect(clusterOpts.zoomToBoundsOnClick).toBe(true)

    // Markers should be added to the cluster group, not directly to the map
    expect(L.marker).toHaveBeenCalledTimes(3)
  })

  it('registers spider and map movement event handlers', async () => {
    mountMap()
    await flushPromises()

    const clusterInstance = (L as any).markerClusterGroup.mock.results[0].value
    const clusterOnCalls = clusterInstance.on.mock.calls
    const clusterEventNames = clusterOnCalls.map((c: any) => c[0])
    expect(clusterEventNames).toContain('clustermouseover')
    expect(clusterEventNames).toContain('spiderfied')
    expect(clusterEventNames).toContain('unspiderfied')

    const mapInstance = (L.map as any).mock.results[0].value
    const mapEventNames = mapInstance.on.mock.calls.map((c: any) => c[0])
    expect(mapEventNames).toContain('mousemove')
    expect(mapEventNames).toContain('zoomstart movestart')
  })

  it('spiderfies cluster on clustermouseover', async () => {
    mountMap()
    await flushPromises()

    const clusterInstance = (L as any).markerClusterGroup.mock.results[0].value
    const onCalls = clusterInstance.on.mock.calls
    const mouseoverHandler = onCalls.find((c: any) => c[0] === 'clustermouseover')[1]

    const spiderfyMock = vi.fn()
    mouseoverHandler({ layer: { spiderfy: spiderfyMock } })

    expect(spiderfyMock).toHaveBeenCalledOnce()
  })

  it('closes active spider when mouse leaves hover bounds', async () => {
    mountMap()
    await flushPromises()

    const clusterInstance = (L as any).markerClusterGroup.mock.results[0].value
    const spiderfiedHandler = clusterInstance.on.mock.calls.find((c: any) => c[0] === 'spiderfied')[1]
    const mapInstance = (L.map as any).mock.results[0].value
    const mousemoveHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'mousemove')[1]

    const unspiderfyMock = vi.fn()
    spiderfiedHandler({
      cluster: {
        getAllChildMarkers: () => [],
        getLatLng: () => ({ lat: 47, lng: 19 }),
        unspiderfy: unspiderfyMock,
      },
    })

    mousemoveHandler({ latlng: { lat: 0, lng: 0 } })
    expect(unspiderfyMock).toHaveBeenCalledOnce()
  })

  it('keeps active spider when mouse stays inside hover bounds', async () => {
    mountMap()
    await flushPromises()

    const clusterInstance = (L as any).markerClusterGroup.mock.results[0].value
    const spiderfiedHandler = clusterInstance.on.mock.calls.find((c: any) => c[0] === 'spiderfied')[1]
    const mapInstance = (L.map as any).mock.results[0].value
    const mousemoveHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'mousemove')[1]

    const unspiderfyMock = vi.fn()
    spiderfiedHandler({
      cluster: {
        getAllChildMarkers: () => [],
        getLatLng: () => ({ lat: 47, lng: 19 }),
        unspiderfy: unspiderfyMock,
      },
    })

    mousemoveHandler({ latlng: { lat: 47, lng: 19 } })
    expect(unspiderfyMock).not.toHaveBeenCalled()
  })

  it('uses raster tile layer when WebGL is not supported', async () => {
    // jsdom does not implement WebGL, so canvas.getContext('webgl') returns null
    // by default — this test confirms the fallback path is taken.
    mountMap()
    await flushPromises()

    expect(L.tileLayer).toHaveBeenCalledOnce()
    const [url] = (L.tileLayer as any).mock.calls[0]
    expect(url).toContain('maptiler.com/maps/dataviz')
    expect(url).toContain('{z}/{x}/{y}.png')
  })

  it('falls back to raster tiles when MaptilerLayer throws at runtime', async () => {
    // Make webGLSupported() return true so the GL path is attempted
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as any)

    const { MaptilerLayer } = await import('@maptiler/leaflet-maptilersdk')
    vi.mocked(MaptilerLayer).mockImplementationOnce(() => {
      throw new Error('WebGL context lost')
    })

    mountMap()
    await flushPromises()

    expect(L.tileLayer).toHaveBeenCalledOnce()
    const [url] = (L.tileLayer as any).mock.calls[0]
    expect(url).toContain('maptiler.com/maps/dataviz')

    vi.restoreAllMocks()
  })

  it('registers an error handler on the MapLibre SDK map when WebGL is supported', async () => {
    // Make webGLSupported() return true so the GL path is attempted
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as any)

    const sdkMapOn = vi.fn().mockReturnThis()
    const sdkMapOnce = vi.fn().mockReturnThis()

    const { MaptilerLayer } = await import('@maptiler/leaflet-maptilersdk')
    vi.mocked(MaptilerLayer).mockImplementationOnce(function () {
      return {
        addTo: vi.fn().mockReturnThis(),
        getMaptilerSDKMap: vi.fn(() => ({ once: sdkMapOnce, on: sdkMapOn })),
      } as any
    })

    mountMap()
    await flushPromises()

    // An 'error' handler must be registered so async tile/style load errors
    // (DOMException NetworkError in Firefox) are handled and don't reach Sentry
    const errorHandlerCall = sdkMapOn.mock.calls.find((c: any) => c[0] === 'error')
    expect(errorHandlerCall).toBeDefined()

    // The handler must not throw when invoked
    const handler = errorHandlerCall![1]
    expect(() => handler({ error: new Error('tile load failed') })).not.toThrow()
    expect(() => handler({})).not.toThrow()

    vi.restoreAllMocks()
  })

  it('calls popup.update() on nextTick after popupopen to re-measure teleported content', async () => {
    mountMap()
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
})

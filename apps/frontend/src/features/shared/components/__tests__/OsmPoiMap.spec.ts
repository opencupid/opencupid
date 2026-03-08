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

// Mock blurhash (canvas unavailable in jsdom)
vi.mock('@/features/images/composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:image/png;blurhash=${hash}`,
}))

// Mock MapTiler layer and CSS
vi.mock('@maptiler/leaflet-maptilersdk', () => {
  const MaptilerLayer = vi.fn(function MaptilerLayerMock() {
    return {
      addTo: vi.fn().mockReturnThis(),
      getMaptilerSDKMap: vi.fn(() => ({ once: vi.fn() })),
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
  image?: { blurhash?: string | null; variants: { size: string; url: string }[] }
}

function makeImage(url: string, blurhash?: string) {
  return { blurhash: blurhash ?? null, variants: [{ size: 'thumb', url }] }
}

const items: TestItem[] = [
  {
    id: '1',
    location: { lat: 47.5, lon: 19.0 },
    name: 'Alice',
    image: makeImage('https://img/alice.jpg'),
  },
  { id: '2', location: { lat: 48.2, lon: 16.3 }, name: 'Bob' },
  {
    id: '3',
    location: { lat: 46.0, lon: 18.0 },
    name: 'Carol',
    image: makeImage('https://img/carol.jpg'),
  },
]

async function mountMap(props: Partial<Record<string, any>> = {}) {
  const testItems = props.items ?? items
  delete props.items

  const wrapper = mount(OsmPoiMap as any, {
    props: {
      items: [],
      getLocation: (item: TestItem) => item.location,
      getTitle: (item: TestItem) => item.name,
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
  vi.clearAllMocks()
})

describe('OsmPoiMap', () => {
  it('creates default dot icons when getImage is not provided', async () => {
    await mountMap()
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

  it('creates avatar icons when getImage returns an image', async () => {
    const getImage = (item: TestItem) => item.image

    await mountMap({ getImage })
    await flushPromises()

    expect(L.marker).toHaveBeenCalledTimes(3)

    const calls = (L.marker as any).mock.calls

    // Alice (index 0) has image → avatar icon
    const aliceAvatarHtml = calls[0][1].icon.html.innerHTML
    expect(aliceAvatarHtml).toContain('poi-avatar')
    expect(aliceAvatarHtml).toContain('alice.jpg')
    expect(calls[0][1].icon.className).toBe('poi-avatar-icon')

    // Bob (index 1) has no image → dot icon
    expect(calls[1][1].icon.html).not.toContain('poi-avatar')
    expect(calls[1][1].icon.html).toContain('poi-dot')

    // Carol (index 2) has image → avatar icon
    const carolAvatarHtml = calls[2][1].icon.html.innerHTML
    expect(carolAvatarHtml).toContain('poi-avatar')
    expect(carolAvatarHtml).toContain('carol.jpg')
  })

  it('falls back to dot icon for items where getImage returns undefined', async () => {
    const getImage = (_item: TestItem) => undefined

    await mountMap({ getImage })
    await flushPromises()

    for (const call of (L.marker as any).mock.calls) {
      expect(call[1].icon.html).toContain('poi-dot')
    }
  })

  it('initializes a markerClusterGroup and adds markers to it', async () => {
    await mountMap()
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
    await mountMap()
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
    await mountMap()
    await flushPromises()

    const clusterInstance = (L as any).markerClusterGroup.mock.results[0].value
    const onCalls = clusterInstance.on.mock.calls
    const mouseoverHandler = onCalls.find((c: any) => c[0] === 'clustermouseover')[1]

    const spiderfyMock = vi.fn()
    mouseoverHandler({ layer: { spiderfy: spiderfyMock } })

    expect(spiderfyMock).toHaveBeenCalledOnce()
  })

  it('closes active spider when mouse leaves hover bounds', async () => {
    await mountMap()
    await flushPromises()

    const clusterInstance = (L as any).markerClusterGroup.mock.results[0].value
    const spiderfiedHandler = clusterInstance.on.mock.calls.find(
      (c: any) => c[0] === 'spiderfied'
    )[1]
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
    await mountMap()
    await flushPromises()

    const clusterInstance = (L as any).markerClusterGroup.mock.results[0].value
    const spiderfiedHandler = clusterInstance.on.mock.calls.find(
      (c: any) => c[0] === 'spiderfied'
    )[1]
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
    await mountMap()
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

    await mountMap()
    await flushPromises()

    expect(L.tileLayer).toHaveBeenCalledOnce()
    const [url] = (L.tileLayer as any).mock.calls[0]
    expect(url).toContain('maptiler.com/maps/dataviz')

    vi.restoreAllMocks()
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

  it('uses 32×32 iconSize for avatar icons to match CSS dimensions', async () => {
    const getImage = (item: TestItem) => item.image

    await mountMap({ getImage })
    await flushPromises()

    const calls = (L.marker as any).mock.calls
    // Alice has image → avatar icon with size 32
    const aliceIcon = calls[0][1].icon
    expect(aliceIcon.iconSize).toEqual([32, 32])
    expect(aliceIcon.iconAnchor).toEqual([16, 16])
  })

  it('emits bounds-changed on moveend with viewport bounds', async () => {
    const wrapper = await mountMap()
    await flushPromises()

    const mapInstance = (L.map as any).mock.results[0].value

    // Find the moveend handler
    const moveendCall = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')
    expect(moveendCall).toBeDefined()
    const moveendHandler = moveendCall[1]

    // Mock getBounds to return a viewport
    mapInstance.getBounds = vi.fn(() => ({
      getSouth: () => 45.0,
      getNorth: () => 48.0,
      getWest: () => 16.0,
      getEast: () => 23.0,
    }))

    moveendHandler()

    expect(wrapper.emitted('bounds-changed')).toBeTruthy()
    expect(wrapper.emitted('bounds-changed')![0]).toEqual([
      { south: 45.0, north: 48.0, west: 16.0, east: 23.0 },
    ])
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
})

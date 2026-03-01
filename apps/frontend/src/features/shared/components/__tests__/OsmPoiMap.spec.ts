import { vi, describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

// Track created markers and their icons
const createdMarkers: { latLng: [number, number]; opts: any; icon?: any }[] = []

// Track cluster group interactions
const clusterGroupProto = {
  addLayer: vi.fn(),
  clearLayers: vi.fn(),
  on: vi.fn().mockReturnThis(),
  getBounds: vi.fn(() => ({})),
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

  const latLngBounds = vi.fn(() => ({}))
  const point = vi.fn((x: number, y: number) => ({ x, y }))

  const mapProto = {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    getZoom: vi.fn(() => 10),
    remove: vi.fn(),
    addLayer: vi.fn(),
  }
  const mapFn = vi.fn(() => ({ ...mapProto }))

  const markerClusterGroup = vi.fn(() => ({
    ...clusterGroupProto,
    addLayer: vi.fn(),
    clearLayers: vi.fn(),
    on: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({})),
  }))

  return {
    default: {
      map: mapFn,
      marker,
      divIcon,
      layerGroup,
      latLngBounds,
      markerClusterGroup,
      point,
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
  }
})

// Mock leaflet.markercluster (it mutates L as a side effect)
vi.mock('leaflet.markercluster', () => ({}))
vi.mock('leaflet.markercluster/dist/MarkerCluster.css', () => ({}))
vi.mock('leaflet.markercluster/dist/MarkerCluster.Default.css', () => ({}))

// Mock MapTiler layer and CSS
vi.mock('@maptiler/leaflet-maptilersdk', () => {
  const MaptilerLayer = vi.fn(function (this: any, opts: any) {
    this._opts = opts
    this.addTo = vi.fn().mockReturnThis()
  })
  return { MaptilerLayer }
})
vi.mock('@maptiler/sdk', () => ({
  MapStyle: {
    BASIC: 'basic-v2',
  },
}))
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
    expect(calls[0][1].icon.html).toContain('poi-avatar')
    expect(calls[0][1].icon.html).toContain('alice.jpg')
    expect(calls[0][1].icon.className).toBe('poi-avatar-icon')

    // Bob (index 1) has no imageUrl → dot icon
    expect(calls[1][1].icon.html).not.toContain('poi-avatar')
    expect(calls[1][1].icon.html).toContain('poi-dot')

    // Carol (index 2) has imageUrl → avatar icon
    expect(calls[2][1].icon.html).toContain('poi-avatar')
    expect(calls[2][1].icon.html).toContain('carol.jpg')
  })

  it('applies selected styling to avatar icons', async () => {
    const getImageUrl = (item: TestItem) => item.imageUrl

    mountMap({ getImageUrl, selectedId: '1' })
    await flushPromises()

    const calls = (L.marker as any).mock.calls

    // Alice is selected → should have 'selected' class and 40px size
    expect(calls[0][1].icon.html).toContain('poi-avatar selected')
    expect(calls[0][1].icon.iconSize).toEqual([40, 40])

    // Carol is not selected → no 'selected' class, 32px size
    expect(calls[2][1].icon.html).toContain('poi-avatar')
    expect(calls[2][1].icon.html).not.toContain('poi-avatar selected')
    expect(calls[2][1].icon.iconSize).toEqual([32, 32])
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

  it('registers hover-to-spiderfy event handlers on cluster group', async () => {
    mountMap()
    await flushPromises()

    const clusterInstance = (L as any).markerClusterGroup.mock.results[0].value
    const onCalls = clusterInstance.on.mock.calls
    const eventNames = onCalls.map((c: any) => c[0])
    expect(eventNames).toContain('clustermouseover')
    expect(eventNames).toContain('clustermouseout')
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

  it('uses MapStyle.BASIC when creating the Maptiler layer', async () => {
    const { MaptilerLayer } = await import('@maptiler/leaflet-maptilersdk')
    const { MapStyle } = await import('@maptiler/sdk')

    mountMap()
    await flushPromises()

    expect((MaptilerLayer as any).mock.calls).toHaveLength(1)
    const ctorCall = (MaptilerLayer as any).mock.calls[0][0]
    expect(ctorCall.style).toBe(MapStyle.BASIC)
  })

  it('shows error message when map initialization throws', async () => {
    const mapFn = (L as any).map as ReturnType<typeof vi.fn>
    mapFn.mockImplementationOnce(() => {
      throw new Error('WebGL not supported')
    })

    const wrapper = mountMap()
    await flushPromises()

    // Should show the error message, not the map element
    expect(wrapper.find('.osm-poi-map-error').exists()).toBe(true)
    // The map container div should not be rendered
    const mapDivs = wrapper.findAll('.osm-poi-map').filter((el) => !el.classes('osm-poi-map-error'))
    expect(mapDivs.length).toBe(0)
  })
})

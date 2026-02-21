import { vi, describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'

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

  const marker = vi.fn((latLng: [number, number], opts: any) => {
    const m = { ...markerProto, _icon: opts?.icon }
    createdMarkers.push({ latLng, opts, icon: opts?.icon })
    return m
  })

  const layerGroupProto = {
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn(),
  }
  const layerGroup = vi.fn(() => ({ ...layerGroupProto }))

  const latLngBounds = vi.fn(() => ({}))

  const mapProto = {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    getZoom: vi.fn(() => 10),
    remove: vi.fn(),
  }
  const mapFn = vi.fn(() => ({ ...mapProto }))

  const tileLayerProto = {
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
  }
  const tileLayer = vi.fn(() => ({ ...tileLayerProto }))

  return {
    default: {
      map: mapFn,
      marker,
      divIcon,
      layerGroup,
      latLngBounds,
      tileLayer,
    },
    Map: mapFn,
    Marker: marker,
    map: mapFn,
    marker,
    divIcon,
    layerGroup,
    latLngBounds,
    tileLayer,
  }
})

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
})

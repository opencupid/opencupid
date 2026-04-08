import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest'
import { defineComponent, h } from 'vue'

// Stub ResizeObserver (jsdom doesn't provide it)
const resizeCallbacks: Array<() => void> = []
const ResizeObserverStub = vi.fn(function (cb: () => void) {
  resizeCallbacks.push(cb)
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
})
vi.stubGlobal('ResizeObserver', ResizeObserverStub)
afterAll(() => vi.unstubAllGlobals())

// Mock leaflet
vi.mock('leaflet', () => {
  const divIcon = vi.fn((opts: any) => ({ _type: 'divIcon', ...opts }))

  const makeMarkerProto = () => ({
    bindPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
    setIcon: vi.fn().mockReturnThis(),
    setLatLng: vi.fn().mockReturnThis(),
    getLatLng: vi.fn(() => ({
      lat: 47,
      lng: 19,
      distanceTo: vi.fn(() => 0),
    })),
  })

  const marker = vi.fn((_latLng: any, opts: any) => {
    const m = { ...makeMarkerProto(), on: vi.fn().mockReturnThis(), _icon: opts?.icon }
    return m
  })

  const layerGroupProto = {
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  }
  const layerGroup = vi.fn(() => ({ ...layerGroupProto }))

  const latLng = vi.fn((lat: number, lng: number) => ({
    lat,
    lng,
    distanceTo: vi.fn(() => 0),
  }))
  const latLngBounds = vi.fn((latlngs: any[]) => ({ latlngs }))
  const point = vi.fn((x: number, y: number) => ({ x, y }))

  const makeMapProto = () => ({
    setView: vi.fn().mockReturnThis(),
    flyTo: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    getZoom: vi.fn(() => 10),
    getSize: vi.fn(() => ({ x: 1000, y: 800 })),
    invalidateSize: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({
      getSouth: () => 45,
      getNorth: () => 48,
      getWest: () => 16,
      getEast: () => 23,
    })),
    on: vi.fn().mockReturnThis(),
    once: vi.fn(function (this: any, _event: string, cb: () => void) {
      cb()
      return this
    }),
    off: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    createPane: vi.fn(() => document.createElement('div')),
    closePopup: vi.fn().mockReturnThis(),
  })
  const mapFn = vi.fn(() => makeMapProto())

  const tileLayerProto = {
    addTo: vi.fn().mockReturnThis(),
    once: vi.fn(function (this: any, _event: string, cb: () => void) {
      cb()
      return this
    }),
  }
  const tileLayer = vi.fn(() => ({ ...tileLayerProto }))

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
    control,
  }
})

const { omsInstance } = vi.hoisted(() => ({
  omsInstance: {
    addMarker: vi.fn().mockReturnThis(),
    removeMarker: vi.fn().mockReturnThis(),
    clearMarkers: vi.fn().mockReturnThis(),
    addListener: vi.fn().mockReturnThis(),
    getMarkers: vi.fn(() => []),
    circleFootSeparation: 25,
    spiralFootSeparation: 28,
    spiralLengthStart: 11,
    spiralLengthFactor: 5,
    spiderListener: vi.fn(),
  },
}))
vi.mock('ts-overlapping-marker-spiderfier-leaflet', () => ({
  OverlappingMarkerSpiderfier: vi.fn(function () {
    return omsInstance
  }),
}))

vi.mock('@/features/images/composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:image/png;blurhash=${hash}`,
}))

import L from 'leaflet'
import { MapController } from '../MapController'
import type { MapConfig, MapCallbacks } from '../MapController'
import type { MapPoi, MapCluster, MarkerConfig } from '../OsmPoiMap.types'
import { MAP_MAX_ZOOM } from '../mapUtils'

const DummyIcon = defineComponent({ render: () => h('span') })

function makeEl(): HTMLDivElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function makeConfig(overrides: Partial<MapConfig> = {}): MapConfig {
  return {
    center: undefined,
    zoom: 7,
    tileUrl: undefined,
    attribution: undefined,
    boundsDebounce: 300,
    fitToPois: false,
    ...overrides,
  }
}

function makeCallbacks() {
  const calls = {
    onBoundsChanged: [] as any[][],
    onItemSelect: [] as any[][],
    onMapReady: [] as any[][],
    onPopupOpen: [] as any[][],
    onPopupClose: [] as any[][],
  }
  const callbacks: MapCallbacks = {
    onBoundsChanged: (...args) => calls.onBoundsChanged.push(args),
    onItemSelect: (...args) => calls.onItemSelect.push(args),
    onMapReady: (...args) => calls.onMapReady.push(args),
    onPopupOpen: (...args) => calls.onPopupOpen.push(args),
    onPopupClose: (...args) => calls.onPopupClose.push(args),
  }
  return { callbacks, calls }
}

function makeMarkerConfig(): MarkerConfig {
  return { resolveIcon: () => DummyIcon }
}

function makePoi(id: string, overrides: Partial<MapPoi> = {}): MapPoi {
  return {
    id,
    title: id,
    location: { lat: 47, lon: 19 },
    source: {},
    ...overrides,
  }
}

function makeCluster(id: number, expansionZoom = 8): MapCluster {
  return { id, location: { lat: 47, lon: 19 }, count: 3, expansionZoom }
}

beforeEach(() => {
  resizeCallbacks.length = 0
  vi.clearAllMocks()
  omsInstance.addMarker.mockReturnThis()
  omsInstance.removeMarker.mockReturnThis()
  omsInstance.addListener.mockReturnThis()
  omsInstance.spiderListener.mockReset()
})

describe('MapController — phase transitions', () => {
  it('reaches ready phase after tile load (tileUrl empty → immediate)', () => {
    const el = makeEl()
    const { callbacks, calls } = makeCallbacks()
    const ctrl = new MapController(el, makeConfig(), callbacks)

    ctrl.init()

    expect(calls.onMapReady).toHaveLength(1)
  })

  it('does not re-init when init() called twice', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()
    ctrl.init()

    expect(L.map).toHaveBeenCalledTimes(1)
  })

  it('suspend() then reactivate() calls invalidateSize', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    ctrl.suspend()
    const mapInstance = (L.map as any).mock.results[0].value
    mapInstance.invalidateSize.mockClear()

    ctrl.reactivate()

    expect(mapInstance.invalidateSize).toHaveBeenCalled()
  })

  it('reactivate() drains deferred center', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()
    ctrl.suspend()

    const mapInstance = (L.map as any).mock.results[0].value
    // Make getSize return non-zero so reactivate proceeds past the size check
    mapInstance.getSize.mockReturnValue({ x: 1000, y: 800 })
    mapInstance.flyTo.mockClear()

    ctrl.flyToCenter([50, 14]) // queued while suspended
    ctrl.reactivate()

    expect(mapInstance.flyTo).toHaveBeenCalledWith([50, 14], expect.any(Number), { duration: 1 })
  })
})

describe('MapController — deferred work', () => {
  it('queues flyToCenter when loading and drains on onReady', () => {
    // Override tileLayer.once to NOT auto-fire so we can test the deferred path
    const tileProto = { addTo: vi.fn().mockReturnThis(), once: vi.fn() }
    ;(L.tileLayer as any).mockImplementationOnce(() => tileProto)

    const el = makeEl()
    const ctrl = new MapController(
      el,
      makeConfig({ tileUrl: 'https://tiles.example.com/{z}/{x}/{y}.png' }),
      makeCallbacks().callbacks
    )
    ctrl.init()

    const mapInstance = (L.map as any).mock.results[(L.map as any).mock.results.length - 1].value
    mapInstance.flyTo.mockClear()

    ctrl.flyToCenter([50, 14])
    expect(mapInstance.flyTo).not.toHaveBeenCalled()

    // Simulate tile load firing → triggers onReady → drainDeferred
    const onceCall = tileProto.once.mock.calls.find((c: any) => c[0] === 'load')
    expect(onceCall).toBeDefined()
    onceCall![1]()

    expect(mapInstance.flyTo).toHaveBeenCalledWith([50, 14], expect.any(Number), { duration: 1 })
  })

  it('queues flyToCenter when container is zero-size and drains via ResizeObserver', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    const mapInstance = (L.map as any).mock.results[0].value
    mapInstance.getSize.mockReturnValue({ x: 0, y: 0 })
    mapInstance.flyTo.mockClear()

    ctrl.flyToCenter([50, 14])
    expect(mapInstance.flyTo).not.toHaveBeenCalled()

    // Restore size and trigger ResizeObserver
    mapInstance.getSize.mockReturnValue({ x: 1000, y: 800 })
    const cb = resizeCallbacks[resizeCallbacks.length - 1]!
    cb()

    expect(mapInstance.flyTo).toHaveBeenCalledWith([50, 14], expect.any(Number), { duration: 1 })
  })
})

describe('MapController — DiffableLayer via updateMarkers', () => {
  it('adds markers for initial items', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    ctrl.updateMarkers([makePoi('1'), makePoi('2')], makeMarkerConfig())

    expect(L.marker).toHaveBeenCalledTimes(2)
  })

  it('does not recreate unchanged markers on second update', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    const poi = makePoi('1')
    ctrl.updateMarkers([poi], makeMarkerConfig())
    const countAfterFirst = (L.marker as any).mock.calls.length

    ctrl.updateMarkers([poi], makeMarkerConfig())
    expect((L.marker as any).mock.calls.length).toBe(countAfterFirst)
  })

  it('calls setIcon in-place when highlighted changes', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    ctrl.updateMarkers([makePoi('1', { highlighted: false })], makeMarkerConfig())
    const markerInst = (L.marker as any).mock.results[0].value

    ctrl.updateMarkers([makePoi('1', { highlighted: true })], makeMarkerConfig())
    expect(markerInst.setIcon).toHaveBeenCalled()
    expect((L.marker as any).mock.calls.length).toBe(1) // no new marker created
  })

  it('removes stale markers and unregisters from OMS', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    ctrl.updateMarkers([makePoi('1'), makePoi('2')], makeMarkerConfig())
    const pointLayerInst = (L.layerGroup as any).mock.results[0].value

    ctrl.updateMarkers([makePoi('1')], makeMarkerConfig())
    expect(pointLayerInst.removeLayer).toHaveBeenCalled()
    expect(omsInstance.removeMarker).toHaveBeenCalled()
  })

  it('registers new markers with OMS', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    ctrl.updateMarkers([makePoi('1')], makeMarkerConfig())
    expect(omsInstance.addMarker).toHaveBeenCalledTimes(1)
  })
})

describe('MapController — fitBounds suppresses bounds:changed', () => {
  it('unregisters moveend before fitBounds and re-registers via once', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    const mapInstance = (L.map as any).mock.results[0].value

    // No center → fitBounds path triggered on first load with multiple items
    ctrl.updateMarkers([makePoi('1'), makePoi('2')], makeMarkerConfig())

    expect(mapInstance.off).toHaveBeenCalledWith('moveend', expect.any(Function))
    expect(mapInstance.fitBounds).toHaveBeenCalled()
    // once re-registers moveend after the programmatic moveend fires
    expect(mapInstance.once).toHaveBeenCalledWith('moveend', expect.any(Function))
  })
})

describe('MapController — dissolvedClusterAt consumed once by updateMarkers', () => {
  it('auto-spiderfies after max-zoom cluster click + updateMarkers', () => {
    vi.useFakeTimers()
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    const cluster = makeCluster(1, MAP_MAX_ZOOM)
    ctrl.updateClusters([cluster])

    const clusterMarkerInst = (L.marker as any).mock.results[0].value
    const clickHandler = clusterMarkerInst.on.mock.calls.find((c: any) => c[0] === 'click')?.[1]
    expect(clickHandler).toBeDefined()

    clickHandler()

    // spiderfy not fired yet
    expect(omsInstance.spiderListener).not.toHaveBeenCalled()

    // updateMarkers drains dissolvedClusterAt
    ctrl.updateMarkers([makePoi('1')], makeMarkerConfig())
    vi.runAllTimers()

    expect(omsInstance.spiderListener).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('dissolvedClusterAt is consumed only once even if updateMarkers called twice', () => {
    vi.useFakeTimers()
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    ctrl.updateClusters([makeCluster(1, MAP_MAX_ZOOM)])
    const clickHandler = (L.marker as any).mock.results[0].value.on.mock.calls.find(
      (c: any) => c[0] === 'click'
    )?.[1]
    clickHandler()

    ctrl.updateMarkers([makePoi('1')], makeMarkerConfig())
    vi.runAllTimers()
    omsInstance.spiderListener.mockClear()

    // Second call should NOT re-spiderfy
    ctrl.updateMarkers([makePoi('1')], makeMarkerConfig())
    vi.runAllTimers()

    expect(omsInstance.spiderListener).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

describe('MapController — cluster markers', () => {
  it('cluster click below max zoom flies to expansion zoom', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    ctrl.updateClusters([makeCluster(1, 8)])
    const mapInstance = (L.map as any).mock.results[0].value
    const clusterMarkerInst = (L.marker as any).mock.results[0].value
    const clickHandler = clusterMarkerInst.on.mock.calls.find((c: any) => c[0] === 'click')?.[1]

    clickHandler()

    expect(mapInstance.flyTo).toHaveBeenCalledWith([47, 19], 8, { duration: 0.5 })
  })

  it('cluster click at max zoom calls setView', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks().callbacks)
    ctrl.init()

    ctrl.updateClusters([makeCluster(1, MAP_MAX_ZOOM)])
    const mapInstance = (L.map as any).mock.results[0].value
    const clusterMarkerInst = (L.marker as any).mock.results[0].value
    const clickHandler = clusterMarkerInst.on.mock.calls.find((c: any) => c[0] === 'click')?.[1]

    clickHandler()

    expect(mapInstance.setView).toHaveBeenCalledWith([47, 19], MAP_MAX_ZOOM)
  })
})

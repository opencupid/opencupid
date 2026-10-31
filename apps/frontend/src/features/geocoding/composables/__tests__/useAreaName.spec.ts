import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'

const { mockReverse } = vi.hoisted(() => ({ mockReverse: vi.fn() }))

vi.mock('../useGeocoder', () => ({ reverseGeocode: mockReverse }))
vi.mock('vue-i18n', async () => {
  const { ref } = await import('vue')
  const locale = ref('en')
  return { useI18n: () => ({ locale }) }
})

import { useAreaName, clearAreaNameCache } from '../useAreaName'

const szentendre = { south: 47.6, north: 47.74, west: 18.98, east: 19.18 }

async function settle() {
  await vi.advanceTimersByTimeAsync(350)
  await nextTick()
}

describe('useAreaName', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockReverse.mockReset()
    clearAreaNameCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('looks up the name at the centre of the bounds', async () => {
    mockReverse.mockResolvedValue({ name: 'Szentendre', country: 'HU', lat: 47.67, lon: 19.08 })

    const { name } = useAreaName(ref(szentendre), ref(true))
    await settle()

    expect(mockReverse).toHaveBeenCalledTimes(1)
    const [point, lang, signal] = mockReverse.mock.calls[0]!
    expect(point.lat).toBeCloseTo(47.67)
    expect(point.lon).toBeCloseTo(19.08)
    expect(lang).toBe('en')
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(name.value).toBe('Szentendre')
  })

  it('does nothing while disabled, then looks up once enabled', async () => {
    mockReverse.mockResolvedValue({ name: 'Szentendre', country: 'HU', lat: 0, lon: 0 })
    const enabled = ref(false)

    const { name } = useAreaName(ref(szentendre), enabled)
    await settle()
    expect(mockReverse).not.toHaveBeenCalled()
    expect(name.value).toBeNull()

    enabled.value = true
    await settle()
    expect(mockReverse).toHaveBeenCalledTimes(1)
  })

  it('debounces quick successive moves into one lookup', async () => {
    mockReverse.mockResolvedValue({ name: 'Pomáz', country: 'HU', lat: 0, lon: 0 })
    const bounds = ref(szentendre)

    useAreaName(bounds, ref(true))
    await settle()
    mockReverse.mockClear()

    bounds.value = { ...szentendre, north: 47.9 }
    await vi.advanceTimersByTimeAsync(100)
    bounds.value = { ...szentendre, north: 48.1 }
    await settle()

    expect(mockReverse).toHaveBeenCalledTimes(1)
  })

  it('reuses the cached name for a nearby centre', async () => {
    mockReverse.mockResolvedValue({ name: 'Szentendre', country: 'HU', lat: 0, lon: 0 })
    const bounds = ref(szentendre)

    const { name } = useAreaName(bounds, ref(true))
    await settle()
    bounds.value = { ...szentendre, west: szentendre.west + 0.001, east: szentendre.east + 0.001 }
    await settle()

    expect(mockReverse).toHaveBeenCalledTimes(1)
    expect(name.value).toBe('Szentendre')
  })

  it('aborts the previous lookup when the area changes', async () => {
    let firstSignal: AbortSignal | undefined
    mockReverse.mockImplementationOnce((_p, _l, signal: AbortSignal) => {
      firstSignal = signal
      return new Promise(() => {})
    })
    mockReverse.mockResolvedValueOnce({ name: 'Visegrád', country: 'HU', lat: 0, lon: 0 })
    const bounds = ref(szentendre)

    const { name } = useAreaName(bounds, ref(true))
    await settle()
    bounds.value = { south: 47.77, north: 47.81, west: 18.93, east: 19.0 }
    await settle()

    expect(firstSignal!.aborted).toBe(true)
    expect(name.value).toBe('Visegrád')
  })

  it('is null when nothing is found or the lookup fails', async () => {
    mockReverse.mockResolvedValueOnce(null)
    const bounds = ref(szentendre)
    const { name } = useAreaName(bounds, ref(true))
    await settle()
    expect(name.value).toBeNull()

    mockReverse.mockRejectedValueOnce(new Error('network'))
    bounds.value = { south: 46, north: 46.2, west: 18, east: 18.2 }
    await settle()
    expect(name.value).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, ref, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'

const { route, mockReplace, mockFetchByIds } = vi.hoisted(() => ({
  route: { name: 'BrowseGrid', query: {} as Record<string, string> },
  mockReplace: vi.fn(),
  mockFetchByIds: vi.fn(),
}))

let reactiveRoute: typeof route
vi.mock('vue-router', () => ({
  useRoute: () => reactiveRoute,
  useRouter: () => ({ replace: mockReplace }),
}))
vi.mock('@/store/tagStore', () => ({
  useTagsStore: () => ({ fetchByIds: mockFetchByIds }),
}))

import { useGridUrlSync, formatBbox, parseBbox } from '../useGridUrlSync'
import type { MapBounds } from '@/features/map/types/map.types'

const szentendre: MapBounds = { south: 47.6, north: 47.74, west: 18.98, east: 19.18 }
const budapest: MapBounds = { south: 47.35, north: 47.61, west: 18.93, east: 19.33 }
const tag = (id: string) => ({ id, name: id, slug: id })

function setup(
  opts: { query?: Record<string, string>; name?: string; bounds?: MapBounds | null } = {}
) {
  reactiveRoute = reactive({ name: opts.name ?? 'BrowseGrid', query: opts.query ?? {} })
  mockReplace.mockImplementation(({ query }) => {
    reactiveRoute.query = query
  })
  const bounds = ref<MapBounds | null>(opts.bounds === undefined ? szentendre : opts.bounds)
  const selectedTags = ref<ReturnType<typeof tag>[]>([])
  const setTags = vi.fn((tags) => {
    selectedTags.value = tags
  })
  const fitBounds = vi.fn()
  useGridUrlSync({ bounds, selectedTags, setTags, fitBounds })
  return { bounds, selectedTags, setTags, fitBounds }
}

describe('bbox helpers', () => {
  it('formats west,south,east,north with 4 decimals', () => {
    expect(formatBbox(szentendre)).toBe('18.9800,47.6000,19.1800,47.7400')
  })

  it('parses a valid bbox and rejects malformed ones', () => {
    expect(parseBbox('18.98,47.6,19.18,47.74')).toEqual(szentendre)
    expect(parseBbox('1,2,3')).toBeNull()
    expect(parseBbox('a,b,c,d')).toBeNull()
    expect(parseBbox('19.18,47.6,18.98,47.74')).toBeNull()
    expect(parseBbox(undefined)).toBeNull()
  })
})

describe('useGridUrlSync', () => {
  beforeEach(() => {
    mockReplace.mockReset()
    mockFetchByIds.mockReset()
  })

  it('writes the map area and tags into the grid URL', async () => {
    const { selectedTags } = setup()
    expect(mockReplace).toHaveBeenLastCalledWith({
      name: 'BrowseGrid',
      query: { bbox: '18.9800,47.6000,19.1800,47.7400' },
    })

    selectedTags.value = [tag('cktagA'), tag('cktagB')]
    await nextTick()
    expect(mockReplace).toHaveBeenLastCalledWith({
      name: 'BrowseGrid',
      query: { bbox: '18.9800,47.6000,19.1800,47.7400', tags: 'cktagA,cktagB' },
    })
  })

  it('does nothing outside the grid route', async () => {
    const { bounds } = setup({ name: 'Browse' })
    bounds.value = budapest
    await nextTick()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not rewrite an URL that already matches', async () => {
    setup({ query: { bbox: formatBbox(szentendre) } })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('restores tags from a shared link', async () => {
    mockFetchByIds.mockResolvedValue({ success: true, data: { result: [tag('cktagA')] } })

    const { setTags } = setup({ query: { bbox: formatBbox(szentendre), tags: 'cktagA' } })
    await flushPromises()

    expect(mockFetchByIds).toHaveBeenCalledWith(['cktagA'])
    expect(setTags).toHaveBeenCalledWith([tag('cktagA')])
    // The URL tags are kept while they load, never dropped.
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('fits the map to a shared bbox and keeps it in the URL until the map gets there', async () => {
    const { bounds, fitBounds } = setup({ query: { bbox: formatBbox(budapest) } })
    expect(fitBounds).toHaveBeenCalledWith(budapest)
    expect(mockReplace).not.toHaveBeenCalled()

    // The map reports bounds close to the requested area (aspect padding).
    bounds.value = { south: 47.3, north: 47.66, west: 18.9, east: 19.36 }
    await nextTick()
    expect(mockReplace).toHaveBeenLastCalledWith({
      name: 'BrowseGrid',
      query: { bbox: '18.9000,47.3000,19.3600,47.6600' },
    })
  })

  it("doesn't revert a tag change made while its own URL update is settling", async () => {
    const { selectedTags } = setup()
    // The first URL write lands in the route; the tags change in the same tick.
    selectedTags.value = [tag('cktagA')]
    await flushPromises()

    expect(selectedTags.value).toEqual([tag('cktagA')])
    expect(mockReplace).toHaveBeenLastCalledWith({
      name: 'BrowseGrid',
      query: { bbox: '18.9800,47.6000,19.1800,47.7400', tags: 'cktagA' },
    })
  })

  it('clears tags when a link without tags is opened', async () => {
    reactiveRoute = reactive({ name: 'Browse', query: {} })
    const { selectedTags, setTags } = setup({ query: { bbox: formatBbox(szentendre) } })
    selectedTags.value = [tag('cktagA')]
    await nextTick()
    setTags.mockClear()

    reactiveRoute.query = { bbox: formatBbox(szentendre) }
    await flushPromises()

    expect(setTags).toHaveBeenCalledWith([])
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetOrBuildPointsInBounds = vi.fn()
vi.mock('@/services/cluster.service', () => ({
  ClusterService: {
    getInstance: () => ({ getOrBuildPointsInBounds: mockGetOrBuildPointsInBounds }),
  },
}))

const mockLoadRankInputs = vi.fn()
vi.mock('@/services/browseRanking.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/browseRanking.service')>()),
  loadRankInputs: (...args: unknown[]) => mockLoadRankInputs(...args),
}))

import { BrowseListService } from '@/services/browseList.service'
import type { BoundedPoint } from '@/services/cluster.service'
import type { RankInput } from '@/services/browseRanking.service'

const bbox: [number, number, number, number] = [18.5, 47.0, 19.5, 48.0]
const firstPage = { limit: 100, offset: 0 }

const point = (id: string, highlighted = false): BoundedPoint => ({
  kind: 'profile',
  id,
  lat: 47.5,
  lon: 19.0,
  highlighted,
})

/** Rank inputs for the requested points: same segment, distance from `km`. */
function inputsFor(km: Record<string, number | null>, segment: RankInput['segment'] = 'frequent') {
  return async (_viewer: string, points: BoundedPoint[]) =>
    new Map(points.map((p) => [p.id, { segment, distanceKm: p.id in km ? km[p.id]! : 10 }]))
}

describe('BrowseListService', () => {
  let service: BrowseListService
  const list = (page = firstPage, seed = 'seed-1', viewer = 'viewer') =>
    service.getList(viewer, bbox, [], ['profile'], page, seed)
  const ids = (r: { refs: { id: string }[] }) => r.refs.map((x) => x.id)

  beforeEach(() => {
    ;(BrowseListService as any).instance = undefined
    service = BrowseListService.getInstance()
    vi.clearAllMocks()
    mockLoadRankInputs.mockImplementation(inputsFor({}))
  })

  it("returns ranked refs with the distance from the viewer's home", async () => {
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('far'), point('near')],
      indexVersion: 'v1',
    })
    mockLoadRankInputs.mockImplementation(inputsFor({ near: 1, far: 400 }))

    const { refs, total } = await list()

    expect(total).toBe(2)
    expect(refs.map((r) => [r.id, r.distanceKm])).toEqual([
      ['near', 1],
      ['far', 400],
    ])
  })

  it('passes highlighted through to the refs', async () => {
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('m', true)],
      indexVersion: 'v1',
    })

    const { refs } = await list()

    expect(refs[0]).toEqual({ kind: 'profile', id: 'm', distanceKm: 10, highlighted: true })
  })

  it("leaves out the viewer's own card", async () => {
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('viewer'), point('other')],
      indexVersion: 'v1',
    })

    const result = await list()

    expect(ids(result)).toEqual(['other'])
    expect(result.total).toBe(1)
    expect(mockLoadRankInputs.mock.calls[0]![1].map((p: BoundedPoint) => p.id)).toEqual(['other'])
  })

  it('ranks without distances when the viewer has no home location', async () => {
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('a'), point('b')],
      indexVersion: 'v1',
    })
    mockLoadRankInputs.mockImplementation(inputsFor({ a: null, b: null }))

    const { refs } = await list()

    expect(refs.map((r) => r.distanceKm)).toEqual([null, null])
  })

  it('pages one stable order: no duplicates or gaps across pages', async () => {
    const points = Array.from({ length: 25 }, (_, i) => point(`p${i}`))
    mockGetOrBuildPointsInBounds.mockResolvedValue({ points, indexVersion: 'v1' })

    const all = await list({ limit: 25, offset: 0 })
    const pages: string[] = []
    for (let offset = 0; offset < 25; offset += 10) {
      pages.push(...ids(await list({ limit: 10, offset })))
    }

    expect(pages).toEqual(ids(all))
    expect(new Set(pages).size).toBe(25)
  })

  it('keeps the order when the index is rebuilt mid-scroll, for the same seed', async () => {
    const points = Array.from({ length: 30 }, (_, i) => point(`p${i}`))

    mockGetOrBuildPointsInBounds.mockResolvedValue({ points, indexVersion: 'v1' })
    const page1 = await list({ limit: 10, offset: 0 })
    // e.g. someone published a post: evictAll, so the next page is a new build
    mockGetOrBuildPointsInBounds.mockResolvedValue({ points, indexVersion: 'v2' })
    const page2 = await list({ limit: 10, offset: 10 })
    const whole = await list({ limit: 30, offset: 0 })

    expect([...ids(page1), ...ids(page2)]).toEqual(ids(whole).slice(0, 20))
  })

  it('reshuffles for a new seed (a new visit)', async () => {
    const points = Array.from({ length: 30 }, (_, i) => point(`p${i}`))
    mockGetOrBuildPointsInBounds.mockResolvedValue({ points, indexVersion: 'v1' })

    const a = await list(firstPage, 'visit-a')
    const b = await list(firstPage, 'visit-b')

    expect(ids(b)).not.toEqual(ids(a))
    expect([...ids(b)].sort()).toEqual([...ids(a)].sort())
  })

  it('keeps the relative order of items that stay in view when panning', async () => {
    const points = Array.from({ length: 30 }, (_, i) => point(`p${i}`))

    mockGetOrBuildPointsInBounds.mockResolvedValue({ points, indexVersion: 'v1' })
    const before = await list()
    const stillInView = new Set(points.slice(10).map((p) => p.id))
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: points.slice(10),
      indexVersion: 'v1',
    })
    const after = await list()

    expect(ids(after)).toEqual(ids(before).filter((id) => stillInView.has(id)))
  })

  it('loads rank inputs once per index build, and only for points not seen yet', async () => {
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('a'), point('b')],
      indexVersion: 'v1',
    })
    await list()
    await list()
    expect(mockLoadRankInputs).toHaveBeenCalledTimes(1)

    // Panning brings in a new point: only that one is loaded.
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('b'), point('c')],
      indexVersion: 'v1',
    })
    await list()
    expect(mockLoadRankInputs).toHaveBeenCalledTimes(2)
    expect(mockLoadRankInputs.mock.calls[1]![1].map((p: BoundedPoint) => p.id)).toEqual(['c'])

    // A rebuilt index reloads everything (segments or the home may have changed).
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('b'), point('c')],
      indexVersion: 'v2',
    })
    await list()
    expect(mockLoadRankInputs.mock.calls[2]![1].map((p: BoundedPoint) => p.id)).toEqual(['b', 'c'])
  })

  it('keeps one cache entry per viewer, so rebuilt indexes leave no dead entries', async () => {
    for (let v = 1; v <= 5; v++) {
      mockGetOrBuildPointsInBounds.mockResolvedValue({
        points: [point('a')],
        indexVersion: `v${v}`,
      })
      await list()
    }
    expect((service as any).cache.size).toBe(1)
  })

  it('returns an empty page without loading inputs when nothing is in view', async () => {
    mockGetOrBuildPointsInBounds.mockResolvedValue({ points: [], indexVersion: 'v1' })

    const result = await list()

    expect(result).toEqual({ refs: [], total: 0 })
    expect(mockLoadRankInputs).not.toHaveBeenCalled()
  })
})

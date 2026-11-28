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

const point = (id: string, highlighted = false): BoundedPoint => ({
  kind: 'profile',
  id,
  lat: 47.5,
  lon: 19.0,
  highlighted,
})

/** Rank inputs for the requested points: same segment, distance from `km`. */
function inputsFor(km: Record<string, number>, segment: RankInput['segment'] = 'frequent') {
  return async (_viewer: string, points: BoundedPoint[]) =>
    new Map(points.map((p) => [p.id, { segment, distanceKm: km[p.id] ?? 10 }]))
}

describe('BrowseListService', () => {
  let service: BrowseListService

  beforeEach(() => {
    ;(BrowseListService as any).instance = undefined
    service = BrowseListService.getInstance()
    vi.clearAllMocks()
  })

  it("returns ranked refs with the distance from the viewer's home", async () => {
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('far'), point('near')],
      indexVersion: 'v1',
    })
    mockLoadRankInputs.mockImplementation(inputsFor({ near: 1, far: 400 }))

    const { refs, total } = await service.getList('viewer', bbox, [], ['profile'], {
      limit: 10,
      offset: 0,
    })

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
    mockLoadRankInputs.mockImplementation(inputsFor({}))

    const { refs } = await service.getList('viewer', bbox, [], ['profile'], {
      limit: 10,
      offset: 0,
    })

    expect(refs[0]).toEqual({ kind: 'profile', id: 'm', distanceKm: 10, highlighted: true })
  })

  it('pages one stable order: no duplicates or gaps across pages', async () => {
    const points = Array.from({ length: 25 }, (_, i) => point(`p${i}`))
    mockGetOrBuildPointsInBounds.mockResolvedValue({ points, indexVersion: 'v1' })
    mockLoadRankInputs.mockImplementation(inputsFor({}))

    const all = await service.getList('viewer', bbox, [], ['profile'], { limit: 25, offset: 0 })
    const pages = []
    for (let offset = 0; offset < 25; offset += 10) {
      const { refs } = await service.getList('viewer', bbox, [], ['profile'], {
        limit: 10,
        offset,
      })
      pages.push(...refs.map((r) => r.id))
    }

    expect(pages).toEqual(all.refs.map((r) => r.id))
    expect(new Set(pages).size).toBe(25)
  })

  it('loads rank inputs once per index version, and only for points not seen yet', async () => {
    mockLoadRankInputs.mockImplementation(inputsFor({}))
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('a'), point('b')],
      indexVersion: 'v1',
    })
    await service.getList('viewer', bbox, [], ['profile'], { limit: 10, offset: 0 })
    await service.getList('viewer', bbox, [], ['profile'], { limit: 10, offset: 0 })
    expect(mockLoadRankInputs).toHaveBeenCalledTimes(1)

    // Panning brings in a new point: only that one is loaded.
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('b'), point('c')],
      indexVersion: 'v1',
    })
    await service.getList('viewer', bbox, [], ['profile'], { limit: 10, offset: 0 })
    expect(mockLoadRankInputs).toHaveBeenCalledTimes(2)
    expect(mockLoadRankInputs.mock.calls[1]![1].map((p: BoundedPoint) => p.id)).toEqual(['c'])

    // A rebuilt index (new version) reloads everything.
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: [point('b'), point('c')],
      indexVersion: 'v2',
    })
    await service.getList('viewer', bbox, [], ['profile'], { limit: 10, offset: 0 })
    expect(mockLoadRankInputs.mock.calls[2]![1].map((p: BoundedPoint) => p.id)).toEqual(['b', 'c'])
  })

  it('keeps the relative order of items that stay in view when panning', async () => {
    const points = Array.from({ length: 30 }, (_, i) => point(`p${i}`))
    mockLoadRankInputs.mockImplementation(inputsFor({}))

    mockGetOrBuildPointsInBounds.mockResolvedValue({ points, indexVersion: 'v1' })
    const before = await service.getList('viewer', bbox, [], ['profile'], { limit: 30, offset: 0 })
    const stillInView = new Set(points.slice(10).map((p) => p.id))
    mockGetOrBuildPointsInBounds.mockResolvedValue({
      points: points.slice(10),
      indexVersion: 'v1',
    })
    const after = await service.getList('viewer', bbox, [], ['profile'], { limit: 30, offset: 0 })

    expect(after.refs.map((r) => r.id)).toEqual(
      before.refs.map((r) => r.id).filter((id) => stillInView.has(id))
    )
  })

  it('reshuffles when the index is rebuilt', async () => {
    const points = Array.from({ length: 30 }, (_, i) => point(`p${i}`))
    mockLoadRankInputs.mockImplementation(inputsFor({}))

    mockGetOrBuildPointsInBounds.mockResolvedValue({ points, indexVersion: 'v1' })
    const a = await service.getList('viewer', bbox, [], ['profile'], { limit: 30, offset: 0 })
    mockGetOrBuildPointsInBounds.mockResolvedValue({ points, indexVersion: 'v2' })
    const b = await service.getList('viewer', bbox, [], ['profile'], { limit: 30, offset: 0 })

    expect(b.refs.map((r) => r.id)).not.toEqual(a.refs.map((r) => r.id))
  })

  it('returns an empty page without loading inputs when nothing is in view', async () => {
    mockGetOrBuildPointsInBounds.mockResolvedValue({ points: [], indexVersion: 'v1' })

    const result = await service.getList('viewer', bbox, [], ['profile'], { limit: 10, offset: 0 })

    expect(result).toEqual({ refs: [], total: 0 })
    expect(mockLoadRankInputs).not.toHaveBeenCalled()
  })
})

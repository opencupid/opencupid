import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  vi.doMock('@/db/includes/blocklistWhereClause', () => ({
    blocklistWhereClause: () => ({}),
  }))
  vi.doMock('@/db/includes/profileIncludes', () => ({
    profileImageInclude: () => ({ profileImages: { orderBy: { position: 'asc' } } }),
    tagsInclude: () => ({
      tags: { include: { translations: { select: { name: true, locale: true } } } },
    }),
  }))
  const module = await import('../../services/mapCluster.service')
  // Reset singleton so each test gets a fresh instance
  ;(module.MapClusterService as any).instance = undefined
  service = module.MapClusterService.getInstance()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('MapClusterService', () => {
  const mockProfiles = [
    { id: 'p1', lat: 47.5, lon: 19.0 },
    { id: 'p2', lat: 47.6, lon: 19.1 },
    { id: 'p3', lat: 40.0, lon: 10.0 },
  ]

  describe('rebuildIndex', () => {
    it('loads profiles from database and builds index', async () => {
      mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

      await service.rebuildIndex()

      expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            isOnboarded: true,
            isSocialActive: true,
            lat: { not: null },
            lon: { not: null },
          }),
          select: { id: true, lat: true, lon: true },
        })
      )
    })
  })

  describe('getClusters', () => {
    it('returns clusters and individual points for a bbox + zoom', async () => {
      mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)
      await service.rebuildIndex()

      const bbox: [number, number, number, number] = [18, 47, 20, 48]
      const results = service.getClusters(bbox, 10, new Set<string>())

      // Should find the two Budapest profiles
      expect(results.length).toBeGreaterThanOrEqual(1)
      // All results should have lat/lon
      for (const r of results) {
        expect(r.lat).toBeDefined()
        expect(r.lon).toBeDefined()
      }
    })

    it('excludes profiles in the exclude set', async () => {
      mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)
      await service.rebuildIndex()

      const bbox: [number, number, number, number] = [5, 35, 25, 50]
      const withAll = service.getClusters(bbox, 2, new Set<string>())
      const withExclude = service.getClusters(bbox, 2, new Set(['p1', 'p2', 'p3']))

      expect(withExclude.length).toBe(0)
      expect(withAll.length).toBeGreaterThan(0)
    })

    it('returns empty array when index is not built', () => {
      const results = service.getClusters([0, 0, 10, 10], 5, new Set())
      expect(results).toEqual([])
    })
  })

  describe('ensureIndex', () => {
    it('does not rebuild if index is fresh', async () => {
      mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)
      await service.ensureIndex()
      mockPrisma.profile.findMany.mockClear()

      await service.ensureIndex()
      expect(mockPrisma.profile.findMany).not.toHaveBeenCalled()
    })
  })

  describe('getExcludedIds', () => {
    it('returns own ID plus blocked profiles', async () => {
      mockPrisma.profile.findMany
        .mockResolvedValueOnce([{ id: 'blocker1' }]) // blockedBy
        .mockResolvedValueOnce([{ id: 'blocked1' }]) // blocking

      const excluded = await service.getExcludedIds('myId')

      expect(excluded.has('myId')).toBe(true)
      expect(excluded.has('blocker1')).toBe(true)
      expect(excluded.has('blocked1')).toBe(true)
      expect(excluded.size).toBe(3)
    })
  })

  describe('getProfilesByIds', () => {
    it('fetches profiles by ID with filters', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([{ id: 'p1', publicName: 'Alice' }])

      const result = await service.getProfilesByIds(['p1'], 'caller1', null)

      expect(result).toHaveLength(1)
      expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['p1'] },
            isActive: true,
            isSocialActive: true,
          }),
        })
      )
    })

    it('returns empty array for empty IDs', async () => {
      const result = await service.getProfilesByIds([], 'caller1', null)
      expect(result).toEqual([])
      expect(mockPrisma.profile.findMany).not.toHaveBeenCalled()
    })
  })
})

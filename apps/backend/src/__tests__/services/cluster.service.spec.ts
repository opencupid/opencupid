import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindSocialProfilesWithLocation = vi.fn()
const mockFindMutualMatchIds = vi.fn()

vi.mock('@/services/profileMatch.service', () => ({
  ProfileMatchService: {
    getInstance: () => ({
      findSocialProfilesWithLocation: mockFindSocialProfilesWithLocation,
      findMutualMatchIds: mockFindMutualMatchIds,
    }),
  },
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {},
}))

import { ClusterService } from '@/services/cluster.service'

const makeProfile = (id: string, lat: number, lon: number, name = 'User') => ({
  id,
  publicName: name,
  lat,
  lon,
  country: 'HU',
  cityName: 'Budapest',
  localized: [],
  profileImages: [
    {
      id: 'img-1',
      blurhash: 'LEHV6nWB2yk8',
      variants: [{ size: 'thumb', url: `https://cdn.test/${id}/thumb.jpg` }],
    },
  ],
  tags: [],
})

describe('ClusterService', () => {
  let service: ClusterService

  beforeEach(() => {
    service = new ClusterService()
    vi.clearAllMocks()
  })

  describe('buildIndex', () => {
    it('builds a supercluster index from filtered profiles', async () => {
      const profiles = [
        makeProfile('p1', 47.5, 19.0, 'Alice'),
        makeProfile('p2', 48.2, 16.3, 'Bob'),
        makeProfile('p3', 47.6, 19.1, 'Carol'),
      ]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue(['p2'])

      await service.buildIndex('viewer-1')

      const features = service.getClusters('viewer-1', [16.0, 47.0, 20.0, 49.0], 12)
      expect(features).toHaveLength(3)

      const points = features.filter((f) => f.type === 'point')
      expect(points).toHaveLength(3)

      const bob = points.find((p) => p.id === 'p2')
      expect(bob).toBeDefined()
      expect(bob!.highlighted).toBe(true)
      expect(bob!.publicName).toBe('Bob')

      const alice = points.find((p) => p.id === 'p1')
      expect(alice!.highlighted).toBe(false)
    })

    it('produces clusters at low zoom levels', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0), makeProfile('p2', 47.5001, 19.0001)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')

      const features = service.getClusters('viewer-1', [-180, -90, 180, 90], 2)
      const clusters = features.filter((f) => f.type === 'cluster')
      expect(clusters.length).toBeGreaterThanOrEqual(1)

      const cluster = clusters[0]!
      expect(cluster.count).toBe(2)
      expect(cluster.expansionZoom).toBeGreaterThan(2)
    })
  })

  describe('getClusters', () => {
    it('returns empty array when no index exists and builds on demand', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([])
      mockFindMutualMatchIds.mockResolvedValue([])

      const features = await service.getOrBuildClusters('viewer-1', [0, 0, 10, 10], 5)
      expect(features).toEqual([])
      expect(mockFindSocialProfilesWithLocation).toHaveBeenCalledWith('viewer-1', undefined)
    })
  })

  describe('getExpansionZoom', () => {
    it('returns expansion zoom for a cluster', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0), makeProfile('p2', 47.5001, 19.0001)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')

      const features = service.getClusters('viewer-1', [-180, -90, 180, 90], 2)
      const cluster = features.find((f) => f.type === 'cluster')
      if (cluster) {
        const zoom = service.getExpansionZoom('viewer-1', cluster.id)
        expect(zoom).toBeGreaterThan(2)
      }
    })
  })

  describe('getLeaves', () => {
    it('returns point features for a cluster', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0), makeProfile('p2', 47.5001, 19.0001)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')

      const features = service.getClusters('viewer-1', [-180, -90, 180, 90], 2)
      const cluster = features.find((f) => f.type === 'cluster')
      if (cluster) {
        const leaves = service.getLeaves('viewer-1', cluster.id)
        expect(leaves).toHaveLength(2)
        expect(leaves.every((l) => l.type === 'point')).toBe(true)
      }
    })
  })

  describe('evict', () => {
    it('removes the cached index for a user', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')
      expect(service.getClusters('viewer-1', [-180, -90, 180, 90], 5)).toHaveLength(1)

      service.evict('viewer-1')
      expect(service.getClusters('viewer-1', [-180, -90, 180, 90], 5)).toEqual([])
    })
  })
})

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

const mockFindAllWithLocation = vi.fn()

vi.mock('@/services/post.service', () => ({
  PostService: {
    getInstance: () => ({
      findAllWithLocation: mockFindAllWithLocation,
    }),
  },
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {},
}))

vi.mock('@/services/image.service', () => ({
  ImageService: {
    getInstance: () => ({
      getImageUrls: (img: { storagePath: string }) => [
        { size: 'thumb', url: `https://cdn.test/${img.storagePath}/thumb.webp` },
      ],
    }),
  },
}))

import { ClusterService } from '@/services/cluster.service'
import type { PointFeature } from '@shared/zod/map/cluster.dto'

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
      storagePath: `images/${id}/photo`,
    },
  ],
  tags: [
    {
      id: `tag-${id}`,
      slug: `tag-${id}`,
      name: `Tag ${id}`,
      translations: [{ name: `Tag ${id}`, locale: 'en' }],
    },
  ],
})

const makePost = (id: string, lat: number, lon: number, content = 'A post') => ({
  id,
  content,
  type: 'OFFER',
  lat,
  lon,
  postedBy: {
    publicName: 'PostAuthor',
    profileImages: [
      {
        id: `post-img-${id}`,
        blurhash: 'LBG^x3',
        storagePath: `images/post-${id}/photo`,
      },
    ],
  },
})

describe('ClusterService', () => {
  let service: ClusterService

  beforeEach(() => {
    // Reset singleton so each test gets a fresh instance
    ;(ClusterService as any).instance = undefined
    service = ClusterService.getInstance()
    vi.clearAllMocks()
    mockFindAllWithLocation.mockResolvedValue([])
  })

  describe('buildIndex', () => {
    it('builds a supercluster index from profiles and posts', async () => {
      const profiles = [
        makeProfile('p1', 47.5, 19.0, 'Alice'),
        makeProfile('p2', 48.2, 16.3, 'Bob'),
        makeProfile('p3', 47.6, 19.1, 'Carol'),
      ]
      const posts = [makePost('post1', 47.55, 19.05)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue(['p2'])
      mockFindAllWithLocation.mockResolvedValue(posts)

      await service.buildIndex('viewer-1')

      const { features } = service.getClusters('viewer-1', [16.0, 47.0, 20.0, 49.0], 12)
      expect(features).toHaveLength(4)

      const isPoint = (f: any): f is PointFeature => f.type === 'point'
      const profilePoints = features.filter(isPoint).filter((f) => f.kind === 'profile')
      expect(profilePoints).toHaveLength(3)

      const postPoints = features.filter(isPoint).filter((f) => f.kind === 'post')
      expect(postPoints).toHaveLength(1)
      expect(postPoints[0]!.postContent).toBe('A post')
      expect(postPoints[0]!.postType).toBe('OFFER')

      const bob = profilePoints.find((p) => p.id === 'p2')
      expect(bob).toBeDefined()
      expect(bob!.highlighted).toBe(true)
      expect(bob!.publicName).toBe('Bob')

      const alice = profilePoints.find((p) => p.id === 'p1')
      expect(alice!.highlighted).toBe(false)
    })

    it('derives tags from profiles and returns them', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0), makeProfile('p2', 48.2, 16.3)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')

      const { tags } = service.getClusters('viewer-1', [16.0, 47.0, 20.0, 49.0], 12)
      expect(tags).toHaveLength(2)
      expect(tags.map((t) => t.id).sort()).toEqual(['tag-p1', 'tag-p2'])
    })

    it('produces clusters at low zoom levels', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0), makeProfile('p2', 47.5001, 19.0001)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')

      const { features } = service.getClusters('viewer-1', [-180, -90, 180, 90], 2)
      const clusters = features.filter((f) => f.type === 'cluster')
      expect(clusters.length).toBeGreaterThanOrEqual(1)

      const cluster = clusters[0]!
      expect(cluster.count).toBe(2)
      expect(cluster.expansionZoom).toBeGreaterThan(2)
    })
  })

  describe('getClusters', () => {
    it('returns empty features and tags when no index exists and builds on demand', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([])
      mockFindMutualMatchIds.mockResolvedValue([])

      const { features, tags } = await service.getOrBuildClusters('viewer-1', [0, 0, 10, 10], 5)
      expect(features).toEqual([])
      expect(tags).toEqual([])
      expect(mockFindSocialProfilesWithLocation).toHaveBeenCalledWith('viewer-1', [])
    })
  })

  describe('getExpansionZoom', () => {
    it('returns expansion zoom for a cluster', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0), makeProfile('p2', 47.5001, 19.0001)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')

      const { features } = service.getClusters('viewer-1', [-180, -90, 180, 90], 2)
      const cluster = features.find((f) => f.type === 'cluster')
      if (cluster) {
        const zoom = service.getExpansionZoom('viewer-1', cluster.id)
        expect(zoom).toBeGreaterThan(2)
      }
    })
  })

  describe('getLeaves', () => {
    it('returns point features with kind for a cluster', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0), makeProfile('p2', 47.5001, 19.0001)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')

      const { features } = service.getClusters('viewer-1', [-180, -90, 180, 90], 2)
      const cluster = features.find((f) => f.type === 'cluster')
      if (cluster) {
        const leaves = service.getLeaves('viewer-1', cluster.id)
        expect(leaves).toHaveLength(2)
        expect(leaves.every((l) => l.type === 'point')).toBe(true)
        expect(leaves.every((l) => l.kind === 'profile')).toBe(true)
      }
    })

    it('returns mixed profile and post leaves', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0)]
      const posts = [makePost('post1', 47.5001, 19.0001)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue(posts)

      await service.buildIndex('viewer-1')

      const { features } = service.getClusters('viewer-1', [-180, -90, 180, 90], 2)
      const cluster = features.find((f) => f.type === 'cluster')
      if (cluster) {
        const leaves = service.getLeaves('viewer-1', cluster.id)
        expect(leaves).toHaveLength(2)
        const kinds = leaves.map((l) => l.kind).sort()
        expect(kinds).toEqual(['post', 'profile'])
      }
    })
  })

  describe('evict', () => {
    it('removes the cached index for a user', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')
      expect(service.getClusters('viewer-1', [-180, -90, 180, 90], 5).features).toHaveLength(1)

      service.evict('viewer-1')
      expect(service.getClusters('viewer-1', [-180, -90, 180, 90], 5).features).toEqual([])
    })

    it('evictAll clears all cached indexes', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')
      await service.buildIndex('viewer-2')
      expect(service.hasIndex('viewer-1')).toBe(true)
      expect(service.hasIndex('viewer-2')).toBe(true)

      service.evictAll()
      expect(service.hasIndex('viewer-1')).toBe(false)
      expect(service.hasIndex('viewer-2')).toBe(false)
    })
  })
})

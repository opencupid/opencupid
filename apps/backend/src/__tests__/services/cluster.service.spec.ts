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

const makePost = (
  id: string,
  lat: number,
  lon: number,
  postedById: string,
  ownerLat?: number,
  ownerLon?: number,
  content = 'A post'
) => ({
  id,
  content,
  type: 'OFFER',
  lat,
  lon,
  postedById,
  postedBy: {
    publicName: 'PostAuthor',
    lat: ownerLat ?? null,
    lon: ownerLon ?? null,
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
      const posts = [makePost('post1', 47.55, 19.05, 'author1')]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue(['p2'])
      mockFindAllWithLocation.mockResolvedValue(posts)

      await service.buildIndex('viewer-1', [], ['profile', 'post'])

      const { features } = service.getClusters(
        'viewer-1',
        [16.0, 47.0, 20.0, 49.0],
        12,
        [],
        ['profile', 'post']
      )
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

      await service.buildIndex('viewer-1', [], ['profile', 'post'])

      const { tags } = service.getClusters(
        'viewer-1',
        [16.0, 47.0, 20.0, 49.0],
        12,
        [],
        ['profile', 'post']
      )
      expect(tags).toHaveLength(2)
      expect(tags.map((t) => t.id).sort()).toEqual(['tag-p1', 'tag-p2'])
    })

    it('produces clusters at low zoom levels', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0), makeProfile('p2', 47.5001, 19.0001)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1', [], ['profile', 'post'])

      const { features } = service.getClusters(
        'viewer-1',
        [-180, -90, 180, 90],
        2,
        [],
        ['profile', 'post']
      )
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

      const { features, tags } = await service.getOrBuildClusters(
        'viewer-1',
        [0, 0, 10, 10],
        5,
        [],
        ['profile', 'post']
      )
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

      await service.buildIndex('viewer-1', [], ['profile', 'post'])

      const { features } = service.getClusters(
        'viewer-1',
        [-180, -90, 180, 90],
        2,
        [],
        ['profile', 'post']
      )
      const cluster = features.find((f) => f.type === 'cluster')
      if (cluster) {
        const zoom = service.getExpansionZoom('viewer-1', cluster.id, [], ['profile', 'post'])
        expect(zoom).toBeGreaterThan(2)
      }
    })
  })

  describe('getLeaves', () => {
    it('returns point features with kind for a cluster', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0), makeProfile('p2', 47.5001, 19.0001)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1', [], ['profile', 'post'])

      const { features } = service.getClusters(
        'viewer-1',
        [-180, -90, 180, 90],
        2,
        [],
        ['profile', 'post']
      )
      const cluster = features.find((f) => f.type === 'cluster')
      if (cluster) {
        const leaves = service.getLeaves('viewer-1', cluster.id, [], ['profile', 'post'])
        expect(leaves).toHaveLength(2)
        expect(leaves.every((l) => l.type === 'point')).toBe(true)
        expect(leaves.every((l) => l.kind === 'profile')).toBe(true)
      }
    })

    it('returns mixed profile and post leaves', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0)]
      const posts = [makePost('post1', 47.5001, 19.0001, 'other-author')]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue(posts)

      await service.buildIndex('viewer-1', [], ['profile', 'post'])

      const { features } = service.getClusters(
        'viewer-1',
        [-180, -90, 180, 90],
        2,
        [],
        ['profile', 'post']
      )
      const cluster = features.find((f) => f.type === 'cluster')
      if (cluster) {
        const leaves = service.getLeaves('viewer-1', cluster.id, [], ['profile', 'post'])
        expect(leaves).toHaveLength(2)
        const kinds = leaves.map((l) => l.kind).sort()
        expect(kinds).toEqual(['post', 'profile'])
      }
    })
  })

  describe('collocated post filtering', () => {
    it('absorbs a post into its owner profile when locations match', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0, 'Alice')]
      const posts = [makePost('post1', 47.5, 19.0, 'p1', 47.5, 19.0)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue(posts)

      await service.buildIndex('viewer-1', [], ['profile', 'post'])
      const { features } = service.getClusters(
        'viewer-1',
        [16.0, 47.0, 20.0, 49.0],
        12,
        [],
        ['profile', 'post']
      )

      const isPoint = (f: any): f is PointFeature => f.type === 'point'
      const points = features.filter(isPoint)
      expect(points).toHaveLength(1)
      expect(points[0]!.kind).toBe('profile')
      expect(points[0]!.hasPost).toBe(true)
    })

    it('keeps a post as standalone when its location differs from owner', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0, 'Alice')]
      const posts = [makePost('post1', 48.0, 20.0, 'p1', 47.5, 19.0)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue(posts)

      await service.buildIndex('viewer-1', [], ['profile', 'post'])
      const { features } = service.getClusters(
        'viewer-1',
        [16.0, 47.0, 21.0, 49.0],
        12,
        [],
        ['profile', 'post']
      )

      const isPoint = (f: any): f is PointFeature => f.type === 'point'
      const profilePoints = features.filter(isPoint).filter((f) => f.kind === 'profile')
      const postPoints = features.filter(isPoint).filter((f) => f.kind === 'post')
      expect(profilePoints).toHaveLength(1)
      expect(profilePoints[0]!.hasPost).toBeUndefined()
      expect(postPoints).toHaveLength(1)
    })

    it('keeps a post as standalone when owner is not in profiles list', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0, 'Alice')]
      const posts = [makePost('post1', 47.6, 19.1, 'other-profile', 47.6, 19.1)]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue(posts)

      await service.buildIndex('viewer-1', [], ['profile', 'post'])
      const { features } = service.getClusters(
        'viewer-1',
        [16.0, 47.0, 20.0, 49.0],
        12,
        [],
        ['profile', 'post']
      )

      const isPoint = (f: any): f is PointFeature => f.type === 'point'
      const postPoints = features.filter(isPoint).filter((f) => f.kind === 'post')
      expect(postPoints).toHaveLength(1)
    })
  })

  describe('layer kinds', () => {
    it('builds a separate cache entry for each kinds selection', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue([])

      await service.buildIndex('viewer-1', [], ['profile'])

      // Building one kinds selection must not satisfy a different selection.
      expect(service.hasIndex('viewer-1', [], ['profile'])).toBe(true)
      expect(service.hasIndex('viewer-1', [], ['post'])).toBe(false)
      expect(service.hasIndex('viewer-1', [], ['profile', 'post'])).toBe(false)

      await service.buildIndex('viewer-1', [], ['profile', 'post'])

      expect(service.hasIndex('viewer-1', [], ['profile'])).toBe(true)
      expect(service.hasIndex('viewer-1', [], ['profile', 'post'])).toBe(true)
    })

    it('skips post fetch when kinds is profile-only', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue([])

      await service.buildIndex('viewer-1', [], ['profile'])

      expect(mockFindSocialProfilesWithLocation).toHaveBeenCalledTimes(1)
      expect(mockFindAllWithLocation).not.toHaveBeenCalled()
    })

    it('skips profile and match-id fetches when kinds is post-only', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([])
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue([makePost('post1', 47.5, 19.0, 'author1')])

      await service.buildIndex('viewer-1', [], ['post'])

      expect(mockFindSocialProfilesWithLocation).not.toHaveBeenCalled()
      expect(mockFindMutualMatchIds).not.toHaveBeenCalled()
      expect(mockFindAllWithLocation).toHaveBeenCalledTimes(1)
    })

    it('produces only post features when kinds is post-only', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([])
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue([makePost('post1', 47.5, 19.0, 'author1')])

      await service.buildIndex('viewer-1', [], ['post'])
      const { features } = service.getClusters(
        'viewer-1',
        [16.0, 47.0, 20.0, 49.0],
        12,
        [],
        ['post']
      )
      const points = features.filter((f) => f.type === 'point')
      expect(points).toHaveLength(1)
      expect(points[0]).toMatchObject({ kind: 'post' })
    })
  })

  describe('evict', () => {
    it('removes the cached index for a user', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1', [], ['profile', 'post'])
      expect(
        service.getClusters('viewer-1', [-180, -90, 180, 90], 5, [], ['profile', 'post']).features
      ).toHaveLength(1)

      service.evict('viewer-1')
      expect(
        service.getClusters('viewer-1', [-180, -90, 180, 90], 5, [], ['profile', 'post']).features
      ).toEqual([])
    })

    it('evictAll clears all cached indexes', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1', [], ['profile', 'post'])
      await service.buildIndex('viewer-2', [], ['profile', 'post'])
      expect(service.hasIndex('viewer-1', [], ['profile', 'post'])).toBe(true)
      expect(service.hasIndex('viewer-2', [], ['profile', 'post'])).toBe(true)

      service.evictAll()
      expect(service.hasIndex('viewer-1', [], ['profile', 'post'])).toBe(false)
      expect(service.hasIndex('viewer-2', [], ['profile', 'post'])).toBe(false)
    })
  })
})

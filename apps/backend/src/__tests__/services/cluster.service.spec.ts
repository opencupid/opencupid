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

vi.mock('@/services/userContent.service', () => ({
  UserContentService: {
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
      image: {
        id: 'img-1',
        blurhash: 'LEHV6nWB2yk8',
        storagePath: `images/${id}/photo`,
      },
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
  kind: 'post' as const,
  content,
  lat,
  lon,
  postedById,
  isDeleted: false,
  isVisible: true,
  country: null,
  cityName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  postedBy: {
    publicName: 'PostAuthor',
    lat: ownerLat ?? null,
    lon: ownerLon ?? null,
    profileImages: [
      {
        image: {
          id: `post-img-${id}`,
          blurhash: 'LBG^x3',
          storagePath: `images/post-${id}/photo`,
        },
      },
    ],
  },
})

const makeEvent = (
  id: string,
  lat: number,
  lon: number,
  postedById: string,
  ownerLat?: number,
  ownerLon?: number,
  content = 'An event'
) => ({
  id,
  kind: 'event' as const,
  content,
  lat,
  lon,
  postedById,
  isDeleted: false,
  isVisible: true,
  country: null,
  cityName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  postedBy: {
    publicName: 'EventAuthor',
    lat: ownerLat ?? null,
    lon: ownerLon ?? null,
    profileImages: [
      {
        image: {
          id: `event-img-${id}`,
          blurhash: 'LBG^x3',
          storagePath: `images/event-${id}/photo`,
        },
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

  describe('getOrBuildList', () => {
    // bbox [west, south, east, north] centred on (47.5, 19.0)
    const bbox: [number, number, number, number] = [18.5, 47.0, 19.5, 48.0]
    const page = { limit: 10, offset: 0 }

    beforeEach(() => {
      mockFindMutualMatchIds.mockResolvedValue([])
    })

    it('returns only points inside the bbox, nearest to the centre first', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([
        makeProfile('far', 47.9, 19.4),
        makeProfile('near', 47.51, 19.0),
        makeProfile('outside', 46.0, 19.0),
      ])
      mockFindAllWithLocation.mockResolvedValue([makeEvent('ev1', 47.6, 19.0, 'someone')])

      const { refs, total } = await service.getOrBuildList(
        'viewer-1',
        bbox,
        [],
        ['profile', 'event'],
        page
      )

      expect(total).toBe(3)
      expect(refs.map((r) => r.id)).toEqual(['near', 'ev1', 'far'])
      expect(refs[1]!.kind).toBe('event')
      // 0.01° of latitude ≈ 1.11 km
      expect(refs[0]!.distanceKm).toBeCloseTo(1.11, 1)
    })

    it('breaks distance ties by id so pages are stable', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([
        makeProfile('b', 47.6, 19.0),
        makeProfile('a', 47.6, 19.0),
      ])

      const { refs } = await service.getOrBuildList('viewer-1', bbox, [], ['profile'], page)

      expect(refs.map((r) => r.id)).toEqual(['a', 'b'])
    })

    it('pages with limit and offset while reporting the full total', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([
        makeProfile('p1', 47.51, 19.0),
        makeProfile('p2', 47.52, 19.0),
        makeProfile('p3', 47.53, 19.0),
      ])

      const { refs, total } = await service.getOrBuildList('viewer-1', bbox, [], ['profile'], {
        limit: 2,
        offset: 1,
      })

      expect(total).toBe(3)
      expect(refs.map((r) => r.id)).toEqual(['p2', 'p3'])
    })

    it('reuses the cached index shared with the map clusters', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])

      await service.getOrBuildClusters('viewer-1', bbox, 10, [], ['profile'])
      await service.getOrBuildList('viewer-1', bbox, [], ['profile'], page)

      expect(mockFindSocialProfilesWithLocation).toHaveBeenCalledTimes(1)
    })

    it("leaves out a post placed at its poster's location, as the map does", async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
      mockFindAllWithLocation.mockResolvedValue([makePost('post1', 47.5, 19.0, 'p1', 47.5, 19.0)])

      const { refs, total } = await service.getOrBuildList(
        'viewer-1',
        bbox,
        [],
        ['profile', 'post'],
        page
      )

      expect(total).toBe(1)
      expect(refs.map((r) => r.id)).toEqual(['p1'])
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

    it('evict clears entries with both : and | separators for the profile', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue([])

      // Build with no tags (key shape: viewer-1|profile)
      await service.buildIndex('viewer-1', [], ['profile'])
      // Build with tags (key shape: viewer-1:tagA|profile)
      await service.buildIndex('viewer-1', ['tagA'], ['profile'])

      expect(service.hasIndex('viewer-1', [], ['profile'])).toBe(true)
      expect(service.hasIndex('viewer-1', ['tagA'], ['profile'])).toBe(true)

      service.evict('viewer-1')

      expect(service.hasIndex('viewer-1', [], ['profile'])).toBe(false)
      expect(service.hasIndex('viewer-1', ['tagA'], ['profile'])).toBe(false)
    })
  })

  describe('event kind', () => {
    it('builds clusters with mixed post + event kinds', async () => {
      const profiles = [makeProfile('p1', 47.5, 19.0)]
      const post = makePost('post1', 47.55, 19.05, 'author1')
      const event = makeEvent('event1', 47.6, 19.1, 'author2')
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue([post, event])

      await service.buildIndex('viewer-1', [], ['profile', 'post', 'event'])
      const { features } = service.getClusters(
        'viewer-1',
        [16, 47, 20, 49],
        12,
        [],
        ['profile', 'post', 'event']
      )
      const isPoint = (f: any): f is PointFeature => f.type === 'point'
      const points = features.filter(isPoint)
      expect(points.filter((f) => f.kind === 'post')).toHaveLength(1)
      expect(points.filter((f) => f.kind === 'event')).toHaveLength(1)
    })

    it('passes only schema-level content kinds to the data layer', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([])
      mockFindMutualMatchIds.mockResolvedValue([])
      mockFindAllWithLocation.mockResolvedValue([])

      await service.buildIndex('viewer-1', [], ['profile', 'post'])

      expect(mockFindAllWithLocation).toHaveBeenCalledWith('viewer-1', ['post'])
    })

    it('skips the data-layer call when no content kinds are requested', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([])
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1', [], ['profile'])

      expect(mockFindAllWithLocation).not.toHaveBeenCalled()
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

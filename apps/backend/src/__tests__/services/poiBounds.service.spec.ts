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

import { PoiBoundsService } from '@/services/poiBounds.service'

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
        id: `post-img-${id}`,
        blurhash: 'LBG^x3',
        storagePath: `images/post-${id}/photo`,
      },
    ],
  },
})

describe('PoiBoundsService', () => {
  let service: PoiBoundsService

  beforeEach(() => {
    // Reset singleton so each test gets a fresh instance
    ;(PoiBoundsService as any).instance = undefined
    service = PoiBoundsService.getInstance()
    vi.clearAllMocks()
    mockFindAllWithLocation.mockResolvedValue([])
  })

  it('returns profile and content features inside the bbox', async () => {
    const profiles = [
      makeProfile('p1', 47.5, 19.0, 'Alice'),
      makeProfile('p2', 48.2, 16.3, 'Bob'),
      makeProfile('p3', 47.6, 19.1, 'Carol'),
    ]
    const posts = [makePost('post1', 47.55, 19.05, 'author1')]
    mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
    mockFindMutualMatchIds.mockResolvedValue(['p2'])
    mockFindAllWithLocation.mockResolvedValue(posts)

    const { features } = await service.getPois(
      'viewer-1',
      [16.0, 47.0, 20.0, 49.0],
      [],
      ['profile', 'post']
    )

    expect(features.filter((f) => f.kind === 'profile')).toHaveLength(3)
    const postPoints = features.filter((f) => f.kind === 'post')
    expect(postPoints).toHaveLength(1)
    expect(postPoints[0].postContent).toBe('A post')

    const bob = features.find((f) => f.id === 'p2')!
    expect(bob.highlighted).toBe(true)
    const alice = features.find((f) => f.id === 'p1')!
    expect(alice.highlighted).toBe(false)
  })

  it('excludes features outside the requested bbox', async () => {
    const profiles = [
      makeProfile('p1', 47.5, 19.0, 'Alice'), // in
      makeProfile('p2', 60.0, 20.0, 'Bob'), // out (too far north)
    ]
    mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
    mockFindMutualMatchIds.mockResolvedValue([])

    const { features } = await service.getPois(
      'viewer-1',
      [16.0, 47.0, 20.0, 49.0],
      [],
      ['profile']
    )

    expect(features).toHaveLength(1)
    expect(features[0].id).toBe('p1')
  })

  it('absorbs a colocated post into its author profile', async () => {
    const profiles = [makeProfile('p1', 47.5, 19.0)]
    const posts = [makePost('post1', 47.5, 19.0, 'p1', 47.5, 19.0)]
    mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
    mockFindMutualMatchIds.mockResolvedValue([])
    mockFindAllWithLocation.mockResolvedValue(posts)

    const { features } = await service.getPois(
      'viewer-1',
      [16.0, 47.0, 20.0, 49.0],
      [],
      ['profile', 'post']
    )

    expect(features).toHaveLength(1)
    expect(features[0].kind).toBe('profile')
    expect(features[0].hasPost).toBe(true)
  })

  it('keeps a post as standalone when its location differs from the author', async () => {
    const profiles = [makeProfile('p1', 47.5, 19.0)]
    const posts = [makePost('post1', 48.0, 20.0, 'p1', 47.5, 19.0)]
    mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
    mockFindMutualMatchIds.mockResolvedValue([])
    mockFindAllWithLocation.mockResolvedValue(posts)

    const { features } = await service.getPois(
      'viewer-1',
      [16.0, 47.0, 21.0, 49.0],
      [],
      ['profile', 'post']
    )

    const profilePoints = features.filter((f) => f.kind === 'profile')
    const postPoints = features.filter((f) => f.kind === 'post')
    expect(profilePoints).toHaveLength(1)
    expect(profilePoints[0].hasPost).toBeUndefined()
    expect(postPoints).toHaveLength(1)
  })

  it('derives tags from every matching profile, even outside the bbox', async () => {
    // The filter UI shows every tag the viewer could narrow by — not just
    // the tags carried by currently-visible profiles.
    const profiles = [makeProfile('p1', 47.5, 19.0), makeProfile('p2', 60.0, 20.0)]
    mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
    mockFindMutualMatchIds.mockResolvedValue([])

    const { tags } = await service.getPois('viewer-1', [16.0, 47.0, 20.0, 49.0], [], ['profile'])

    expect(tags.map((t) => t.id).sort()).toEqual(['tag-p1', 'tag-p2'])
  })

  it('skips post fetch when kinds is profile-only', async () => {
    mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
    mockFindMutualMatchIds.mockResolvedValue([])

    await service.getPois('viewer-1', [16.0, 47.0, 20.0, 49.0], [], ['profile'])

    expect(mockFindSocialProfilesWithLocation).toHaveBeenCalledTimes(1)
    expect(mockFindAllWithLocation).not.toHaveBeenCalled()
  })

  it('skips profile fetch when kinds is content-only', async () => {
    mockFindAllWithLocation.mockResolvedValue([])

    await service.getPois('viewer-1', [16.0, 47.0, 20.0, 49.0], [], ['post'])

    expect(mockFindSocialProfilesWithLocation).not.toHaveBeenCalled()
    expect(mockFindAllWithLocation).toHaveBeenCalledWith('viewer-1', ['post'])
  })

  it('emits empty arrays when no data is available', async () => {
    mockFindSocialProfilesWithLocation.mockResolvedValue([])
    mockFindMutualMatchIds.mockResolvedValue([])

    const { features, tags } = await service.getPois(
      'viewer-1',
      [0, 0, 10, 10],
      [],
      ['profile', 'post']
    )

    expect(features).toEqual([])
    expect(tags).toEqual([])
  })
})

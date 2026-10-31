import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetOrBuildList = vi.fn()
vi.mock('@/services/cluster.service', () => ({
  ClusterService: { getInstance: () => ({ getOrBuildList: mockGetOrBuildList }) },
}))

const mockGetProfilesPublicByIds = vi.fn()
vi.mock('@/services/profile.service', () => ({
  ProfileService: { getInstance: () => ({ getProfilesPublicByIds: mockGetProfilesPublicByIds }) },
}))

const mockFindPosts = vi.fn()
vi.mock('@/services/post.service', () => ({
  PostService: { getInstance: () => ({ findManyByIdsHydrated: mockFindPosts }) },
}))

const mockFindEvents = vi.fn()
vi.mock('@/services/event.service', () => ({
  EventService: { getInstance: () => ({ findManyByIdsHydrated: mockFindEvents }) },
}))

const mockFindCommunities = vi.fn()
vi.mock('@/services/community.service', () => ({
  CommunityService: { getInstance: () => ({ findManyByIdsHydrated: mockFindCommunities }) },
}))

vi.mock('@/lib/appconfig', () => ({ appConfig: {} }))

vi.mock('../../api/mappers/context', () => ({
  mapperContext: vi.fn(() => ({ lang: 'en' })),
}))

vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileToPublic: vi.fn((p: any, dating: boolean, locale: string) => ({
    id: p.id,
    mapped: 'public-profile',
    dating,
    locale,
  })),
}))

vi.mock('../../api/mappers/post.mappers', () => ({
  mapDbPostToDetail: vi.fn((row: any) => ({ id: row.id, mapped: 'post-detail' })),
  mapDbPostToOwner: vi.fn((row: any) => ({ id: row.id, mapped: 'post-owner' })),
}))

vi.mock('../../api/mappers/event.mappers', () => ({
  mapDbEventToDetail: vi.fn((row: any) => ({ id: row.id, mapped: 'event-detail' })),
  mapDbEventToOwner: vi.fn((row: any) => ({ id: row.id, mapped: 'event-owner' })),
}))

vi.mock('../../api/mappers/community.mappers', () => ({
  mapDbCommunityToDetail: vi.fn((row: any) => ({ id: row.id, mapped: 'community-detail' })),
  mapDbCommunityToOwner: vi.fn((row: any) => ({ id: row.id, mapped: 'community-owner' })),
}))

vi.mock('../../api/mappers/tag.mappers', () => ({
  mapTagsTranslated: vi.fn(() => []),
}))

import findProfileRoutes from '../../api/routes/findProfile.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply

const session = {
  profileId: 'viewer-1',
  lang: 'en',
  profile: { isSocialActive: true, isDatingActive: false },
}

const query = {
  south: '47.0',
  north: '48.0',
  west: '18.5',
  east: '19.5',
  kinds: 'profile,post,event,community',
}

const call = (q: Record<string, string> = query, s: any = session) =>
  fastify.routes['GET /list']!({ session: s, query: q, log: { error: vi.fn() } }, reply)

beforeEach(async () => {
  for (const m of [
    mockGetProfilesPublicByIds,
    mockFindPosts,
    mockFindEvents,
    mockFindCommunities,
  ]) {
    m.mockResolvedValue([])
  }
  fastify = new MockFastify()
  reply = new MockReply()
  await findProfileRoutes(fastify as any, {})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /list', () => {
  it('returns 403 when the viewer is not social-active', async () => {
    await call(query, { ...session, profile: { isSocialActive: false } })

    expect(reply.statusCode).toBe(403)
    expect(mockGetOrBuildList).not.toHaveBeenCalled()
  })

  it('returns 400 when bounds or kinds are missing', async () => {
    await call({ south: '47.0', north: '48.0' })

    expect(reply.statusCode).toBe(400)
  })

  it('returns 400 when the limit is above the maximum', async () => {
    await call({ ...query, limit: '101' })

    expect(reply.statusCode).toBe(400)
  })

  it('passes bbox, filters and default paging to the cluster service', async () => {
    mockGetOrBuildList.mockResolvedValue({ refs: [], total: 0 })

    await call({ ...query, tagIds: 'cabcdef01' })

    expect(mockGetOrBuildList).toHaveBeenCalledWith(
      'viewer-1',
      [18.5, 47.0, 19.5, 48.0],
      ['cabcdef01'],
      ['profile', 'post', 'event', 'community'],
      { limit: 24, offset: 0 }
    )
    expect(reply.payload).toEqual({ success: true, total: 0, hasMore: false, items: [] })
  })

  it('hydrates each kind and keeps the nearest-first order of the refs', async () => {
    mockGetOrBuildList.mockResolvedValue({
      refs: [
        { kind: 'event', id: 'e1', distanceKm: 0.5 },
        { kind: 'profile', id: 'p1', distanceKm: 1 },
        { kind: 'community', id: 'c1', distanceKm: 2 },
        { kind: 'post', id: 'po1', distanceKm: 3 },
      ],
      total: 4,
    })
    mockGetProfilesPublicByIds.mockResolvedValue([{ id: 'p1' }])
    mockFindPosts.mockResolvedValue([{ id: 'po1', postedById: 'other' }])
    mockFindEvents.mockResolvedValue([{ id: 'e1', postedById: 'other' }])
    mockFindCommunities.mockResolvedValue([{ id: 'c1', postedById: 'other' }])

    await call()

    expect(mockGetProfilesPublicByIds).toHaveBeenCalledWith(['p1'], 'viewer-1')
    expect(mockFindPosts).toHaveBeenCalledWith(['po1'], 'viewer-1')
    expect(mockFindEvents).toHaveBeenCalledWith(['e1'], 'viewer-1')
    expect(mockFindCommunities).toHaveBeenCalledWith(['c1'], 'viewer-1')
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.items).toEqual([
      { kind: 'event', distanceKm: 0.5, event: { id: 'e1', mapped: 'event-detail' } },
      {
        kind: 'profile',
        distanceKm: 1,
        profile: { id: 'p1', mapped: 'public-profile', dating: false, locale: 'en' },
      },
      { kind: 'community', distanceKm: 2, community: { id: 'c1', mapped: 'community-detail' } },
      { kind: 'post', distanceKm: 3, post: { id: 'po1', mapped: 'post-detail' } },
    ])
  })

  it("uses the owner shape for the viewer's own content", async () => {
    mockGetOrBuildList.mockResolvedValue({
      refs: [
        { kind: 'post', id: 'po1', distanceKm: 1 },
        { kind: 'event', id: 'e1', distanceKm: 2 },
        { kind: 'community', id: 'c1', distanceKm: 3 },
      ],
      total: 3,
    })
    mockFindPosts.mockResolvedValue([{ id: 'po1', postedById: 'viewer-1' }])
    mockFindEvents.mockResolvedValue([{ id: 'e1', postedById: 'viewer-1' }])
    mockFindCommunities.mockResolvedValue([{ id: 'c1', postedById: 'viewer-1' }])

    await call()

    expect(reply.payload.items.map((i: any) => i[i.kind].mapped)).toEqual([
      'post-owner',
      'event-owner',
      'community-owner',
    ])
  })

  it('drops refs that no longer hydrate', async () => {
    mockGetOrBuildList.mockResolvedValue({
      refs: [
        { kind: 'profile', id: 'p1', distanceKm: 1 },
        { kind: 'profile', id: 'gone', distanceKm: 2 },
      ],
      total: 2,
    })
    mockGetProfilesPublicByIds.mockResolvedValue([{ id: 'p1' }])

    await call()

    expect(reply.payload.items.map((i: any) => i.profile.id)).toEqual(['p1'])
    expect(reply.payload.total).toBe(2)
  })

  it('reports hasMore from offset, page size and total', async () => {
    mockGetOrBuildList.mockResolvedValue({
      refs: [{ kind: 'profile', id: 'p3', distanceKm: 3 }],
      total: 5,
    })
    mockGetProfilesPublicByIds.mockResolvedValue([{ id: 'p3' }])

    await call({ ...query, limit: '1', offset: '2' })

    expect(mockGetOrBuildList.mock.calls[0]![4]).toEqual({ limit: 1, offset: 2 })
    expect(reply.payload.hasMore).toBe(true)
  })

  it('returns hasMore false on the last page', async () => {
    mockGetOrBuildList.mockResolvedValue({
      refs: [{ kind: 'profile', id: 'p5', distanceKm: 5 }],
      total: 5,
    })

    await call({ ...query, limit: '1', offset: '4' })

    expect(reply.payload.hasMore).toBe(false)
  })

  it('returns 500 when the lookup fails', async () => {
    mockGetOrBuildList.mockRejectedValue(new Error('boom'))

    await call()

    expect(reply.statusCode).toBe(500)
  })
})

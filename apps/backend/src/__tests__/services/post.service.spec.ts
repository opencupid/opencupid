import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PostService } from '../../services/post.service'

const mockPost = {
  post: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
}

let service: PostService

beforeEach(() => {
  vi.clearAllMocks()
  // Reset singleton so each test gets a fresh instance with our mock
  ;(PostService as any).instance = undefined
  service = PostService.getInstance(mockPost as any)
})

const basePost = {
  id: 'clpost00000000000001',
  content: 'Test post',
  type: 'OFFER' as const,
  isDeleted: false,
  isVisible: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  postedById: 'clprofile000000000001',
  country: null,
  cityName: null,
  lat: null,
  lon: null,
  postedBy: {
    id: 'clprofile000000000001',
    publicName: 'Test User',
    profileImages: [],
  },
}

const postWithLocation = {
  ...basePost,
  country: 'DE',
  cityName: 'Berlin',
  lat: 52.52,
  lon: 13.405,
}

describe('PostService.create', () => {
  it('creates a post without location', async () => {
    mockPost.post.create.mockResolvedValue(basePost)

    await service.create('clprofile000000000001', {
      content: 'Test post',
      type: 'OFFER',
    })

    expect(mockPost.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'Test post',
          type: 'OFFER',
          postedById: 'clprofile000000000001',
          country: null,
          cityName: null,
          lat: null,
          lon: null,
        }),
      })
    )
  })

  it('creates a post with location fields', async () => {
    mockPost.post.create.mockResolvedValue(postWithLocation)

    await service.create('clprofile000000000001', {
      content: 'Berlin meetup',
      type: 'OFFER',
      country: 'DE',
      cityName: 'Berlin',
      lat: 52.52,
      lon: 13.405,
    })

    expect(mockPost.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'Berlin meetup',
          country: 'DE',
          cityName: 'Berlin',
          lat: 52.52,
          lon: 13.405,
        }),
      })
    )
  })

  it('defaults undefined location fields to null', async () => {
    mockPost.post.create.mockResolvedValue(basePost)

    await service.create('clprofile000000000001', {
      content: 'No location',
      type: 'REQUEST',
      country: undefined,
      lat: undefined,
    })

    expect(mockPost.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          country: null,
          cityName: null,
          lat: null,
          lon: null,
        }),
      })
    )
  })
})

describe('PostService.update', () => {
  it('returns null when post not found', async () => {
    mockPost.post.findFirst.mockResolvedValue(null)

    const result = await service.update('nonexistent', 'clprofile000000000001', {
      content: 'updated',
    })

    expect(result).toBeNull()
    expect(mockPost.post.update).not.toHaveBeenCalled()
  })

  it('updates location fields when provided', async () => {
    mockPost.post.findFirst.mockResolvedValue(basePost)
    mockPost.post.update.mockResolvedValue(postWithLocation)

    await service.update(basePost.id, basePost.postedById, {
      country: 'DE',
      cityName: 'Berlin',
      lat: 52.52,
      lon: 13.405,
    })

    expect(mockPost.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          country: 'DE',
          cityName: 'Berlin',
          lat: 52.52,
          lon: 13.405,
        }),
      })
    )
  })

  it('does not include location fields when not provided', async () => {
    mockPost.post.findFirst.mockResolvedValue(basePost)
    mockPost.post.update.mockResolvedValue({ ...basePost, content: 'updated' })

    await service.update(basePost.id, basePost.postedById, {
      content: 'updated',
    })

    const updateCall = mockPost.post.update.mock.calls[0][0]
    expect(updateCall.data).toHaveProperty('content', 'updated')
    expect(updateCall.data).not.toHaveProperty('country')
    expect(updateCall.data).not.toHaveProperty('cityName')
    expect(updateCall.data).not.toHaveProperty('lat')
    expect(updateCall.data).not.toHaveProperty('lon')
  })

  it('allows clearing location by setting fields to null', async () => {
    mockPost.post.findFirst.mockResolvedValue(postWithLocation)
    mockPost.post.update.mockResolvedValue({ ...postWithLocation, country: null, cityName: null, lat: null, lon: null })

    await service.update(postWithLocation.id, postWithLocation.postedById, {
      country: null,
      cityName: null,
      lat: null,
      lon: null,
    })

    expect(mockPost.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          country: null,
          cityName: null,
          lat: null,
          lon: null,
        }),
      })
    )
  })

  it('updates visibility when isVisible is provided', async () => {
    mockPost.post.findFirst.mockResolvedValue(basePost)
    mockPost.post.update.mockResolvedValue({ ...basePost, isVisible: false })

    await service.update(basePost.id, basePost.postedById, {
      isVisible: false,
    })

    expect(mockPost.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isVisible: false,
        }),
      })
    )
  })
})

describe('PostService.findNearby', () => {
  it('builds OR query with post location and profile fallback', async () => {
    mockPost.post.findMany.mockResolvedValue([])

    await service.findNearby(52.52, 13.405, 50)

    const call = mockPost.post.findMany.mock.calls[0][0]
    expect(call.where).toHaveProperty('OR')
    expect(call.where.OR).toHaveLength(2)

    // First clause: posts with their own location
    const postLocationClause = call.where.OR[0]
    expect(postLocationClause).toHaveProperty('lat')
    expect(postLocationClause).toHaveProperty('lon')
    expect(postLocationClause.lat).toHaveProperty('gte')
    expect(postLocationClause.lat).toHaveProperty('lte')

    // Second clause: posts without location, fallback to profile
    const profileFallbackClause = call.where.OR[1]
    expect(profileFallbackClause).toHaveProperty('lat', null)
    expect(profileFallbackClause).toHaveProperty('postedBy')
    expect(profileFallbackClause.postedBy.lat).toHaveProperty('gte')
    expect(profileFallbackClause.postedBy.lon).toHaveProperty('lte')
  })

  it('calculates correct bounding box', async () => {
    mockPost.post.findMany.mockResolvedValue([])

    const lat = 52.52
    const lon = 13.405
    const radius = 50

    await service.findNearby(lat, lon, radius)

    const expectedLatRange = radius / 111.0
    const expectedLonRange = radius / (111.0 * Math.cos(lat * Math.PI / 180))

    const call = mockPost.post.findMany.mock.calls[0][0]
    const postClause = call.where.OR[0]

    expect(postClause.lat.gte).toBeCloseTo(lat - expectedLatRange, 5)
    expect(postClause.lat.lte).toBeCloseTo(lat + expectedLatRange, 5)
    expect(postClause.lon.gte).toBeCloseTo(lon - expectedLonRange, 5)
    expect(postClause.lon.lte).toBeCloseTo(lon + expectedLonRange, 5)
  })

  it('applies type filter when provided', async () => {
    mockPost.post.findMany.mockResolvedValue([])

    await service.findNearby(52.52, 13.405, 50, { type: 'OFFER' })

    const call = mockPost.post.findMany.mock.calls[0][0]
    expect(call.where.type).toBe('OFFER')
  })

  it('filters for visible, non-deleted posts', async () => {
    mockPost.post.findMany.mockResolvedValue([])

    await service.findNearby(52.52, 13.405, 50)

    const call = mockPost.post.findMany.mock.calls[0][0]
    expect(call.where.isDeleted).toBe(false)
    expect(call.where.isVisible).toBe(true)
  })

  it('applies pagination options', async () => {
    mockPost.post.findMany.mockResolvedValue([])

    await service.findNearby(52.52, 13.405, 50, { limit: 10, offset: 5 })

    const call = mockPost.post.findMany.mock.calls[0][0]
    expect(call.take).toBe(10)
    expect(call.skip).toBe(5)
  })
})

describe('PostService.findById', () => {
  it('returns post when found', async () => {
    mockPost.post.findFirst.mockResolvedValue(basePost)

    const result = await service.findById(basePost.id, basePost.postedById)

    expect(result).toEqual(basePost)
  })

  it('returns null when post not found', async () => {
    mockPost.post.findFirst.mockResolvedValue(null)

    const result = await service.findById('nonexistent')

    expect(result).toBeNull()
  })

  it('returns null for invisible post when viewer is not owner', async () => {
    const invisiblePost = { ...basePost, isVisible: false }
    mockPost.post.findFirst.mockResolvedValue(invisiblePost)

    const result = await service.findById(invisiblePost.id, 'other-profile-id')

    expect(result).toBeNull()
  })
})

describe('PostService.delete', () => {
  it('soft-deletes a post', async () => {
    mockPost.post.findFirst.mockResolvedValue(basePost)
    mockPost.post.update.mockResolvedValue({ ...basePost, isDeleted: true })

    await service.delete(basePost.id, basePost.postedById)

    expect(mockPost.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDeleted: true }),
      })
    )
  })

  it('returns null when post not found', async () => {
    mockPost.post.findFirst.mockResolvedValue(null)

    const result = await service.delete('nonexistent', 'clprofile000000000001')

    expect(result).toBeNull()
    expect(mockPost.post.update).not.toHaveBeenCalled()
  })
})

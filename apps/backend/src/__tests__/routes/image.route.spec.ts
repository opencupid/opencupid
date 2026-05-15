import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockFastify, MockReply } from '../../test-utils/fastify'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    IMAGE_MAX_SIZE: 10 * 1024 * 1024,
    MEDIA_UPLOAD_DIR: '/tmp/test-media',
  },
}))

const mockPrisma = vi.hoisted(() => ({
  userContent: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

let mockProfileService: any
let mockImageService: any

vi.mock('@/services/profile.service', () => ({
  ProfileService: { getInstance: () => mockProfileService },
}))
vi.mock('@/services/image.service', () => ({
  ImageService: { getInstance: () => mockImageService },
}))
vi.mock('@/api/mappers/profile.mappers', () => ({
  mapProfileImagesToOwner: vi.fn((images: any[]) =>
    images.map((i) => ({ id: i.id, position: i.position ?? 0 }))
  ),
}))

// Use cuid-shaped string ids so route Zod parsing succeeds.
const PROFILE_ID = 'ckxyz000000000000000profil'
const OTHER_PROFILE = 'ckxyz000000000000000other0'
const USER_CONTENT_ID = 'ckxyz000000000000000ucont0'
const IMAGE_ID = 'ckxyz000000000000000image0'

import imageRoutes from '../../api/routes/image.route'

let fastify: MockFastify
let reply: MockReply

const makeReq = (overrides: any = {}) => ({
  user: { userId: 'u1' },
  session: { profileId: PROFILE_ID },
  ...overrides,
})

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockPrisma.userContent.findUnique.mockReset()
  mockProfileService = {
    getProfileByUserId: vi.fn(),
  }
  mockImageService = {
    listImages: vi.fn(),
    storeImage: vi.fn(),
    deleteImage: vi.fn(),
    reorderImages: vi.fn(),
  }
  await imageRoutes(fastify as any, {})
})

describe('GET /:ownerType/:ownerId (profile owner)', () => {
  it('returns 200 for the owner profile', async () => {
    const handler = fastify.routes['GET /:ownerType/:ownerId']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockImageService.listImages.mockResolvedValue([{ id: IMAGE_ID, position: 0 }])

    await handler(makeReq({ params: { ownerType: 'profile', ownerId: PROFILE_ID } }), reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockImageService.listImages).toHaveBeenCalledWith({
      type: 'profile',
      profileId: PROFILE_ID,
    })
  })

  it('returns 403 for a non-owner profile', async () => {
    const handler = fastify.routes['GET /:ownerType/:ownerId']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })

    await handler(
      makeReq({ params: { ownerType: 'profile', ownerId: OTHER_PROFILE } }),
      reply as any
    )

    expect(reply.statusCode).toBe(403)
    expect(mockImageService.listImages).not.toHaveBeenCalled()
  })
})

describe('POST /:ownerType/:ownerId (profile owner)', () => {
  const makeMultipartReq = (params: any) =>
    makeReq({
      params,
      saveRequestFiles: vi.fn().mockResolvedValue([
        {
          filepath: '/tmp/up.jpg',
          mimetype: 'image/jpeg',
          fields: { captionText: { value: 'hi' } },
        },
      ]),
    })

  it('returns 200 for owner and calls storeImage with the owner', async () => {
    const handler = fastify.routes['POST /:ownerType/:ownerId']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockImageService.storeImage.mockResolvedValue({ id: IMAGE_ID })
    mockImageService.listImages.mockResolvedValue([{ id: IMAGE_ID, position: 0 }])

    await handler(makeMultipartReq({ ownerType: 'profile', ownerId: PROFILE_ID }), reply as any)

    expect(reply.statusCode).toBe(200)
    expect(mockImageService.storeImage).toHaveBeenCalledWith('u1', '/tmp/up.jpg', 'hi', {
      type: 'profile',
      profileId: PROFILE_ID,
    })
  })

  it('returns 403 for a non-owner profile', async () => {
    const handler = fastify.routes['POST /:ownerType/:ownerId']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })

    await handler(makeMultipartReq({ ownerType: 'profile', ownerId: OTHER_PROFILE }), reply as any)

    expect(reply.statusCode).toBe(403)
    expect(mockImageService.storeImage).not.toHaveBeenCalled()
  })
})

describe('DELETE /:ownerType/:ownerId/:id (profile owner)', () => {
  it('returns 200 when delete succeeds', async () => {
    const handler = fastify.routes['DELETE /:ownerType/:ownerId/:id']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockImageService.deleteImage.mockResolvedValue(true)
    mockImageService.listImages.mockResolvedValue([])

    await handler(
      makeReq({
        params: { ownerType: 'profile', ownerId: PROFILE_ID, id: IMAGE_ID },
      }),
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(mockImageService.deleteImage).toHaveBeenCalledWith(
      { type: 'profile', profileId: PROFILE_ID },
      IMAGE_ID
    )
  })

  it('returns 404 when the service returns false', async () => {
    const handler = fastify.routes['DELETE /:ownerType/:ownerId/:id']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockImageService.deleteImage.mockResolvedValue(false)

    await handler(
      makeReq({
        params: { ownerType: 'profile', ownerId: PROFILE_ID, id: IMAGE_ID },
      }),
      reply as any
    )

    expect(reply.statusCode).toBe(404)
  })
})

describe('PATCH /:ownerType/:ownerId/order (profile owner)', () => {
  it('returns 200 with the reordered images', async () => {
    const handler = fastify.routes['PATCH /:ownerType/:ownerId/order']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockImageService.reorderImages.mockResolvedValue([{ id: IMAGE_ID, position: 1 }])

    await handler(
      makeReq({
        params: { ownerType: 'profile', ownerId: PROFILE_ID },
        body: { images: [{ id: IMAGE_ID, position: 1 }] },
      }),
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockImageService.reorderImages).toHaveBeenCalledWith(
      { type: 'profile', profileId: PROFILE_ID },
      [{ id: IMAGE_ID, position: 1 }]
    )
  })
})

describe('userContent owner', () => {
  it('GET returns 200 when requester is postedById', async () => {
    const handler = fastify.routes['GET /:ownerType/:ownerId']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: USER_CONTENT_ID,
      postedById: PROFILE_ID,
    })
    mockImageService.listImages.mockResolvedValue([])

    await handler(
      makeReq({ params: { ownerType: 'userContent', ownerId: USER_CONTENT_ID } }),
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(mockImageService.listImages).toHaveBeenCalledWith({
      type: 'userContent',
      userContentId: USER_CONTENT_ID,
    })
  })

  it('GET returns 403 when requester is not postedById', async () => {
    const handler = fastify.routes['GET /:ownerType/:ownerId']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: USER_CONTENT_ID,
      postedById: OTHER_PROFILE,
    })

    await handler(
      makeReq({ params: { ownerType: 'userContent', ownerId: USER_CONTENT_ID } }),
      reply as any
    )

    expect(reply.statusCode).toBe(403)
    expect(mockImageService.listImages).not.toHaveBeenCalled()
  })

  it('GET returns 403 when the userContent does not exist', async () => {
    const handler = fastify.routes['GET /:ownerType/:ownerId']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockPrisma.userContent.findUnique.mockResolvedValue(null)

    await handler(
      makeReq({ params: { ownerType: 'userContent', ownerId: USER_CONTENT_ID } }),
      reply as any
    )

    expect(reply.statusCode).toBe(403)
  })

  it('POST passes the userContent owner to storeImage', async () => {
    const handler = fastify.routes['POST /:ownerType/:ownerId']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: USER_CONTENT_ID,
      postedById: PROFILE_ID,
    })
    mockImageService.storeImage.mockResolvedValue({ id: IMAGE_ID })
    mockImageService.listImages.mockResolvedValue([])

    await handler(
      makeReq({
        params: { ownerType: 'userContent', ownerId: USER_CONTENT_ID },
        saveRequestFiles: vi.fn().mockResolvedValue([
          {
            filepath: '/tmp/up.jpg',
            mimetype: 'image/jpeg',
            fields: { captionText: { value: 'cap' } },
          },
        ]),
      }),
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(mockImageService.storeImage).toHaveBeenCalledWith('u1', '/tmp/up.jpg', 'cap', {
      type: 'userContent',
      userContentId: USER_CONTENT_ID,
    })
  })

  it('DELETE returns 200 with userContent owner', async () => {
    const handler = fastify.routes['DELETE /:ownerType/:ownerId/:id']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: USER_CONTENT_ID,
      postedById: PROFILE_ID,
    })
    mockImageService.deleteImage.mockResolvedValue(true)
    mockImageService.listImages.mockResolvedValue([])

    await handler(
      makeReq({
        params: { ownerType: 'userContent', ownerId: USER_CONTENT_ID, id: IMAGE_ID },
      }),
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(mockImageService.deleteImage).toHaveBeenCalledWith(
      { type: 'userContent', userContentId: USER_CONTENT_ID },
      IMAGE_ID
    )
  })

  it('PATCH /order returns 200 with userContent owner', async () => {
    const handler = fastify.routes['PATCH /:ownerType/:ownerId/order']
    mockProfileService.getProfileByUserId.mockResolvedValue({ id: PROFILE_ID })
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: USER_CONTENT_ID,
      postedById: PROFILE_ID,
    })
    mockImageService.reorderImages.mockResolvedValue([])

    await handler(
      makeReq({
        params: { ownerType: 'userContent', ownerId: USER_CONTENT_ID },
        body: { images: [{ id: IMAGE_ID, position: 0 }] },
      }),
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(mockImageService.reorderImages).toHaveBeenCalledWith(
      { type: 'userContent', userContentId: USER_CONTENT_ID },
      [{ id: IMAGE_ID, position: 0 }]
    )
  })
})

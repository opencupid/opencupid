import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockFastify, MockReply } from '../../../test-utils/fastify'

const mockPrisma = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  image: { findUnique: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/appconfig', () => ({ appConfig: { IMAGE_MAX_SIZE: 1024 } }))
vi.mock('@/lib/media', () => ({ uploadTmpDir: () => '/tmp/uploads' }))
vi.mock('@fastify/multipart', () => ({ default: vi.fn() }))

const mockImageService = vi.hoisted(() => ({ createImage: vi.fn(), deleteImage: vi.fn() }))
vi.mock('@/services/image.service', () => ({
  ImageService: { getInstance: () => mockImageService },
  ImageServiceError: class ImageServiceError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  },
}))

import adminImageRoutes from '../../../api/routes/admin/image.route'

const profileId = 'cmprofile00000000000o1'

let fastify: MockFastify
let reply: MockReply

const upload = (files: any[], query: any = { profileId }) =>
  fastify.routes['POST /']({ query, saveRequestFiles: vi.fn().mockResolvedValue(files) }, reply)

beforeEach(async () => {
  vi.clearAllMocks()
  fastify = new MockFastify()
  reply = new MockReply()
  mockPrisma.profile.findUnique.mockResolvedValue({ id: profileId })
  await adminImageRoutes(fastify as any, {})
})

describe('POST /', () => {
  it('stores the image for the profile', async () => {
    mockImageService.createImage.mockResolvedValue({ id: 'img-1' })

    await upload([{ mimetype: 'image/jpeg', filepath: '/tmp/uploads/a' }])

    expect(mockImageService.createImage).toHaveBeenCalledWith(profileId, '/tmp/uploads/a', '')
    expect(reply.statusCode).toBe(201)
    expect(reply.payload).toEqual({ success: true, id: 'img-1' })
  })

  it('requires a valid profileId', async () => {
    await upload([], {})
    expect(reply.statusCode).toBe(400)
  })

  it('rejects an unknown profile', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue(null)
    await upload([{ mimetype: 'image/jpeg', filepath: '/tmp/uploads/a' }])
    expect(reply.statusCode).toBe(400)
    expect(mockImageService.createImage).not.toHaveBeenCalled()
  })

  it('rejects a missing file', async () => {
    await upload([])
    expect(reply.statusCode).toBe(400)
  })

  it('rejects non-image files', async () => {
    await upload([{ mimetype: 'text/plain', filepath: '/tmp/uploads/a' }])
    expect(reply.statusCode).toBe(400)
    expect(mockImageService.createImage).not.toHaveBeenCalled()
  })

  it('reports oversized uploads', async () => {
    const err = Object.assign(new Error('too large'), { code: 'FST_REQ_FILE_TOO_LARGE' })
    await fastify.routes['POST /'](
      { query: { profileId }, saveRequestFiles: vi.fn().mockRejectedValue(err) },
      reply
    )
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.message).toBe('IMAGE_TOO_LARGE')
  })
})

describe('DELETE /:id', () => {
  const imageId = 'cmimage00000000000001'
  const remove = (id = imageId) => fastify.routes['DELETE /:id']({ params: { id } }, reply)

  it('deletes the image on behalf of its owner', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({ ownerProfileId: profileId })
    mockImageService.deleteImage.mockResolvedValue(undefined)

    await remove()

    expect(mockImageService.deleteImage).toHaveBeenCalledWith(imageId, profileId)
    expect(reply.statusCode).toBe(200)
  })

  it('refuses to delete an attached image', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      ownerProfileId: profileId,
      userContentGallery: { imageId },
    })
    await remove()
    expect(reply.statusCode).toBe(409)
    expect(mockImageService.deleteImage).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown image', async () => {
    mockPrisma.image.findUnique.mockResolvedValue(null)
    await remove()
    expect(reply.statusCode).toBe(404)
    expect(mockImageService.deleteImage).not.toHaveBeenCalled()
  })

  it('rejects an invalid id', async () => {
    await remove('nope')
    expect(reply.statusCode).toBe(400)
  })

  it('returns 500 for unexpected errors', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({ ownerProfileId: profileId })
    mockImageService.deleteImage.mockRejectedValue(new Error('boom'))
    await remove()
    expect(reply.statusCode).toBe(500)
  })
})

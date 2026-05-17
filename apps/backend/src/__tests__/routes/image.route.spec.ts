import { describe, it, expect, beforeEach, vi } from 'vitest'
import imageRoutes from '../../api/routes/image.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'
import { ImageServiceError } from '../../services/image.service'

let fastify: MockFastify
let reply: MockReply
let mockImageService: any

vi.mock('@/services/image.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/image.service')>(
    '@/services/image.service'
  )
  return {
    ImageService: { getInstance: () => mockImageService },
    ImageServiceError: actual.ImageServiceError,
  }
})

vi.mock('@/api/mappers/profile.mappers', () => ({
  mapProfileImagesToOwner: (images: any[]) => images, // identity for assertions
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: { IMAGE_MAX_SIZE: 5 * 1024 * 1024, MEDIA_UPLOAD_DIR: '/tmp' },
}))

vi.mock('@/lib/media', () => ({
  uploadTmpDir: () => '/tmp/uploads',
}))

// @fastify/multipart attempts to register on the fastify instance; MockFastify's
// register() is a no-op so we don't need a deep stub, but we still mock the
// module itself to avoid loading real plugin code in the unit-test process.
vi.mock('@fastify/multipart', () => ({
  default: () => {},
}))

const makeReq = (overrides: any = {}) => ({
  user: { userId: 'u1' },
  session: { profileId: 'p-1', lang: 'en' },
  ...overrides,
})

beforeEach(async () => {
  mockImageService = {
    listProfileGallery: vi.fn(),
    createImage: vi.fn(),
    attachToProfile: vi.fn(),
    deleteImage: vi.fn(),
    updateImage: vi.fn(),
    reorderProfileGallery: vi.fn(),
  }
  fastify = new MockFastify()
  reply = new MockReply()
  await imageRoutes(fastify as any, {} as any)
})

describe('image.route', () => {
  describe('GET /me', () => {
    it('returns the caller profile gallery', async () => {
      const images = [{ id: 'img-1' }, { id: 'img-2' }]
      mockImageService.listProfileGallery.mockResolvedValue(images)

      const handler = fastify.routes['GET /me']
      await handler(makeReq(), reply as any)

      expect(mockImageService.listProfileGallery).toHaveBeenCalledWith('p-1')
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images })
    })

    it('returns 500 when listing fails', async () => {
      mockImageService.listProfileGallery.mockRejectedValue(new Error('boom'))

      const handler = fastify.routes['GET /me']
      await handler(makeReq(), reply as any)

      expect(reply.statusCode).toBe(500)
      expect(reply.payload).toMatchObject({ success: false })
    })
  })

  describe('POST /', () => {
    const fileFixture = {
      filepath: '/tmp/test.jpg',
      mimetype: 'image/jpeg',
      fields: { captionText: { value: 'cap' } },
    }

    const makeUploadReq = (overrides: any = {}) =>
      makeReq({
        saveRequestFiles: vi.fn().mockResolvedValue([fileFixture]),
        ...overrides,
      })

    it('happy path: createImage + attachToProfile both succeed', async () => {
      mockImageService.createImage.mockResolvedValue({ id: 'img-new' })
      mockImageService.attachToProfile.mockResolvedValue(undefined)
      const galleryAfter = [{ id: 'img-new' }]
      mockImageService.listProfileGallery.mockResolvedValue(galleryAfter)

      const handler = fastify.routes['POST /']
      await handler(makeUploadReq(), reply as any)

      expect(mockImageService.createImage).toHaveBeenCalledWith('p-1', '/tmp/test.jpg', 'cap')
      expect(mockImageService.attachToProfile).toHaveBeenCalledWith('img-new', 'p-1')
      expect(mockImageService.deleteImage).not.toHaveBeenCalled()
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images: galleryAfter })
    })

    it('attach failure → compensating delete is called', async () => {
      mockImageService.createImage.mockResolvedValue({ id: 'img-orphan' })
      mockImageService.attachToProfile.mockRejectedValue(new Error('attach failed'))

      const handler = fastify.routes['POST /']
      await handler(makeUploadReq(), reply as any)

      expect(mockImageService.deleteImage).toHaveBeenCalledWith('img-orphan', 'p-1')
      expect(reply.statusCode).toBe(500)
      expect(reply.payload).toMatchObject({ success: false })
    })

    it('createImage failure → no cleanup attempted', async () => {
      mockImageService.createImage.mockRejectedValue(new Error('create failed'))

      const handler = fastify.routes['POST /']
      await handler(makeUploadReq(), reply as any)

      expect(mockImageService.attachToProfile).not.toHaveBeenCalled()
      expect(mockImageService.deleteImage).not.toHaveBeenCalled()
      expect(reply.statusCode).toBe(500)
      expect(reply.payload).toMatchObject({ success: false })
    })
  })

  describe('DELETE /:id', () => {
    const cuid = 'ckxyz0000000000000000000a'

    it('happy path returns 200 with updated gallery', async () => {
      mockImageService.deleteImage.mockResolvedValue(undefined)
      const galleryAfter = [{ id: 'img-keep' }]
      mockImageService.listProfileGallery.mockResolvedValue(galleryAfter)

      const handler = fastify.routes['DELETE /:id']
      await handler(makeReq({ params: { id: cuid } }), reply as any)

      expect(mockImageService.deleteImage).toHaveBeenCalledWith(cuid, 'p-1')
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images: galleryAfter })
    })

    it('owner mismatch → 403 Forbidden', async () => {
      mockImageService.deleteImage.mockRejectedValue(
        new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
      )

      const handler = fastify.routes['DELETE /:id']
      await handler(makeReq({ params: { id: cuid } }), reply as any)

      expect(reply.statusCode).toBe(403)
      expect(reply.payload).toMatchObject({ success: false })
    })
  })

  describe('PATCH /:id', () => {
    const cuid = 'ckxyz0000000000000000000b'

    it('happy path calls updateImage with altText and returns gallery', async () => {
      mockImageService.updateImage.mockResolvedValue(undefined)
      const galleryAfter = [{ id: cuid, altText: 'new alt' }]
      mockImageService.listProfileGallery.mockResolvedValue(galleryAfter)

      const handler = fastify.routes['PATCH /:id']
      await handler(makeReq({ params: { id: cuid }, body: { altText: 'new alt' } }), reply as any)

      expect(mockImageService.updateImage).toHaveBeenCalledWith(cuid, 'p-1', {
        altText: 'new alt',
      })
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images: galleryAfter })
    })

    it('owner mismatch → 403 Forbidden', async () => {
      mockImageService.updateImage.mockRejectedValue(
        new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
      )

      const handler = fastify.routes['PATCH /:id']
      await handler(makeReq({ params: { id: cuid }, body: { altText: 'whatever' } }), reply as any)

      expect(reply.statusCode).toBe(403)
      expect(reply.payload).toMatchObject({ success: false })
    })
  })

  describe('PATCH /order', () => {
    const cuid1 = 'ckxyz0000000000000000000c'
    const cuid2 = 'ckxyz0000000000000000000d'
    const orderPayload = {
      images: [
        { id: cuid1, position: 0 },
        { id: cuid2, position: 1 },
      ],
    }

    it('happy path calls reorderProfileGallery', async () => {
      const galleryAfter = [{ id: cuid1 }, { id: cuid2 }]
      mockImageService.reorderProfileGallery.mockResolvedValue(galleryAfter)

      const handler = fastify.routes['PATCH /order']
      await handler(makeReq({ body: orderPayload }), reply as any)

      expect(mockImageService.reorderProfileGallery).toHaveBeenCalledWith(
        'p-1',
        orderPayload.images
      )
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images: galleryAfter })
    })

    it('length mismatch → 400 INVALID_REORDER', async () => {
      mockImageService.reorderProfileGallery.mockRejectedValue(
        new ImageServiceError(
          'INVALID_REORDER',
          'Reorder must include every image in the gallery exactly once'
        )
      )

      const handler = fastify.routes['PATCH /order']
      await handler(makeReq({ body: orderPayload }), reply as any)

      expect(reply.statusCode).toBe(400)
      expect(reply.payload).toMatchObject({ success: false, message: 'INVALID_REORDER' })
    })
  })
})

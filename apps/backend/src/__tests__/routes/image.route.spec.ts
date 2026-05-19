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

vi.mock('@/api/mappers/image.mappers', () => ({
  toOwnerImage: (image: any) => image, // identity for assertions
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
    detachFromProfile: vi.fn(),
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

    it('happy path: creates the image and returns the single created image (no attach)', async () => {
      const created = { id: 'img-new', mimeType: 'image/jpeg', altText: 'cap', position: 0 }
      mockImageService.createImage.mockResolvedValue(created)

      const handler = fastify.routes['POST /']
      await handler(makeUploadReq(), reply as any)

      expect(mockImageService.createImage).toHaveBeenCalledWith('p-1', '/tmp/test.jpg', 'cap')
      expect(mockImageService.attachToProfile).not.toHaveBeenCalled()
      expect(mockImageService.listProfileGallery).not.toHaveBeenCalled()
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, image: created })
    })

    it('createImage failure → 500, no compensating delete', async () => {
      mockImageService.createImage.mockRejectedValue(new Error('create failed'))

      const handler = fastify.routes['POST /']
      await handler(makeUploadReq(), reply as any)

      expect(mockImageService.deleteImage).not.toHaveBeenCalled()
      expect(reply.statusCode).toBe(500)
      expect(reply.payload).toMatchObject({ success: false })
    })

    it('rejects non-image mime types with 400', async () => {
      const handler = fastify.routes['POST /']
      await handler(
        makeUploadReq({
          saveRequestFiles: vi.fn().mockResolvedValue([{ ...fileFixture, mimetype: 'text/plain' }]),
        }),
        reply as any
      )
      expect(reply.statusCode).toBe(400)
      expect(mockImageService.createImage).not.toHaveBeenCalled()
    })

    it('FST_REQ_FILE_TOO_LARGE → 400 IMAGE_TOO_LARGE', async () => {
      const req = makeReq({
        saveRequestFiles: vi
          .fn()
          .mockRejectedValue(
            Object.assign(new Error('too large'), { code: 'FST_REQ_FILE_TOO_LARGE' })
          ),
      })
      const handler = fastify.routes['POST /']
      await handler(req, reply as any)
      expect(reply.statusCode).toBe(400)
      expect(reply.payload).toMatchObject({ success: false, message: 'IMAGE_TOO_LARGE' })
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

  describe('POST /me/attach', () => {
    const imageId = 'ckxyz0000000000000000atta'

    it('happy path: calls attachToProfile and returns updated gallery', async () => {
      mockImageService.attachToProfile.mockResolvedValue(undefined)
      const galleryAfter = [{ id: imageId }]
      mockImageService.listProfileGallery.mockResolvedValue(galleryAfter)

      const handler = fastify.routes['POST /me/attach']
      await handler(makeReq({ body: { imageId } }), reply as any)

      expect(mockImageService.attachToProfile).toHaveBeenCalledWith(imageId, 'p-1')
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images: galleryAfter })
    })

    it('owner mismatch → 403', async () => {
      mockImageService.attachToProfile.mockRejectedValue(
        new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
      )
      const handler = fastify.routes['POST /me/attach']
      await handler(makeReq({ body: { imageId } }), reply as any)
      expect(reply.statusCode).toBe(403)
    })

    it('image not found → 404', async () => {
      mockImageService.attachToProfile.mockRejectedValue(
        new ImageServiceError('NOT_FOUND', 'Image not found')
      )
      const handler = fastify.routes['POST /me/attach']
      await handler(makeReq({ body: { imageId } }), reply as any)
      expect(reply.statusCode).toBe(404)
    })

    it('already attached → 409', async () => {
      mockImageService.attachToProfile.mockRejectedValue(
        new ImageServiceError('ALREADY_ATTACHED', 'Image already attached')
      )
      const handler = fastify.routes['POST /me/attach']
      await handler(makeReq({ body: { imageId } }), reply as any)
      expect(reply.statusCode).toBe(409)
    })
  })

  describe('DELETE /me/:imageId', () => {
    const imageId = 'ckxyz0000000000000000deta'

    it('happy path: calls detachFromProfile and returns updated gallery', async () => {
      mockImageService.detachFromProfile.mockResolvedValue(undefined)
      const galleryAfter = [{ id: 'img-keep' }]
      mockImageService.listProfileGallery.mockResolvedValue(galleryAfter)

      const handler = fastify.routes['DELETE /me/:imageId']
      await handler(makeReq({ params: { imageId } }), reply as any)

      expect(mockImageService.detachFromProfile).toHaveBeenCalledWith(imageId, 'p-1')
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images: galleryAfter })
    })

    it('owner mismatch → 403', async () => {
      mockImageService.detachFromProfile.mockRejectedValue(
        new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
      )
      const handler = fastify.routes['DELETE /me/:imageId']
      await handler(makeReq({ params: { imageId } }), reply as any)
      expect(reply.statusCode).toBe(403)
    })

    it('image not in gallery → 404', async () => {
      mockImageService.detachFromProfile.mockRejectedValue(
        new ImageServiceError('NOT_FOUND', 'Image is not attached to a profile gallery')
      )
      const handler = fastify.routes['DELETE /me/:imageId']
      await handler(makeReq({ params: { imageId } }), reply as any)
      expect(reply.statusCode).toBe(404)
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import contentImageRoutes from '../../../api/routes/content/image.route'
import { MockFastify, MockReply } from '../../../test-utils/fastify'
import { prisma } from '../../../lib/prisma'
import { ImageServiceError } from '../../../services/image.service'

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

vi.mock('@/api/mappers/image.mappers', () => ({
  toOwnerImage: (image: any) => image, // identity for assertions
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: { IMAGE_MAX_SIZE: 5 * 1024 * 1024, MEDIA_UPLOAD_DIR: '/tmp' },
}))

vi.mock('@/lib/media', () => ({
  uploadTmpDir: () => '/tmp/uploads',
}))

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    userContent: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@fastify/multipart', () => ({
  default: () => {},
}))

const CONTENT_ID = 'ckxyz0000000000000000cont'

const makeReq = (overrides: any = {}) => ({
  user: { userId: 'u1' },
  session: { profileId: 'p-1', lang: 'en' },
  params: { contentId: CONTENT_ID },
  ...overrides,
})

beforeEach(async () => {
  mockImageService = {
    listUserContentGallery: vi.fn(),
    createImage: vi.fn(),
    attachToUserContent: vi.fn(),
    deleteImage: vi.fn(),
    reorderUserContentGallery: vi.fn(),
  }
  ;(prisma.userContent.findUnique as any).mockReset()
  ;(prisma.userContent.findUnique as any).mockResolvedValue({
    id: CONTENT_ID,
    postedById: 'p-1',
  })
  fastify = new MockFastify()
  reply = new MockReply()
  await contentImageRoutes(fastify as any, {} as any)
})

describe('content/image.route', () => {
  describe('GET /:contentId/image', () => {
    it('happy path: returns owner gallery via listUserContentGallery', async () => {
      const images = [{ id: 'img-1' }, { id: 'img-2' }]
      mockImageService.listUserContentGallery.mockResolvedValue(images)

      const handler = fastify.routes['GET /:contentId/image']
      await handler(makeReq(), reply as any)

      expect(prisma.userContent.findUnique).toHaveBeenCalledWith({ where: { id: CONTENT_ID } })
      expect(mockImageService.listUserContentGallery).toHaveBeenCalledWith(CONTENT_ID)
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images })
    })

    it('returns 404 when content not found', async () => {
      ;(prisma.userContent.findUnique as any).mockResolvedValue(null)

      const handler = fastify.routes['GET /:contentId/image']
      await handler(makeReq(), reply as any)

      expect(reply.statusCode).toBe(404)
      expect(reply.payload).toMatchObject({ success: false })
      expect(mockImageService.listUserContentGallery).not.toHaveBeenCalled()
    })

    it('returns 403 when caller is not the owner', async () => {
      ;(prisma.userContent.findUnique as any).mockResolvedValue({
        id: CONTENT_ID,
        postedById: 'p-OTHER',
      })

      const handler = fastify.routes['GET /:contentId/image']
      await handler(makeReq(), reply as any)

      expect(reply.statusCode).toBe(403)
      expect(reply.payload).toMatchObject({ success: false })
      expect(mockImageService.listUserContentGallery).not.toHaveBeenCalled()
    })
  })

  describe('POST /:contentId/image', () => {
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

    it('happy path: createImage({ detectFace: false }) + attachToUserContent', async () => {
      mockImageService.createImage.mockResolvedValue({ id: 'img-new' })
      mockImageService.attachToUserContent.mockResolvedValue(undefined)
      const galleryAfter = [{ id: 'img-new' }]
      mockImageService.listUserContentGallery.mockResolvedValue(galleryAfter)

      const handler = fastify.routes['POST /:contentId/image']
      await handler(makeUploadReq(), reply as any)

      expect(mockImageService.createImage).toHaveBeenCalledWith('p-1', '/tmp/test.jpg', 'cap', {
        detectFace: false,
      })
      expect(mockImageService.attachToUserContent).toHaveBeenCalledWith('img-new', CONTENT_ID)
      expect(mockImageService.deleteImage).not.toHaveBeenCalled()
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images: galleryAfter })
    })

    it('returns 404 when content not found', async () => {
      ;(prisma.userContent.findUnique as any).mockResolvedValue(null)

      const handler = fastify.routes['POST /:contentId/image']
      await handler(makeUploadReq(), reply as any)

      expect(reply.statusCode).toBe(404)
      expect(reply.payload).toMatchObject({ success: false })
      expect(mockImageService.createImage).not.toHaveBeenCalled()
    })

    it('returns 403 when caller is not the owner', async () => {
      ;(prisma.userContent.findUnique as any).mockResolvedValue({
        id: CONTENT_ID,
        postedById: 'p-OTHER',
      })

      const handler = fastify.routes['POST /:contentId/image']
      await handler(makeUploadReq(), reply as any)

      expect(reply.statusCode).toBe(403)
      expect(reply.payload).toMatchObject({ success: false })
      expect(mockImageService.createImage).not.toHaveBeenCalled()
    })

    it('attach failure → compensating deleteImage invoked, response 500', async () => {
      mockImageService.createImage.mockResolvedValue({ id: 'img-orphan' })
      mockImageService.attachToUserContent.mockRejectedValue(new Error('attach failed'))

      const handler = fastify.routes['POST /:contentId/image']
      await handler(makeUploadReq(), reply as any)

      expect(mockImageService.deleteImage).toHaveBeenCalledWith('img-orphan', 'p-1')
      expect(reply.statusCode).toBe(500)
      expect(reply.payload).toMatchObject({ success: false })
    })
  })

  describe('PATCH /:contentId/image/order', () => {
    const cuid1 = 'ckxyz0000000000000000000c'
    const cuid2 = 'ckxyz0000000000000000000d'
    const orderPayload = {
      images: [
        { id: cuid1, position: 0 },
        { id: cuid2, position: 1 },
      ],
    }

    it('happy path: calls reorderUserContentGallery and returns gallery', async () => {
      const galleryAfter = [{ id: cuid1 }, { id: cuid2 }]
      mockImageService.reorderUserContentGallery.mockResolvedValue(galleryAfter)

      const handler = fastify.routes['PATCH /:contentId/image/order']
      await handler(makeReq({ body: orderPayload }), reply as any)

      expect(mockImageService.reorderUserContentGallery).toHaveBeenCalledWith(
        CONTENT_ID,
        orderPayload.images
      )
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images: galleryAfter })
    })

    it('length mismatch → 400 INVALID_REORDER', async () => {
      mockImageService.reorderUserContentGallery.mockRejectedValue(
        new ImageServiceError(
          'INVALID_REORDER',
          'Reorder must include every image in the gallery exactly once'
        )
      )

      const handler = fastify.routes['PATCH /:contentId/image/order']
      await handler(makeReq({ body: orderPayload }), reply as any)

      expect(reply.statusCode).toBe(400)
      expect(reply.payload).toMatchObject({ success: false, message: 'INVALID_REORDER' })
    })

    it('non-owner → 403 Forbidden', async () => {
      ;(prisma.userContent.findUnique as any).mockResolvedValue({
        id: CONTENT_ID,
        postedById: 'p-OTHER',
      })

      const handler = fastify.routes['PATCH /:contentId/image/order']
      await handler(makeReq({ body: orderPayload }), reply as any)

      expect(reply.statusCode).toBe(403)
      expect(reply.payload).toMatchObject({ success: false })
      expect(mockImageService.reorderUserContentGallery).not.toHaveBeenCalled()
    })
  })
})

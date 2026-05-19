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

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    userContent: {
      findUnique: vi.fn(),
    },
  },
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
    attachToUserContent: vi.fn(),
    reorderUserContentGallery: vi.fn(),
    detachFromUserContent: vi.fn(),
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

  describe('POST /:contentId/image/attach', () => {
    const imageId = 'ckxyz0000000000000000atta'

    it('happy path: verifies content ownership, calls attachToUserContent, returns gallery', async () => {
      mockImageService.attachToUserContent.mockResolvedValue(undefined)
      const galleryAfter = [{ id: imageId }]
      mockImageService.listUserContentGallery.mockResolvedValue(galleryAfter)

      const handler = fastify.routes['POST /:contentId/image/attach']
      await handler(makeReq({ body: { imageId } }), reply as any)

      expect(prisma.userContent.findUnique).toHaveBeenCalledWith({ where: { id: CONTENT_ID } })
      expect(mockImageService.attachToUserContent).toHaveBeenCalledWith(imageId, CONTENT_ID)
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images: galleryAfter })
    })

    it('content not found → 404', async () => {
      ;(prisma.userContent.findUnique as any).mockResolvedValue(null)
      const handler = fastify.routes['POST /:contentId/image/attach']
      await handler(makeReq({ body: { imageId } }), reply as any)
      expect(reply.statusCode).toBe(404)
      expect(mockImageService.attachToUserContent).not.toHaveBeenCalled()
    })

    it('caller is not the content owner → 403', async () => {
      ;(prisma.userContent.findUnique as any).mockResolvedValue({
        id: CONTENT_ID,
        postedById: 'p-OTHER',
      })
      const handler = fastify.routes['POST /:contentId/image/attach']
      await handler(makeReq({ body: { imageId } }), reply as any)
      expect(reply.statusCode).toBe(403)
      expect(mockImageService.attachToUserContent).not.toHaveBeenCalled()
    })

    it('image not found → 404', async () => {
      mockImageService.attachToUserContent.mockRejectedValue(
        new ImageServiceError('NOT_FOUND', 'Image not found')
      )
      const handler = fastify.routes['POST /:contentId/image/attach']
      await handler(makeReq({ body: { imageId } }), reply as any)
      expect(reply.statusCode).toBe(404)
    })

    it('image owner mismatch → 403', async () => {
      mockImageService.attachToUserContent.mockRejectedValue(
        new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch with content author')
      )
      const handler = fastify.routes['POST /:contentId/image/attach']
      await handler(makeReq({ body: { imageId } }), reply as any)
      expect(reply.statusCode).toBe(403)
    })

    it('image already attached → 409', async () => {
      mockImageService.attachToUserContent.mockRejectedValue(
        new ImageServiceError('ALREADY_ATTACHED', 'Image already attached')
      )
      const handler = fastify.routes['POST /:contentId/image/attach']
      await handler(makeReq({ body: { imageId } }), reply as any)
      expect(reply.statusCode).toBe(409)
    })
  })

  describe('DELETE /:contentId/image/:imageId', () => {
    const imageId = 'ckxyz0000000000000000detc'

    it('happy path: verifies ownership, calls detachFromUserContent, returns gallery', async () => {
      mockImageService.detachFromUserContent.mockResolvedValue(undefined)
      const galleryAfter = [{ id: 'img-keep' }]
      mockImageService.listUserContentGallery.mockResolvedValue(galleryAfter)

      const handler = fastify.routes['DELETE /:contentId/image/:imageId']
      await handler(makeReq({ params: { contentId: CONTENT_ID, imageId } }), reply as any)

      expect(mockImageService.detachFromUserContent).toHaveBeenCalledWith(imageId, 'p-1')
      expect(reply.statusCode).toBe(200)
      expect(reply.payload).toEqual({ success: true, images: galleryAfter })
    })

    it('content not found → 404', async () => {
      ;(prisma.userContent.findUnique as any).mockResolvedValue(null)
      const handler = fastify.routes['DELETE /:contentId/image/:imageId']
      await handler(makeReq({ params: { contentId: CONTENT_ID, imageId } }), reply as any)
      expect(reply.statusCode).toBe(404)
    })

    it('non-owner → 403', async () => {
      ;(prisma.userContent.findUnique as any).mockResolvedValue({
        id: CONTENT_ID,
        postedById: 'p-OTHER',
      })
      const handler = fastify.routes['DELETE /:contentId/image/:imageId']
      await handler(makeReq({ params: { contentId: CONTENT_ID, imageId } }), reply as any)
      expect(reply.statusCode).toBe(403)
    })

    it('image owner mismatch → 403', async () => {
      mockImageService.detachFromUserContent.mockRejectedValue(
        new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
      )
      const handler = fastify.routes['DELETE /:contentId/image/:imageId']
      await handler(makeReq({ params: { contentId: CONTENT_ID, imageId } }), reply as any)
      expect(reply.statusCode).toBe(403)
    })

    it('image not in this gallery → 404', async () => {
      mockImageService.detachFromUserContent.mockRejectedValue(
        new ImageServiceError('NOT_FOUND', 'Image is not attached to a content gallery')
      )
      const handler = fastify.routes['DELETE /:contentId/image/:imageId']
      await handler(makeReq({ params: { contentId: CONTENT_ID, imageId } }), reply as any)
      expect(reply.statusCode).toBe(404)
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

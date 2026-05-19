import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let mockPrisma: any = {}
vi.mock('../../lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

let mockAttachMany: any
vi.mock('../../services/image.service', () => ({
  ImageService: {
    getInstance: () => ({ attachManyToUserContentTx: mockAttachMany }),
  },
  ImageServiceError: class extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message)
    }
  },
}))

let service: any

beforeEach(async () => {
  Object.assign(mockPrisma, createMockPrisma())
  mockPrisma.userContent.create = vi.fn().mockResolvedValue({
    id: 'content-1',
    kind: 'post',
    content: 'hello world hello world',
    postedById: 'profile-1',
    post: { type: 'OFFER' },
    postedBy: { id: 'profile-1', profileImages: [] },
  })
  mockPrisma.$transaction = vi.fn((fn: any) => fn(mockPrisma))
  mockAttachMany = vi.fn().mockResolvedValue(undefined)
  const mod = await import('../../services/post.service')
  ;(mod.PostService as any).postInstance = undefined
  service = mod.PostService.getInstance()
})

describe('PostService.create with imageIds', () => {
  it('calls attachManyToUserContentTx with supplied imageIds and new contentId', async () => {
    await service.create('profile-1', {
      content: 'x'.repeat(20),
      type: 'OFFER',
      imageIds: ['img-a', 'img-b'],
    })

    expect(mockAttachMany).toHaveBeenCalledWith(
      mockPrisma,
      ['img-a', 'img-b'],
      'content-1',
      'profile-1',
    )
  })

  it('does not call attachManyToUserContentTx when imageIds is omitted', async () => {
    await service.create('profile-1', { content: 'x'.repeat(20), type: 'OFFER' })
    expect(mockAttachMany).not.toHaveBeenCalled()
  })

  it('does not call attachManyToUserContentTx for empty imageIds', async () => {
    await service.create('profile-1', { content: 'x'.repeat(20), type: 'OFFER', imageIds: [] })
    expect(mockAttachMany).not.toHaveBeenCalled()
  })
})

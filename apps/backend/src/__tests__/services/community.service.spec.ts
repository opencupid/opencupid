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
      message: string
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
    kind: 'community',
    content: 'hello world hello world',
    postedById: 'profile-1',
    community: { yearFounded: null },
    postedBy: { id: 'profile-1', profileImages: [] },
  })
  mockPrisma.$transaction = vi.fn((fn: any) => fn(mockPrisma))
  mockAttachMany = vi.fn().mockResolvedValue(undefined)
  const mod = await import('../../services/community.service')
  ;(mod.CommunityService as any).communityInstance = undefined
  service = mod.CommunityService.getInstance()
})

describe('CommunityService.create with imageIds', () => {
  const baseData = { content: 'x'.repeat(20) }

  it('calls attachManyToUserContentTx with imageIds + new contentId', async () => {
    await service.create('profile-1', { ...baseData, imageIds: ['img-a', 'img-b', 'img-c'] })
    expect(mockAttachMany).toHaveBeenCalledWith(
      mockPrisma,
      ['img-a', 'img-b', 'img-c'],
      'content-1',
      'profile-1'
    )
  })

  it('does not call attach for omitted imageIds', async () => {
    await service.create('profile-1', baseData)
    expect(mockAttachMany).not.toHaveBeenCalled()
  })

  it('does not call attach for empty imageIds', async () => {
    await service.create('profile-1', { ...baseData, imageIds: [] })
    expect(mockAttachMany).not.toHaveBeenCalled()
  })
})

// Tag semantics are covered in post.service.spec.ts — the helpers live on the
// shared UserContentService base. These assert CommunityService is wired to them.
describe('CommunityService tag wiring', () => {
  beforeEach(() => {
    mockPrisma.tag.findMany = vi.fn().mockResolvedValue([{ id: 'tag-a' }])
  })

  it('connects tags on create', async () => {
    await service.create('profile-1', { content: 'x'.repeat(20), tagIds: ['tag-a'] })

    const createArg = mockPrisma.userContent.create.mock.calls[0][0]
    expect(createArg.data.tags).toEqual({ connect: [{ id: 'tag-a' }] })
  })

  it('replaces tags on update without leaking tagIds into the scalar update', async () => {
    mockPrisma.userContent.updateMany = vi.fn().mockResolvedValue({ count: 1 })
    mockPrisma.userContent.update = vi.fn().mockResolvedValue({})
    mockPrisma.userContent.findFirst = vi.fn().mockResolvedValue({ id: 'content-1' })

    await service.update('content-1', 'profile-1', { yearFounded: 1999, tagIds: ['tag-a'] })

    expect(mockPrisma.userContent.update).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { tags: { set: [{ id: 'tag-a' }] } },
    })
    expect(mockPrisma.userContent.updateMany.mock.calls[0][0].data).not.toHaveProperty('tagIds')
  })
})

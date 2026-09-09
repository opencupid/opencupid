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
      'profile-1'
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

/**
 * Tag writes are implemented once on UserContentService (`tagConnectTx` /
 * `setTagsTx`) and inherited by every kind, so the behavioural contract is
 * covered here in full. The event and community specs assert only that they
 * are wired to it.
 */
describe('PostService.create with tagIds', () => {
  const baseData = { content: 'x'.repeat(20), type: 'OFFER' as const }

  beforeEach(() => {
    mockPrisma.tag.findMany = vi.fn().mockResolvedValue([{ id: 'tag-a' }, { id: 'tag-b' }])
  })

  it('connects the supplied tags on the new content row', async () => {
    await service.create('profile-1', { ...baseData, tagIds: ['tag-a', 'tag-b'] })

    const createArg = mockPrisma.userContent.create.mock.calls[0][0]
    expect(createArg.data.tags).toEqual({ connect: [{ id: 'tag-a' }, { id: 'tag-b' }] })
  })

  it('only accepts tags that are approved and not soft-deleted', async () => {
    await service.create('profile-1', { ...baseData, tagIds: ['tag-a', 'tag-b'] })

    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['tag-a', 'tag-b'] }, isDeleted: false, isApproved: true },
      select: { id: true },
    })
  })

  it('rejects unknown tag ids instead of letting Prisma fail on connect', async () => {
    mockPrisma.tag.findMany = vi.fn().mockResolvedValue([{ id: 'tag-a' }])

    await expect(
      service.create('profile-1', { ...baseData, tagIds: ['tag-a', 'tag-gone'] })
    ).rejects.toMatchObject({ name: 'TagServiceError', code: 'NOT_FOUND' })

    expect(mockPrisma.userContent.create).not.toHaveBeenCalled()
  })

  it('de-duplicates repeated ids', async () => {
    mockPrisma.tag.findMany = vi.fn().mockResolvedValue([{ id: 'tag-a' }])
    await service.create('profile-1', { ...baseData, tagIds: ['tag-a', 'tag-a'] })

    const createArg = mockPrisma.userContent.create.mock.calls[0][0]
    expect(createArg.data.tags).toEqual({ connect: [{ id: 'tag-a' }] })
  })

  it('writes no tag relation when tagIds is omitted', async () => {
    await service.create('profile-1', baseData)

    const createArg = mockPrisma.userContent.create.mock.calls[0][0]
    expect(createArg.data).not.toHaveProperty('tags')
    expect(mockPrisma.tag.findMany).not.toHaveBeenCalled()
  })

  it('writes no tag relation for an empty tagIds array', async () => {
    await service.create('profile-1', { ...baseData, tagIds: [] })

    const createArg = mockPrisma.userContent.create.mock.calls[0][0]
    expect(createArg.data).not.toHaveProperty('tags')
  })
})

describe('PostService.update with tagIds', () => {
  beforeEach(() => {
    mockPrisma.userContent.updateMany = vi.fn().mockResolvedValue({ count: 1 })
    mockPrisma.userContent.update = vi.fn().mockResolvedValue({})
    mockPrisma.postContent.update = vi.fn().mockResolvedValue({})
    mockPrisma.userContent.findFirst = vi.fn().mockResolvedValue({ id: 'content-1' })
    mockPrisma.tag.findMany = vi.fn().mockResolvedValue([{ id: 'tag-a' }])
  })

  it('replaces the whole tag set', async () => {
    await service.update('content-1', 'profile-1', { type: 'OFFER', tagIds: ['tag-a'] })

    expect(mockPrisma.userContent.update).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { tags: { set: [{ id: 'tag-a' }] } },
    })
  })

  it('clears the tag set for an empty array', async () => {
    await service.update('content-1', 'profile-1', { type: 'OFFER', tagIds: [] })

    expect(mockPrisma.userContent.update).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { tags: { set: [] } },
    })
  })

  it('leaves tags untouched when tagIds is omitted', async () => {
    await service.update('content-1', 'profile-1', { type: 'OFFER' })
    expect(mockPrisma.userContent.update).not.toHaveBeenCalled()
  })

  // tagIds is not a UserContent column; leaking it into the ownership-gated
  // updateMany would make Prisma reject the scalar update at runtime.
  it('keeps tagIds out of the scalar update', async () => {
    await service.update('content-1', 'profile-1', {
      content: 'y'.repeat(20),
      type: 'OFFER',
      tagIds: ['tag-a'],
    })

    const updateManyArg = mockPrisma.userContent.updateMany.mock.calls[0][0]
    expect(updateManyArg.data).not.toHaveProperty('tagIds')
    expect(updateManyArg.data.content).toBe('y'.repeat(20))
  })

  it('does not touch tags when the ownership gate rejects the write', async () => {
    mockPrisma.userContent.updateMany = vi.fn().mockResolvedValue({ count: 0 })

    const result = await service.update('content-1', 'someone-else', {
      type: 'OFFER',
      tagIds: ['tag-a'],
    })

    expect(result).toBeNull()
    expect(mockPrisma.userContent.update).not.toHaveBeenCalled()
  })
})

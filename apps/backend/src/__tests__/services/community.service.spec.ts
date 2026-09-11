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

describe('CommunityService.create contact fields', () => {
  const baseData = { content: 'x'.repeat(20) }

  it('persists the supplied description and contact fields', async () => {
    await service.create('profile-1', {
      ...baseData,
      description: 'A long description.',
      contactUrl: 'https://example.org',
      contactEmail: 'hello@example.org',
    })
    expect(mockPrisma.userContent.create.mock.calls[0][0].data.community.create).toEqual({
      yearFounded: null,
      description: 'A long description.',
      contactUrl: 'https://example.org',
      contactEmail: 'hello@example.org',
    })
  })

  it('defaults omitted description and contact fields to null', async () => {
    await service.create('profile-1', baseData)
    expect(mockPrisma.userContent.create.mock.calls[0][0].data.community.create).toEqual({
      yearFounded: null,
      description: null,
      contactUrl: null,
      contactEmail: null,
    })
  })
})

describe('CommunityService.update contact fields', () => {
  beforeEach(() => {
    mockPrisma.userContent.updateMany = vi.fn().mockResolvedValue({ count: 1 })
    mockPrisma.userContent.findFirst = vi.fn().mockResolvedValue({ id: 'content-1' })
    mockPrisma.communityContent.update = vi.fn().mockResolvedValue({})
  })

  it('writes only the fields present in the payload', async () => {
    await service.update('content-1', 'profile-1', { contactEmail: 'hello@example.org' })
    expect(mockPrisma.communityContent.update).toHaveBeenCalledWith({
      where: { userContentId: 'content-1' },
      data: {
        yearFounded: undefined,
        description: undefined,
        contactUrl: undefined,
        contactEmail: 'hello@example.org',
      },
    })
  })

  it('writes the description when present in the payload', async () => {
    await service.update('content-1', 'profile-1', { description: 'Updated description.' })
    expect(mockPrisma.communityContent.update).toHaveBeenCalledWith({
      where: { userContentId: 'content-1' },
      data: {
        yearFounded: undefined,
        description: 'Updated description.',
        contactUrl: undefined,
        contactEmail: undefined,
      },
    })
  })

  it('clears a field when explicitly set to null', async () => {
    await service.update('content-1', 'profile-1', { contactUrl: null })
    expect(mockPrisma.communityContent.update).toHaveBeenCalledWith({
      where: { userContentId: 'content-1' },
      data: {
        yearFounded: undefined,
        description: undefined,
        contactUrl: null,
        contactEmail: undefined,
      },
    })
  })

  it('skips the CommunityContent write when only base scalars change', async () => {
    await service.update('content-1', 'profile-1', { content: 'updated content here' })
    expect(mockPrisma.communityContent.update).not.toHaveBeenCalled()
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

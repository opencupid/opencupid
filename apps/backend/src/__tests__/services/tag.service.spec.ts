import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  const module = await import('../../services/tag.service')
  ;(module.TagService as any).instance = undefined
  service = module.TagService.getInstance()
})

describe('TagService', () => {
  it('searches tags', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([{ id: 'cksearchtagid1234567890', name: 'foo', slug: 'foo' }])
    const result = await service.search('en', 'foo')
    expect(mockPrisma.tag.findMany).toHaveBeenCalled()
    expect(result[0].name).toBe('foo')
  })

  it('creates a tag', async () => {
    mockPrisma.tag.create.mockResolvedValue({ id: 'ck1234567890abcd12345670', name: 'Bar', slug: 'bar' })
    const tag = await service.create('en', { name: 'Bar', createdBy: 'u1', originalLocale: 'en' })
    expect(tag.slug).toBe('bar')
    expect(mockPrisma.tag.create).toHaveBeenCalled()
  })

  it('updates slug when name provided', async () => {
    mockPrisma.tag.update.mockResolvedValue({ id: 't1', name: 'New', slug: 'new' })
    await service.update('t1', { name: 'New' } as any)
    expect(mockPrisma.tag.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { name: 'New', slug: 'new' },
    })
  })
})

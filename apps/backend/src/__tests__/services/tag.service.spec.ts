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
    mockPrisma.tag.findMany.mockResolvedValue([
      { id: 'cksearchtagid1234567890', name: 'foo', slug: 'foo' },
    ])
    const result = await service.search('en', 'foo')
    expect(mockPrisma.tag.findMany).toHaveBeenCalled()
    expect(result[0].name).toBe('foo')
  })

  it('creates a tag', async () => {
    mockPrisma.tag.create.mockResolvedValue({
      id: 'ck1234567890abcd12345670',
      name: 'Bar',
      slug: 'bar',
    })
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

  describe('getPopularTags', () => {
    it('returns tags sorted by count, filtering count >= 2', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([
        { id: 't1', name: 'Hiking', slug: 'hiking', _count: { profiles: 5 }, translations: [] },
        { id: 't2', name: 'Music', slug: 'music', _count: { profiles: 3 }, translations: [] },
        { id: 't3', name: 'Rare', slug: 'rare', _count: { profiles: 1 }, translations: [] },
      ])

      const result = await service.getPopularTags({ locale: 'en' })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: 't1', name: 'Hiking', slug: 'hiking', count: 5 })
      expect(result[1]).toEqual({ id: 't2', name: 'Music', slug: 'music', count: 3 })
    })

    it('respects limit option', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([
        { id: 't1', name: 'A', slug: 'a', _count: { profiles: 10 }, translations: [] },
        { id: 't2', name: 'B', slug: 'b', _count: { profiles: 8 }, translations: [] },
        { id: 't3', name: 'C', slug: 'c', _count: { profiles: 5 }, translations: [] },
      ])

      const result = await service.getPopularTags({ limit: 2, locale: 'en' })

      expect(result).toHaveLength(2)
    })

    it('uses translated name when locale matches', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([
        {
          id: 't1',
          name: 'Hiking',
          slug: 'hiking',
          _count: { profiles: 5 },
          translations: [{ locale: 'de', name: 'Wandern' }],
        },
      ])

      const result = await service.getPopularTags({ locale: 'de' })

      expect(result[0].name).toBe('Wandern')
    })

    it('passes location filters to prisma query', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([])

      await service.getPopularTags({ country: 'DE', cityName: 'Berlin', locale: 'en' })

      const call = mockPrisma.tag.findMany.mock.calls[0][0]
      expect(call.where.profiles.some.country).toBe('DE')
      expect(call.where.profiles.some.cityName).toBe('Berlin')
    })
  })
})

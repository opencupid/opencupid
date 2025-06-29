import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  const module = await import('../../services/city.service')
  ;(module.CityService as any).instance = undefined
  service = module.CityService.getInstance()
})

describe('CityService.search', () => {
  it('queries prisma with correct params', async () => {
    mockPrisma.city.findMany.mockResolvedValue([{ id: 'c1', name: 'Test', country: 'US' }])
    const res = await service.search('US', 'Tes')
    expect(mockPrisma.city.findMany).toHaveBeenCalledWith({
      where: {
        name: { contains: 'Tes', mode: 'insensitive' },
        country: { startsWith: 'US', mode: 'insensitive' },
        isDeleted: false,
        isApproved: true,
        isHidden: false,
      },
      take: 20,
      orderBy: { name: 'asc' },
    })
    expect(res[0].name).toBe('Test')
  })
})

describe('CityService.create', () => {
  it('creates city with defaults', async () => {
    mockPrisma.city.create.mockResolvedValue({ id: 'c2', name: 'Foo', country: 'US' })
    const res = await service.create({ name: 'Foo', country: 'US', createdBy: 'u1' })
    expect(mockPrisma.city.create).toHaveBeenCalledWith({
      data: {
        name: 'Foo',
        country: 'US',
        createdBy: 'u1',
        isApproved: true,
        isUserCreated: false,
      },
    })
    expect(res.id).toBe('c2')
  })
})

describe('CityService.update', () => {
  it('slugifies name when updating', async () => {
    mockPrisma.city.update.mockResolvedValue({ id: 'c2', name: 'New City', slug: 'new-city' })
    await service.update('c2', { name: 'New City' } as any)
    expect(mockPrisma.city.update).toHaveBeenCalledWith({
      where: { id: 'c2' },
      data: { name: 'New City', slug: 'new-city' },
    })
  })
})

describe('CityService.remove', () => {
  it('soft deletes the city', async () => {
    await service.remove('c3')
    expect(mockPrisma.city.update).toHaveBeenCalledWith({
      where: { id: 'c3' },
      data: { isDeleted: true },
    })
  })
})

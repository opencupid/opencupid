import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let mockPrisma: any = {}
vi.mock('../../lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

const mockMakeImageLocation = vi.fn()
vi.mock('@/lib/media', () => ({
  getMediaRoot: () => '/media',
  imageBasePath: (storagePath: string) => `images/${storagePath}`,
  makeImageLocation: mockMakeImageLocation,
  mediaUrl: (p: string) => `/media/${p}`,
}))

const mockUnlink = vi.fn().mockResolvedValue(undefined)
vi.mock('fs', () => ({
  default: { promises: { unlink: mockUnlink, mkdir: vi.fn(), readFile: vi.fn() } },
  promises: { unlink: mockUnlink, mkdir: vi.fn(), readFile: vi.fn() },
}))

vi.mock('../../services/imageprocessor', () => ({
  ImageProcessor: class {
    static initialize = vi.fn()
  },
}))

const mockGenerateContentHash = vi.fn()
vi.mock('@/utils/hash', () => ({
  generateContentHash: mockGenerateContentHash,
}))

vi.mock('sharp', () => {
  const sharp: any = vi.fn()
  sharp.fit = { cover: 'cover', contain: 'contain', inside: 'inside' }
  return { default: sharp }
})

let service: any

beforeEach(async () => {
  Object.assign(mockPrisma, createMockPrisma())
  mockUnlink.mockClear()
  const mod = await import('../../services/image.service')
  ;(mod.ImageService as any).instance = undefined
  service = mod.ImageService.getInstance()
})

describe('ImageService.deleteImage', () => {
  it('deletes the row, syncs Profile.hasFace, and cleans up files', async () => {
    mockPrisma.profileImage.findUnique.mockResolvedValue({
      id: 'img1',
      profileId: 'p1',
      storagePath: 'p1/abc',
    })
    mockPrisma.profileImage.findFirst.mockResolvedValue({ hasFace: true })

    const ok = await service.deleteImage('p1', 'img1')

    expect(ok).toBe(true)
    expect(mockPrisma.profileImage.findUnique).toHaveBeenCalledWith({
      where: { id: 'img1', profileId: 'p1' },
    })
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(mockPrisma.profileImage.delete).toHaveBeenCalledWith({ where: { id: 'img1' } })
    expect(mockPrisma.profileImage.findFirst).toHaveBeenCalledWith({
      where: { profileId: 'p1', position: 0 },
      select: { hasFace: true },
    })
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { hasFace: true },
    })
    // Filesystem cleanup runs after the transaction commits.
    expect(mockUnlink).toHaveBeenCalled()
  })

  it('returns false and skips the transaction when the image is not found', async () => {
    mockPrisma.profileImage.findUnique.mockResolvedValue(null)

    const ok = await service.deleteImage('p1', 'missing')

    expect(ok).toBe(false)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.profileImage.delete).not.toHaveBeenCalled()
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('returns false and skips file cleanup when the DB delete fails', async () => {
    mockPrisma.profileImage.findUnique.mockResolvedValue({
      id: 'img1',
      profileId: 'p1',
      storagePath: 'p1/abc',
    })
    mockPrisma.profileImage.delete.mockRejectedValue(new Error('boom'))

    const ok = await service.deleteImage('p1', 'img1')

    expect(ok).toBe(false)
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('writes hasFace=false when no position-0 image remains after delete', async () => {
    mockPrisma.profileImage.findUnique.mockResolvedValue({
      id: 'img1',
      profileId: 'p1',
      storagePath: 'p1/abc',
    })
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)

    await service.deleteImage('p1', 'img1')

    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { hasFace: false },
    })
  })
})

describe('ImageService.reorderImages', () => {
  it('updates positions atomically, syncs Profile.hasFace, and returns sorted list', async () => {
    const items = [
      { id: 'img1', position: 1 },
      { id: 'img2', position: 0 },
    ]
    mockPrisma.profileImage.findMany.mockResolvedValue([{ id: 'img1' }, { id: 'img2' }])
    mockPrisma.profileImage.update
      .mockResolvedValueOnce({ id: 'img1', position: 1 })
      .mockResolvedValueOnce({ id: 'img2', position: 0 })
    mockPrisma.profileImage.findFirst.mockResolvedValue({ hasFace: true })

    const result = await service.reorderImages('p1', items)

    expect(mockPrisma.profileImage.findMany).toHaveBeenCalledWith({
      where: { profileId: 'p1', id: { in: ['img1', 'img2'] } },
      select: { id: true },
    })
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(mockPrisma.profileImage.update).toHaveBeenCalledWith({
      where: { id: 'img1' },
      data: { position: 1 },
    })
    expect(mockPrisma.profileImage.update).toHaveBeenCalledWith({
      where: { id: 'img2' },
      data: { position: 0 },
    })
    expect(mockPrisma.profileImage.findFirst).toHaveBeenCalledWith({
      where: { profileId: 'p1', position: 0 },
      select: { hasFace: true },
    })
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { hasFace: true },
    })
    // Sorted ascending by position.
    expect(result.map((r: any) => r.id)).toEqual(['img2', 'img1'])
  })

  it('throws when an item id does not belong to the profile', async () => {
    const items = [
      { id: 'img1', position: 0 },
      { id: 'foreign', position: 1 },
    ]
    mockPrisma.profileImage.findMany.mockResolvedValue([{ id: 'img1' }])

    await expect(service.reorderImages('p1', items)).rejects.toThrow('Invalid image ID')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.profileImage.update).not.toHaveBeenCalled()
  })
})

describe('ImageService.storeImage', () => {
  it('creates the row scoped to profileId and syncs Profile.hasFace in one transaction', async () => {
    mockMakeImageLocation.mockResolvedValue({
      base: 'abc',
      relPath: 'p1',
      absPath: '/media/images/p1',
    })
    mockGenerateContentHash.mockResolvedValue('hash-xyz')
    const processSpy = vi.spyOn(service, 'processImage').mockResolvedValue({
      mime: 'image/jpeg',
      variants: { original: '/media/images/p1/abc-original.jpg' },
      blurhash: 'LK',
      hasFace: true,
    } as any)
    mockPrisma.profileImage.count.mockResolvedValue(2)
    mockPrisma.profileImage.create.mockResolvedValue({
      id: 'newimg',
      profileId: 'p1',
      position: 2,
      hasFace: true,
    })
    mockPrisma.profileImage.findFirst.mockResolvedValue({ hasFace: true })

    const result = await service.storeImage('p1', '/tmp/upload.jpg', 'caption')

    expect(mockMakeImageLocation).toHaveBeenCalledWith('p1')
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(mockPrisma.profileImage.count).toHaveBeenCalledWith({ where: { profileId: 'p1' } })
    expect(mockPrisma.profileImage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        profileId: 'p1',
        position: 2,
        hasFace: true,
        contentHash: 'hash-xyz',
        storagePath: 'p1/abc',
        altText: 'caption',
      }),
    })
    // syncProfileHasFace runs inside the same transaction.
    expect(mockPrisma.profileImage.findFirst).toHaveBeenCalledWith({
      where: { profileId: 'p1', position: 0 },
      select: { hasFace: true },
    })
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { hasFace: true },
    })
    expect(result).toMatchObject({ id: 'newimg', profileId: 'p1' })

    processSpy.mockRestore()
  })
})

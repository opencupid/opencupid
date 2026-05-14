import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let mockPrisma: any = {}
vi.mock('../../lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

vi.mock('@/lib/media', () => ({
  getMediaRoot: () => '/media',
  imageBasePath: (storagePath: string) => `images/${storagePath}`,
  makeImageLocation: vi.fn(),
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

vi.mock('@/utils/hash', () => ({
  generateContentHash: vi.fn(),
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

describe('ImageService.deleteImage (profile owner)', () => {
  it('deletes join row + image row, syncs Profile.hasFace, and cleans up files', async () => {
    mockPrisma.profileImage.findUnique.mockResolvedValue({
      id: 'pi1',
      imageId: 'img1',
      profileId: 'p1',
      image: { id: 'img1', storagePath: 'p1/abc' },
    })
    mockPrisma.profileImage.findFirst.mockResolvedValue({ hasFace: true })

    const ok = await service.deleteImage({ type: 'profile', profileId: 'p1' }, 'img1')

    expect(ok).toBe(true)
    expect(mockPrisma.profileImage.findUnique).toHaveBeenCalledWith({
      where: { imageId: 'img1' },
      include: { image: true },
    })
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(mockPrisma.profileImage.delete).toHaveBeenCalledWith({ where: { id: 'pi1' } })
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'img1' } })
    // syncProfileHasFace runs inside the same transaction
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

  it('returns false and skips the transaction when no join row matches', async () => {
    mockPrisma.profileImage.findUnique.mockResolvedValue(null)

    const ok = await service.deleteImage({ type: 'profile', profileId: 'p1' }, 'missing')

    expect(ok).toBe(false)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.profileImage.delete).not.toHaveBeenCalled()
    expect(mockPrisma.image.delete).not.toHaveBeenCalled()
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('returns false when the join row exists but belongs to a different profile', async () => {
    mockPrisma.profileImage.findUnique.mockResolvedValue({
      id: 'pi1',
      imageId: 'img1',
      profileId: 'someoneElse',
      image: { id: 'img1', storagePath: 'p1/abc' },
    })

    const ok = await service.deleteImage({ type: 'profile', profileId: 'p1' }, 'img1')

    expect(ok).toBe(false)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.profileImage.delete).not.toHaveBeenCalled()
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('returns false and skips file cleanup when the DB delete fails', async () => {
    mockPrisma.profileImage.findUnique.mockResolvedValue({
      id: 'pi1',
      imageId: 'img1',
      profileId: 'p1',
      image: { id: 'img1', storagePath: 'p1/abc' },
    })
    mockPrisma.profileImage.delete.mockRejectedValue(new Error('boom'))

    const ok = await service.deleteImage({ type: 'profile', profileId: 'p1' }, 'img1')

    expect(ok).toBe(false)
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('writes hasFace=false when no position-0 image remains after delete', async () => {
    mockPrisma.profileImage.findUnique.mockResolvedValue({
      id: 'pi1',
      imageId: 'img1',
      profileId: 'p1',
      image: { id: 'img1', storagePath: 'p1/abc' },
    })
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)

    await service.deleteImage({ type: 'profile', profileId: 'p1' }, 'img1')

    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { hasFace: false },
    })
  })
})

describe('ImageService.deleteImage (userContent owner)', () => {
  it('deletes join row + image row without syncing Profile.hasFace', async () => {
    mockPrisma.userContentImage.findUnique.mockResolvedValue({
      id: 'uci1',
      imageId: 'img2',
      userContentId: 'uc1',
      image: { id: 'img2', storagePath: 'uc1/xyz' },
    })

    const ok = await service.deleteImage({ type: 'userContent', userContentId: 'uc1' }, 'img2')

    expect(ok).toBe(true)
    expect(mockPrisma.userContentImage.findUnique).toHaveBeenCalledWith({
      where: { imageId: 'img2' },
      include: { image: true },
    })
    expect(mockPrisma.userContentImage.delete).toHaveBeenCalledWith({ where: { id: 'uci1' } })
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'img2' } })
    // Profile-face sync MUST NOT run for userContent owners
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
    expect(mockPrisma.profileImage.findFirst).not.toHaveBeenCalled()
    expect(mockUnlink).toHaveBeenCalled()
  })

  it('returns false when the join row belongs to a different userContent', async () => {
    mockPrisma.userContentImage.findUnique.mockResolvedValue({
      id: 'uci1',
      imageId: 'img2',
      userContentId: 'otherUc',
      image: { id: 'img2', storagePath: 'uc1/xyz' },
    })

    const ok = await service.deleteImage({ type: 'userContent', userContentId: 'uc1' }, 'img2')

    expect(ok).toBe(false)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.userContentImage.delete).not.toHaveBeenCalled()
    expect(mockPrisma.image.delete).not.toHaveBeenCalled()
  })
})

describe('ImageService.reorderImages (profile owner)', () => {
  it('updates image positions, syncs Profile.hasFace, and returns sorted list', async () => {
    const items = [
      { id: 'img1', position: 1 },
      { id: 'img2', position: 0 },
    ]
    mockPrisma.profileImage.findMany.mockResolvedValue([{ imageId: 'img1' }, { imageId: 'img2' }])
    mockPrisma.image.update
      .mockResolvedValueOnce({ id: 'img1', position: 1 })
      .mockResolvedValueOnce({ id: 'img2', position: 0 })
    mockPrisma.profileImage.findFirst.mockResolvedValue({ hasFace: true })

    const result = await service.reorderImages({ type: 'profile', profileId: 'p1' }, items)

    expect(mockPrisma.profileImage.findMany).toHaveBeenCalledWith({
      where: { profileId: 'p1', imageId: { in: ['img1', 'img2'] } },
      select: { imageId: true },
    })
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img1' },
      data: { position: 1 },
    })
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img2' },
      data: { position: 0 },
    })
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { hasFace: true },
    })
    expect(result.map((r: any) => r.id)).toEqual(['img2', 'img1'])
  })

  it('throws when an item id does not belong to the profile', async () => {
    const items = [
      { id: 'img1', position: 0 },
      { id: 'foreign', position: 1 },
    ]
    mockPrisma.profileImage.findMany.mockResolvedValue([{ imageId: 'img1' }])

    await expect(
      service.reorderImages({ type: 'profile', profileId: 'p1' }, items)
    ).rejects.toThrow('Invalid image ID')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.image.update).not.toHaveBeenCalled()
  })
})

describe('ImageService.reorderImages (userContent owner)', () => {
  it('updates image positions and skips Profile.hasFace sync', async () => {
    const items = [
      { id: 'img1', position: 1 },
      { id: 'img2', position: 0 },
    ]
    mockPrisma.userContentImage.findMany.mockResolvedValue([
      { imageId: 'img1' },
      { imageId: 'img2' },
    ])
    mockPrisma.image.update
      .mockResolvedValueOnce({ id: 'img1', position: 1 })
      .mockResolvedValueOnce({ id: 'img2', position: 0 })

    const result = await service.reorderImages({ type: 'userContent', userContentId: 'uc1' }, items)

    expect(mockPrisma.userContentImage.findMany).toHaveBeenCalledWith({
      where: { userContentId: 'uc1', imageId: { in: ['img1', 'img2'] } },
      select: { imageId: true },
    })
    expect(mockPrisma.image.update).toHaveBeenCalledTimes(2)
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
    expect(result.map((r: any) => r.id)).toEqual(['img2', 'img1'])
  })
})

describe('ImageService.storeImage', () => {
  it('counts position within the profile gallery (not across all user images)', async () => {
    const { makeImageLocation } = await import('@/lib/media')
    ;(makeImageLocation as any).mockResolvedValue({
      absPath: '/media/abs',
      relPath: 'p1',
      base: 'abc',
    })
    const mod = await import('../../services/image.service')
    const svc = mod.ImageService.getInstance()
    vi.spyOn(svc as any, 'processImage').mockResolvedValue({
      mime: 'image/jpeg',
      variants: { original: '/media/abs/abc-original.jpg' },
      blurhash: 'bh',
      hasFace: true,
    })
    const { generateContentHash } = await import('@/utils/hash')
    ;(generateContentHash as any).mockResolvedValue('hash')

    mockPrisma.profileImage.count.mockResolvedValue(3)
    const createdImage = { id: 'imgNew', position: 3, storagePath: 'p1/abc' }
    const createdJoin = { id: 'piNew', imageId: 'imgNew', profileId: 'p1' }
    mockPrisma.image.create.mockResolvedValue(createdImage)
    mockPrisma.profileImage.create.mockResolvedValue(createdJoin)

    const result = await svc.storeImage('u1', '/tmp/foo.jpg', 'caption', {
      type: 'profile',
      profileId: 'p1',
    })

    // Position MUST come from the owner gallery, not from prisma.image.count
    expect(mockPrisma.profileImage.count).toHaveBeenCalledWith({ where: { profileId: 'p1' } })
    expect(mockPrisma.image.count).not.toHaveBeenCalled()

    expect(mockPrisma.image.create).toHaveBeenCalled()
    const imageCreateArgs = mockPrisma.image.create.mock.calls[0][0]
    expect(imageCreateArgs.data.position).toBe(3)
    expect(imageCreateArgs.data.userId).toBe('u1')
    expect(imageCreateArgs.data.altText).toBe('caption')

    // Join row created in the same transaction
    expect(mockPrisma.profileImage.create).toHaveBeenCalledWith({
      data: { imageId: 'imgNew', profileId: 'p1' },
    })
    expect(mockPrisma.$transaction).toHaveBeenCalled()

    expect(result.image).toEqual(createdImage)
    expect(result.ownerRow).toEqual(createdJoin)
  })

  it('uses userContentImage.count for userContent owners and creates the userContentImage join', async () => {
    const { makeImageLocation } = await import('@/lib/media')
    ;(makeImageLocation as any).mockResolvedValue({
      absPath: '/media/abs',
      relPath: 'u1',
      base: 'xyz',
    })
    const mod = await import('../../services/image.service')
    const svc = mod.ImageService.getInstance()
    vi.spyOn(svc as any, 'processImage').mockResolvedValue({
      mime: 'image/jpeg',
      variants: { original: '/media/abs/xyz-original.jpg' },
      blurhash: 'bh',
      hasFace: false,
    })
    const { generateContentHash } = await import('@/utils/hash')
    ;(generateContentHash as any).mockResolvedValue('hash')

    mockPrisma.userContentImage.count.mockResolvedValue(0)
    mockPrisma.image.create.mockResolvedValue({ id: 'imgNew' })
    mockPrisma.userContentImage.create.mockResolvedValue({
      id: 'uciNew',
      imageId: 'imgNew',
      userContentId: 'uc1',
    })

    await svc.storeImage('u1', '/tmp/foo.jpg', 'cap', {
      type: 'userContent',
      userContentId: 'uc1',
    })

    expect(mockPrisma.userContentImage.count).toHaveBeenCalledWith({
      where: { userContentId: 'uc1' },
    })
    expect(mockPrisma.profileImage.count).not.toHaveBeenCalled()
    expect(mockPrisma.userContentImage.create).toHaveBeenCalledWith({
      data: { imageId: 'imgNew', userContentId: 'uc1' },
    })
    expect(mockPrisma.profileImage.create).not.toHaveBeenCalled()
  })
})

describe('ImageService.listImages', () => {
  it('returns the profile owner gallery flat, ordered by image.position asc', async () => {
    const images = [
      { id: 'img1', position: 0 },
      { id: 'img2', position: 1 },
    ]
    mockPrisma.profileImage.findMany.mockResolvedValue([{ image: images[0] }, { image: images[1] }])

    const result = await service.listImages({ type: 'profile', profileId: 'p1' })

    expect(mockPrisma.profileImage.findMany).toHaveBeenCalledWith({
      where: { profileId: 'p1' },
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
    })
    expect(result).toEqual(images)
  })

  it('returns the userContent owner gallery flat', async () => {
    const images = [{ id: 'img1', position: 0 }]
    mockPrisma.userContentImage.findMany.mockResolvedValue([{ image: images[0] }])

    const result = await service.listImages({ type: 'userContent', userContentId: 'uc1' })

    expect(mockPrisma.userContentImage.findMany).toHaveBeenCalledWith({
      where: { userContentId: 'uc1' },
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
    })
    expect(result).toEqual(images)
  })
})

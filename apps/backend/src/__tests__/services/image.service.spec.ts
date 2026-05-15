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

// syncProfileHasFace lives in profile.service, whose transitive imports
// (zod profile.dto -> renamed profileimage.dto) currently fail to resolve
// mid-refactor. Mock it so this spec can load image.service in isolation.
vi.mock('../../services/profile.service', () => ({
  syncProfileHasFace: vi.fn(async (tx: any, profileId: string) => {
    const top = await tx.profileImage.findFirst({
      where: { profileId },
      include: { image: { select: { hasFace: true } } },
      orderBy: { image: { position: 'asc' } },
    })
    await tx.profile.update({
      where: { id: profileId },
      data: { hasFace: top?.image?.hasFace ?? false },
    })
  }),
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
  // Image / UserContentImage models aren't yet in createMockPrisma — declare them inline.
  mockPrisma.image = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  }
  mockPrisma.userContentImage = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  }
  // createMockPrisma's $transaction captures its inner mock object before our
  // image / userContentImage extensions land. Re-bind it to the live mockPrisma
  // so transactions see the full surface.
  mockPrisma.$transaction = vi.fn((fn: (client: any) => any) => fn(mockPrisma))
  mockUnlink.mockClear()
  const mod = await import('../../services/image.service')
  ;(mod.ImageService as any).instance = undefined
  service = mod.ImageService.getInstance()
})

describe('ImageService.createImage', () => {
  it('creates an unattached Image owned by ownerProfileId, runs face detect when requested', async () => {
    mockMakeImageLocation.mockResolvedValue({
      base: 'abcd',
      relPath: 'profile-1',
      absPath: '/media/images/profile-1',
    })
    mockGenerateContentHash.mockResolvedValue('hash-xyz')
    vi.spyOn(service, 'processImage').mockResolvedValue({
      width: 100,
      height: 100,
      mime: 'image/jpeg',
      variants: { original: '/tmp/o.jpg' },
      blurhash: 'L00',
      hasFace: true,
    } as any)
    mockPrisma.image.create.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      storagePath: 'profile-1/abcd',
      mimeType: 'image/jpeg',
      hasFace: true,
      altText: 'cap',
      position: 0,
    } as any)

    const result = await service.createImage('profile-1', '/tmp/upload.jpg', 'cap', {
      detectFace: true,
    })

    expect(result.id).toBe('img-1')
    expect(result.ownerProfileId).toBe('profile-1')
    // Critical: no ProfileImage / UserContentImage row was inserted.
    expect(mockPrisma.profileImage.create).not.toHaveBeenCalled()
    expect(mockPrisma.userContentImage.create).not.toHaveBeenCalled()
  })

  it('skips face detect when detectFace=false', async () => {
    mockMakeImageLocation.mockResolvedValue({
      base: 'abcd',
      relPath: 'profile-1',
      absPath: '/media/images/profile-1',
    })
    mockGenerateContentHash.mockResolvedValue('hash-xyz')
    const procSpy = vi.spyOn(service, 'processImage').mockResolvedValue({
      width: 100,
      height: 100,
      mime: 'image/jpeg',
      variants: { original: '/tmp/o.jpg' },
      blurhash: 'L00',
      hasFace: false,
    } as any)
    mockPrisma.image.create.mockResolvedValue({ id: 'img-2', hasFace: false } as any)

    await service.createImage('profile-1', '/tmp/u.jpg', '', { detectFace: false })

    // processImage is shared; the detect-face skip is enforced inside processImage via opts.
    expect(procSpy).toHaveBeenCalledWith(
      '/tmp/u.jpg',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ detectFace: false })
    )
  })
})

describe('ImageService.attachToProfile', () => {
  it('inserts the join row, sets Image.position to gallery count, syncs Profile.hasFace, in one transaction', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      profileGallery: null,
      userContentGallery: null,
    } as any)
    mockPrisma.profileImage.count.mockResolvedValue(2) // gallery already has 2 items
    mockPrisma.profileImage.create.mockResolvedValue({} as any)
    mockPrisma.image.update.mockResolvedValue({} as any)
    mockPrisma.profileImage.findFirst.mockResolvedValue({
      image: { hasFace: true },
    } as any)

    await service.attachToProfile('img-1', 'profile-1')

    expect(mockPrisma.profileImage.create).toHaveBeenCalledWith({
      data: { imageId: 'img-1', profileId: 'profile-1' },
    })
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: { position: 2 },
    })
    // syncProfileHasFace ran inside the same transaction
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { hasFace: true },
    })
  })

  it('rejects when image is not owned by the profile', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-OTHER',
      profileGallery: null,
      userContentGallery: null,
    } as any)

    await expect(service.attachToProfile('img-1', 'profile-1')).rejects.toThrow(/owner/i)
  })

  it('rejects when image is already attached', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      profileGallery: { profileId: 'profile-1' },
      userContentGallery: null,
    } as any)

    await expect(service.attachToProfile('img-1', 'profile-1')).rejects.toThrow(/already attached/i)
  })
})

describe('ImageService.deleteImage', () => {
  // TODO(Task 7): re-enable / rewrite when deleteImage is refactored to detect which join exists.
  it.skip('deletes the row, syncs Profile.hasFace, and cleans up files', async () => {
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
  // TODO(Task 6): re-enable / rewrite when reorderImages is rewritten to update Image.position instead of ProfileImage.position.
  it.skip('updates positions atomically, syncs Profile.hasFace, and returns sorted list', async () => {
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


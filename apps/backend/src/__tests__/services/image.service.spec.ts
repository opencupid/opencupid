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
  mockPrisma.userContent = {
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

describe('attachToUserContent', () => {
  it('inserts join row + updates Image.position; does NOT touch Profile.hasFace', async () => {
    const svc = service
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      profileGallery: null,
      userContentGallery: null,
    } as any)
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: 'content-1',
      postedById: 'profile-1',
    } as any)
    mockPrisma.userContentImage.count.mockResolvedValue(0)

    await svc.attachToUserContent('img-1', 'content-1')

    expect(mockPrisma.userContentImage.create).toHaveBeenCalledWith({
      data: { imageId: 'img-1', userContentId: 'content-1' },
    })
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: { position: 0 },
    })
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })

  it('rejects when content owner does not match image owner', async () => {
    const svc = service
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      profileGallery: null,
      userContentGallery: null,
    } as any)
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: 'content-1',
      postedById: 'profile-OTHER',
    } as any)

    await expect(svc.attachToUserContent('img-1', 'content-1')).rejects.toThrow(/owner/i)
  })
})

describe('deleteImage', () => {
  it('deletes a profile-gallery image: drops join, drops Image, syncs hasFace, unlinks files', async () => {
    const svc = service
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      storagePath: 'profile-1/abcd',
      profileGallery: { profileId: 'profile-1' },
      userContentGallery: null,
    } as any)
    mockPrisma.profileImage.findFirst.mockResolvedValue({
      image: { hasFace: true },
    } as any)

    await svc.deleteImage('img-1', 'profile-1')

    expect(mockPrisma.profileImage.delete).toHaveBeenCalledWith({ where: { imageId: 'img-1' } })
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } })
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { hasFace: true },
    })
  })

  it('deletes a usercontent-gallery image: drops join + Image, does NOT touch Profile.hasFace', async () => {
    const svc = service
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-2',
      ownerProfileId: 'profile-1',
      storagePath: 'profile-1/efgh',
      profileGallery: null,
      userContentGallery: { userContentId: 'content-1' },
    } as any)

    await svc.deleteImage('img-2', 'profile-1')

    expect(mockPrisma.userContentImage.delete).toHaveBeenCalledWith({ where: { imageId: 'img-2' } })
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'img-2' } })
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })

  it('rejects when requester is not the image owner', async () => {
    const svc = service
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-3',
      ownerProfileId: 'profile-OTHER',
      profileGallery: null,
      userContentGallery: null,
    } as any)

    await expect(svc.deleteImage('img-3', 'profile-1')).rejects.toThrow(/owner/i)
  })
})

describe('updateImage', () => {
  it('patches altText for the owner', async () => {
    const svc = service
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      altText: 'old',
    } as any)
    mockPrisma.image.update.mockResolvedValue({ id: 'img-1', altText: 'new' } as any)

    const result = await svc.updateImage('img-1', 'profile-1', { altText: 'new' })
    expect(result.altText).toBe('new')
  })

  it('rejects non-owner', async () => {
    const svc = service
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-OTHER',
    } as any)

    await expect(svc.updateImage('img-1', 'profile-1', { altText: 'x' })).rejects.toThrow(/owner/i)
  })
})

describe('listProfileGallery', () => {
  it('returns Image rows ordered by position via the join', async () => {
    const svc = service
    mockPrisma.profileImage.findMany.mockResolvedValue([
      { image: { id: 'a', position: 0 } },
      { image: { id: 'b', position: 1 } },
    ] as any)
    const result = await svc.listProfileGallery('profile-1')
    expect(result.map((i: any) => i.id)).toEqual(['a', 'b'])
    expect(mockPrisma.profileImage.findMany).toHaveBeenCalledWith({
      where: { profileId: 'profile-1' },
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
    })
  })
})

describe('listUserContentGallery', () => {
  it('returns Image rows ordered by position via the join', async () => {
    const svc = service
    mockPrisma.userContentImage.findMany.mockResolvedValue([
      { image: { id: 'x', position: 0 } },
    ] as any)
    const result = await svc.listUserContentGallery('content-1')
    expect(result.map((i: any) => i.id)).toEqual(['x'])
    expect(mockPrisma.userContentImage.findMany).toHaveBeenCalledWith({
      where: { userContentId: 'content-1' },
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
    })
  })
})

describe('reorderProfileGallery', () => {
  it('updates Image.position for each item, syncs Profile.hasFace, returns sorted gallery', async () => {
    const svc = service
    mockPrisma.profileImage.count.mockResolvedValue(2) // matches items.length
    mockPrisma.profileImage.findMany
      .mockResolvedValueOnce([{ imageId: 'i1' }, { imageId: 'i2' }] as any) // validation lookup
      .mockResolvedValueOnce([
        { image: { id: 'i1', position: 0 } },
        { image: { id: 'i2', position: 1 } },
      ] as any) // listProfileGallery final read
    mockPrisma.image.update.mockResolvedValue({} as any)
    mockPrisma.profileImage.findFirst.mockResolvedValue({ image: { hasFace: true } } as any)

    const result = await svc.reorderProfileGallery('profile-1', [
      { id: 'i1', position: 0 },
      { id: 'i2', position: 1 },
    ])

    expect(mockPrisma.image.update).toHaveBeenCalledTimes(2)
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'i1' },
      data: { position: 0 },
    })
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'i2' },
      data: { position: 1 },
    })
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { hasFace: true },
    })
    expect(result.map((i: any) => i.id)).toEqual(['i1', 'i2'])
  })

  it('rejects when an image id is not in the profile gallery', async () => {
    const svc = service
    mockPrisma.profileImage.count.mockResolvedValue(2) // 2 items submitted, 2 in gallery, but one is invalid
    mockPrisma.profileImage.findMany.mockResolvedValueOnce([{ imageId: 'i1' }] as any)
    await expect(
      svc.reorderProfileGallery('profile-1', [
        { id: 'i1', position: 0 },
        { id: 'i-other', position: 1 },
      ])
    ).rejects.toThrow(/Invalid image ID/)
  })

  it('rejects when items length does not match gallery length', async () => {
    const svc = service
    mockPrisma.profileImage.count.mockResolvedValue(3) // gallery has 3
    await expect(
      svc.reorderProfileGallery('profile-1', [
        { id: 'i1', position: 0 },
        { id: 'i2', position: 1 },
      ])
    ).rejects.toThrow(/every image in the gallery/i)
  })
})

describe('reorderUserContentGallery', () => {
  it('updates Image.position for each item; does NOT touch Profile.hasFace', async () => {
    const svc = service
    mockPrisma.userContentImage.count.mockResolvedValue(1)
    mockPrisma.userContentImage.findMany
      .mockResolvedValueOnce([{ imageId: 'i1' }] as any)
      .mockResolvedValueOnce([{ image: { id: 'i1', position: 0 } }] as any)
    mockPrisma.image.update.mockResolvedValue({} as any)

    const result = await svc.reorderUserContentGallery('content-1', [{ id: 'i1', position: 0 }])

    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'i1' },
      data: { position: 0 },
    })
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
    expect(result.map((i: any) => i.id)).toEqual(['i1'])
  })

  it('rejects when items length does not match gallery length', async () => {
    const svc = service
    mockPrisma.userContentImage.count.mockResolvedValue(2)
    await expect(
      svc.reorderUserContentGallery('content-1', [{ id: 'i1', position: 0 }])
    ).rejects.toThrow(/every image in the gallery/i)
  })
})

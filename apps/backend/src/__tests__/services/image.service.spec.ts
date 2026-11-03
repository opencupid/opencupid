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
    // Default: empty gallery, so compactGalleryPositions is a no-op unless a test opts in.
    findMany: vi.fn().mockResolvedValue([]),
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
    // Join removals are scoped to the locked gallery; 1 row = membership unchanged.
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    count: vi.fn(),
  }
  mockPrisma.profileImage.deleteMany = vi.fn().mockResolvedValue({ count: 1 })
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
  // lockGallery() issues a SELECT ... FOR UPDATE through $queryRaw.
  mockPrisma.$queryRaw = vi.fn().mockResolvedValue([])
  mockUnlink.mockClear()
  const mod = await import('../../services/image.service')
  ;(mod.ImageService as any).instance = undefined
  service = mod.ImageService.getInstance()
})

describe('ImageService.createImage', () => {
  it('creates an unattached Image owned by ownerProfileId', async () => {
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

    const result = await service.createImage('profile-1', '/tmp/upload.jpg', 'cap')

    expect(result.id).toBe('img-1')
    expect(result.ownerProfileId).toBe('profile-1')
    // Critical: no ProfileImage / UserContentImage row was inserted.
    expect(mockPrisma.profileImage.create).not.toHaveBeenCalled()
    expect(mockPrisma.userContentImage.create).not.toHaveBeenCalled()
  })
})

describe('ImageService.attachToProfile', () => {
  it('inserts the join row, sets Image.position to gallery count, syncs Profile.hasFace, in one transaction', async () => {
    mockPrisma.image.findMany.mockResolvedValueOnce([
      {
        id: 'img-1',
        ownerProfileId: 'profile-1',
        profileGallery: null,
        userContentGallery: null,
      },
    ] as any)
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
    mockPrisma.image.findMany.mockResolvedValueOnce([
      {
        id: 'img-1',
        ownerProfileId: 'profile-OTHER',
        profileGallery: null,
        userContentGallery: null,
      },
    ] as any)

    await expect(service.attachToProfile('img-1', 'profile-1')).rejects.toThrow(/owner/i)
  })

  it('rejects when image is already attached', async () => {
    mockPrisma.image.findMany.mockResolvedValueOnce([
      {
        id: 'img-1',
        ownerProfileId: 'profile-1',
        profileGallery: { profileId: 'profile-1' },
        userContentGallery: null,
      },
    ] as any)

    await expect(service.attachToProfile('img-1', 'profile-1')).rejects.toThrow(/already attached/i)
  })
})

describe('attachToUserContent', () => {
  it('inserts join row + updates Image.position; does NOT touch Profile.hasFace', async () => {
    const svc = service
    mockPrisma.image.findMany.mockResolvedValueOnce([
      {
        id: 'img-1',
        ownerProfileId: 'profile-1',
        profileGallery: null,
        userContentGallery: null,
      },
    ] as any)
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
    mockPrisma.image.findMany.mockResolvedValueOnce([
      {
        id: 'img-1',
        ownerProfileId: 'profile-1',
        profileGallery: null,
        userContentGallery: null,
      },
    ] as any)
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

    expect(mockPrisma.profileImage.deleteMany).toHaveBeenCalledWith({
      where: { imageId: 'img-1', profileId: 'profile-1' },
    })
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

    expect(mockPrisma.userContentImage.deleteMany).toHaveBeenCalledWith({
      where: { imageId: 'img-2', userContentId: 'content-1' },
    })
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

describe('deleteUnattachedImage', () => {
  const unattached = {
    id: 'img-1',
    ownerProfileId: 'profile-1',
    storagePath: 'profile-1/abcd',
    profileGallery: null,
    userContentGallery: null,
    messageGallery: null,
  }

  beforeEach(() => {
    mockPrisma.image.findMany.mockResolvedValue([unattached])
  })

  it('locks the row, then checks attachment and deletes inside the same transaction', async () => {
    await service.deleteUnattachedImage('img-1')

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    const lockSql = mockPrisma.$queryRaw.mock.calls[0][0].join('?')
    expect(lockSql).toMatch(/FOR UPDATE/)
    const lockOrder = mockPrisma.$queryRaw.mock.invocationCallOrder[0]
    expect(lockOrder).toBeLessThan(mockPrisma.image.findMany.mock.invocationCallOrder[0])
    expect(lockOrder).toBeLessThan(mockPrisma.image.delete.mock.invocationCallOrder[0])
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } })
    expect(mockUnlink).toHaveBeenCalled()
  })

  it('refuses an image an attach committed before the lock, without touching files', async () => {
    mockPrisma.image.findMany.mockResolvedValue([
      { ...unattached, userContentGallery: { userContentId: 'content-1' } },
    ])

    await expect(service.deleteUnattachedImage('img-1')).rejects.toMatchObject({
      code: 'ALREADY_ATTACHED',
    })
    expect(mockPrisma.image.delete).not.toHaveBeenCalled()
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('reports a missing image', async () => {
    mockPrisma.image.findMany.mockResolvedValue([])

    await expect(service.deleteUnattachedImage('img-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    expect(mockPrisma.image.delete).not.toHaveBeenCalled()
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

describe('detachFromProfile', () => {
  const IMG = 'img-1'
  const ME = 'p-1'
  const OTHER = 'p-other'

  it('throws NOT_FOUND when image does not exist', async () => {
    mockPrisma.image.findUnique.mockResolvedValue(null)
    await expect(service.detachFromProfile(IMG, ME)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('throws OWNER_MISMATCH when caller does not own the image', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: IMG,
      ownerProfileId: OTHER,
      profileGallery: { profileId: OTHER },
    })
    await expect(service.detachFromProfile(IMG, ME)).rejects.toMatchObject({
      code: 'OWNER_MISMATCH',
    })
  })

  it('throws NOT_FOUND when image is not in a profile gallery', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: IMG,
      ownerProfileId: ME,
      profileGallery: null,
      userContentGallery: { userContentId: 'c-1' },
    })
    await expect(service.detachFromProfile(IMG, ME)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('happy path: drops the join, calls syncProfileHasFace, leaves the Image row', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: IMG,
      ownerProfileId: ME,
      profileGallery: { profileId: ME },
    })
    mockPrisma.profileImage.delete.mockResolvedValue(undefined)
    mockPrisma.profileImage.findFirst.mockResolvedValue({
      image: { hasFace: true },
    } as any)

    await service.detachFromProfile(IMG, ME)

    expect(mockPrisma.profileImage.deleteMany).toHaveBeenCalledWith({
      where: { imageId: IMG, profileId: ME },
    })
    expect(mockPrisma.image.delete).not.toHaveBeenCalled()
    // syncProfileHasFace ran: it read the top gallery image then updated Profile.hasFace
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: ME },
      data: { hasFace: true },
    })
  })
})

describe('attachManyToUserContentTx', () => {
  it('inserts join rows with sequential positions in supplied order', async () => {
    const svc = service
    mockPrisma.image.findMany.mockResolvedValue([
      { id: 'img-a', ownerProfileId: 'profile-1', profileGallery: null, userContentGallery: null },
      { id: 'img-b', ownerProfileId: 'profile-1', profileGallery: null, userContentGallery: null },
    ] as any)
    mockPrisma.userContentImage.count.mockResolvedValue(0)

    await svc.attachManyToUserContentTx(mockPrisma, ['img-a', 'img-b'], 'content-1', 'profile-1')

    expect(mockPrisma.userContentImage.create).toHaveBeenNthCalledWith(1, {
      data: { imageId: 'img-a', userContentId: 'content-1' },
    })
    expect(mockPrisma.userContentImage.create).toHaveBeenNthCalledWith(2, {
      data: { imageId: 'img-b', userContentId: 'content-1' },
    })
    expect(mockPrisma.image.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'img-a' },
      data: { position: 0 },
    })
    expect(mockPrisma.image.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'img-b' },
      data: { position: 1 },
    })
  })

  it('appends positions starting from existing gallery count', async () => {
    const svc = service
    mockPrisma.image.findMany.mockResolvedValue([
      { id: 'img-a', ownerProfileId: 'profile-1', profileGallery: null, userContentGallery: null },
      { id: 'img-b', ownerProfileId: 'profile-1', profileGallery: null, userContentGallery: null },
    ] as any)
    mockPrisma.userContentImage.count.mockResolvedValue(3)

    await svc.attachManyToUserContentTx(mockPrisma, ['img-a', 'img-b'], 'content-1', 'profile-1')

    expect(mockPrisma.image.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'img-a' },
      data: { position: 3 },
    })
    expect(mockPrisma.image.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'img-b' },
      data: { position: 4 },
    })
  })

  it('throws NOT_FOUND when one imageId is missing', async () => {
    const svc = service
    mockPrisma.image.findMany.mockResolvedValue([
      { id: 'img-a', ownerProfileId: 'profile-1', profileGallery: null, userContentGallery: null },
    ] as any)

    await expect(
      svc.attachManyToUserContentTx(mockPrisma, ['img-a', 'img-missing'], 'content-1', 'profile-1')
    ).rejects.toThrow(/not found/i)
    expect(mockPrisma.userContentImage.create).not.toHaveBeenCalled()
  })

  it('throws OWNER_MISMATCH when one image is owned by another profile', async () => {
    const svc = service
    mockPrisma.image.findMany.mockResolvedValue([
      { id: 'img-a', ownerProfileId: 'profile-1', profileGallery: null, userContentGallery: null },
      {
        id: 'img-b',
        ownerProfileId: 'profile-OTHER',
        profileGallery: null,
        userContentGallery: null,
      },
    ] as any)

    await expect(
      svc.attachManyToUserContentTx(mockPrisma, ['img-a', 'img-b'], 'content-1', 'profile-1')
    ).rejects.toThrow(/owner/i)
    expect(mockPrisma.userContentImage.create).not.toHaveBeenCalled()
  })

  it('throws ALREADY_ATTACHED when one image is in another gallery', async () => {
    const svc = service
    mockPrisma.image.findMany.mockResolvedValue([
      {
        id: 'img-a',
        ownerProfileId: 'profile-1',
        profileGallery: { profileId: 'profile-1' },
        userContentGallery: null,
      },
    ] as any)

    await expect(
      svc.attachManyToUserContentTx(mockPrisma, ['img-a'], 'content-1', 'profile-1')
    ).rejects.toThrow(/already attached/i)
    expect(mockPrisma.userContentImage.create).not.toHaveBeenCalled()
  })

  it('is a no-op for empty input', async () => {
    const svc = service
    await svc.attachManyToUserContentTx(mockPrisma, [], 'content-1', 'profile-1')
    expect(mockPrisma.image.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.userContentImage.create).not.toHaveBeenCalled()
  })

  it('de-dupes input ids before validation and writes', async () => {
    const svc = service
    mockPrisma.image.findMany.mockResolvedValue([
      { id: 'img-a', ownerProfileId: 'profile-1', profileGallery: null, userContentGallery: null },
    ] as any)
    mockPrisma.userContentImage.count.mockResolvedValue(0)

    await svc.attachManyToUserContentTx(
      mockPrisma,
      ['img-a', 'img-a', 'img-a'],
      'content-1',
      'profile-1'
    )

    expect(mockPrisma.image.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['img-a'] } },
      include: { profileGallery: true, userContentGallery: true, messageGallery: true },
    })
    expect(mockPrisma.userContentImage.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.userContentImage.create).toHaveBeenCalledWith({
      data: { imageId: 'img-a', userContentId: 'content-1' },
    })
  })

  it('re-throws non-P2002 errors from userContentImage.create', async () => {
    const svc = service
    mockPrisma.image.findMany.mockResolvedValue([
      { id: 'img-a', ownerProfileId: 'profile-1', profileGallery: null, userContentGallery: null },
    ] as any)
    mockPrisma.userContentImage.count.mockResolvedValue(0)
    mockPrisma.userContentImage.create.mockRejectedValue(new Error('disk full'))

    await expect(
      svc.attachManyToUserContentTx(mockPrisma, ['img-a'], 'content-1', 'profile-1')
    ).rejects.toThrow(/disk full/)
  })
})

describe('detachFromUserContent', () => {
  const IMG = 'img-1'
  const ME = 'p-1'
  const CONTENT = 'c-1'

  it('throws NOT_FOUND when image does not exist', async () => {
    mockPrisma.image.findUnique.mockResolvedValue(null)
    await expect(service.detachFromUserContent(IMG, ME)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('throws OWNER_MISMATCH when caller does not own the image', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: IMG,
      ownerProfileId: 'p-other',
      userContentGallery: { userContentId: CONTENT },
    })
    await expect(service.detachFromUserContent(IMG, ME)).rejects.toMatchObject({
      code: 'OWNER_MISMATCH',
    })
  })

  it('throws NOT_FOUND when image is not in a content gallery', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: IMG,
      ownerProfileId: ME,
      userContentGallery: null,
      profileGallery: { profileId: ME },
    })
    await expect(service.detachFromUserContent(IMG, ME)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('happy path: drops the join, does NOT touch syncProfileHasFace, leaves the Image row', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: IMG,
      ownerProfileId: ME,
      userContentGallery: { userContentId: CONTENT },
    })
    mockPrisma.userContentImage.delete.mockResolvedValue(undefined)

    await service.detachFromUserContent(IMG, ME)

    expect(mockPrisma.userContentImage.deleteMany).toHaveBeenCalledWith({
      where: { imageId: IMG, userContentId: CONTENT },
    })
    expect(mockPrisma.image.delete).not.toHaveBeenCalled()
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })
})

describe('compactGalleryPositions', () => {
  it('renumbers a profile gallery with a gap and a duplicate to contiguous 0..n-1', async () => {
    const { compactGalleryPositions } = await import('../../services/image.service')
    // State reproduced via the API: delete primary A, then attach D → [B@1 C@2 D@2]
    mockPrisma.image.findMany.mockResolvedValueOnce([
      { id: 'B', position: 1 },
      { id: 'C', position: 2 },
      { id: 'D', position: 2 },
    ])

    await compactGalleryPositions(mockPrisma, { profileId: 'profile-1' })

    expect(mockPrisma.image.findMany).toHaveBeenCalledWith({
      where: { profileGallery: { profileId: 'profile-1' } },
      select: { id: true, position: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    })
    expect(mockPrisma.image.update.mock.calls).toEqual([
      [{ where: { id: 'B' }, data: { position: 0 } }],
      [{ where: { id: 'C' }, data: { position: 1 } }],
      // D is already at index 2
    ])
  })

  it('skips images already at their index', async () => {
    const { compactGalleryPositions } = await import('../../services/image.service')
    mockPrisma.image.findMany.mockResolvedValueOnce([
      { id: 'A', position: 0 },
      { id: 'C', position: 2 },
    ])

    await compactGalleryPositions(mockPrisma, { profileId: 'profile-1' })

    expect(mockPrisma.image.update.mock.calls).toEqual([
      [{ where: { id: 'C' }, data: { position: 1 } }],
    ])
  })

  it('scopes to a UserContent gallery', async () => {
    const { compactGalleryPositions } = await import('../../services/image.service')

    await compactGalleryPositions(mockPrisma, { userContentId: 'content-1' })

    expect(mockPrisma.image.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userContentGallery: { userContentId: 'content-1' } } })
    )
  })
})

describe('gallery mutations keep positions contiguous', () => {
  const remaining = [
    { id: 'B', position: 1 },
    { id: 'C', position: 2 },
  ]

  it('deleteImage on the primary compacts the profile gallery before re-syncing hasFace', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'A',
      ownerProfileId: 'profile-1',
      storagePath: 'x/a',
      profileGallery: { profileId: 'profile-1' },
      userContentGallery: null,
    })
    mockPrisma.image.findMany.mockResolvedValueOnce(remaining)
    mockPrisma.profileImage.findFirst.mockResolvedValue({ image: { hasFace: true } })

    await service.deleteImage('A', 'profile-1')

    expect(mockPrisma.image.update.mock.calls).toEqual([
      [{ where: { id: 'B' }, data: { position: 0 } }],
      [{ where: { id: 'C' }, data: { position: 1 } }],
    ])
    expect(mockPrisma.image.update.mock.invocationCallOrder.at(-1)).toBeLessThan(
      mockPrisma.profileImage.findFirst.mock.invocationCallOrder[0]
    )
  })

  it('deleteImage compacts a UserContent gallery', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'A',
      ownerProfileId: 'profile-1',
      storagePath: 'x/a',
      profileGallery: null,
      userContentGallery: { userContentId: 'content-1' },
    })
    mockPrisma.image.findMany.mockResolvedValueOnce(remaining)

    await service.deleteImage('A', 'profile-1')

    expect(mockPrisma.image.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userContentGallery: { userContentId: 'content-1' } } })
    )
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'B' },
      data: { position: 0 },
    })
  })

  it('detachFromProfile compacts the profile gallery', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'A',
      ownerProfileId: 'profile-1',
      profileGallery: { profileId: 'profile-1' },
      userContentGallery: null,
    })
    mockPrisma.image.findMany.mockResolvedValueOnce(remaining)
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)

    await service.detachFromProfile('A', 'profile-1')

    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'B' },
      data: { position: 0 },
    })
  })

  it('detachFromUserContent compacts the content gallery in one transaction', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'A',
      ownerProfileId: 'profile-1',
      userContentGallery: { userContentId: 'content-1' },
    })
    mockPrisma.image.findMany.mockResolvedValueOnce(remaining)

    await service.detachFromUserContent('A', 'profile-1')

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'B' },
      data: { position: 0 },
    })
  })

  it('reorderProfileGallery normalizes client-supplied duplicate/sparse positions', async () => {
    mockPrisma.profileImage.count.mockResolvedValue(2)
    mockPrisma.profileImage.findMany
      .mockResolvedValueOnce([{ imageId: 'A' }, { imageId: 'B' }])
      .mockResolvedValueOnce([])
    // After applying the client's A:5, B:5 the compaction pass sees the tie.
    mockPrisma.image.findMany.mockResolvedValueOnce([
      { id: 'A', position: 5 },
      { id: 'B', position: 5 },
    ])
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)

    await service.reorderProfileGallery('profile-1', [
      { id: 'A', position: 5 },
      { id: 'B', position: 5 },
    ])

    expect(mockPrisma.image.update.mock.calls.slice(-2)).toEqual([
      [{ where: { id: 'A' }, data: { position: 0 } }],
      [{ where: { id: 'B' }, data: { position: 1 } }],
    ])
  })

  it.each([
    ['reorderProfileGallery', 'profileImage', 'profile-1'],
    ['reorderUserContentGallery', 'userContentImage', 'content-1'],
  ])('%s rejects a payload that repeats an image id', async (method, joinModel, galleryId) => {
    // Same length as the gallery, but A twice and C omitted.
    mockPrisma[joinModel].count.mockResolvedValue(3)
    mockPrisma[joinModel].findMany.mockResolvedValue([{ imageId: 'A' }, { imageId: 'B' }])

    await expect(
      service[method](galleryId, [
        { id: 'A', position: 0 },
        { id: 'A', position: 1 },
        { id: 'B', position: 2 },
      ])
    ).rejects.toMatchObject({ code: 'INVALID_REORDER' })
    expect(mockPrisma.image.update).not.toHaveBeenCalled()
  })
})

describe('attach repairs galleries left broken by earlier code', () => {
  it('attachToProfile compacts before appending, so a lone image at position 1 does not tie with the new one', async () => {
    // Production state: single image B stuck at position 1.
    mockPrisma.image.findMany
      .mockResolvedValueOnce([
        {
          id: 'NEW',
          ownerProfileId: 'profile-1',
          profileGallery: null,
          userContentGallery: null,
          messageGallery: null,
        },
      ]) // locked load of the image being attached
      .mockResolvedValueOnce([{ id: 'B', position: 1 }]) // compaction read
    mockPrisma.profileImage.count.mockResolvedValue(1)
    mockPrisma.profileImage.findFirst.mockResolvedValue({ image: { hasFace: true } })

    await service.attachToProfile('NEW', 'profile-1')

    expect(mockPrisma.image.update.mock.calls).toEqual([
      [{ where: { id: 'B' }, data: { position: 0 } }],
      [{ where: { id: 'NEW' }, data: { position: 1 } }],
    ])
    expect(mockPrisma.image.findMany.mock.invocationCallOrder[1]).toBeLessThan(
      mockPrisma.profileImage.count.mock.invocationCallOrder[0]
    )
  })

  it('attachToUserContent compacts before appending', async () => {
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: 'content-1',
      postedById: 'profile-1',
    })
    mockPrisma.image.findMany
      .mockResolvedValueOnce([
        {
          id: 'NEW',
          ownerProfileId: 'profile-1',
          profileGallery: null,
          userContentGallery: null,
          messageGallery: null,
        },
      ])
      .mockResolvedValueOnce([
        { id: 'A', position: 0 },
        { id: 'C', position: 2 },
      ])
    mockPrisma.userContentImage.count.mockResolvedValue(2)

    await service.attachToUserContent('NEW', 'content-1')

    expect(mockPrisma.image.update.mock.calls).toEqual([
      [{ where: { id: 'C' }, data: { position: 1 } }],
      [{ where: { id: 'NEW' }, data: { position: 2 } }],
    ])
  })
})

describe('gallery mutations are serialized per gallery', () => {
  const lockSql = (call: any[]) => call[0].join('?')

  it('lockGallery row-locks the owning Profile or UserContent', async () => {
    const { lockGallery } = await import('../../services/image.service')

    await lockGallery(mockPrisma, { profileId: 'profile-1' })
    await lockGallery(mockPrisma, { userContentId: 'content-1' })

    const [profileCall, contentCall] = mockPrisma.$queryRaw.mock.calls
    expect(lockSql(profileCall)).toMatch(/FROM "Profile" WHERE id = \? FOR UPDATE/)
    expect(profileCall[1]).toBe('profile-1')
    expect(lockSql(contentCall)).toMatch(/FROM "UserContent" WHERE id = \? FOR UPDATE/)
    expect(contentCall[1]).toBe('content-1')
  })

  const firstWrite = () =>
    Math.min(
      ...[
        mockPrisma.image.update,
        mockPrisma.image.delete,
        mockPrisma.profileImage.create,
        mockPrisma.profileImage.delete,
        mockPrisma.userContentImage.create,
        mockPrisma.userContentImage.delete,
        mockPrisma.image.findMany,
        mockPrisma.profileImage.count,
        mockPrisma.userContentImage.count,
      ].flatMap((m: any) => m.mock.invocationCallOrder)
    )
  const expectLockedFirst = (id: string) => {
    expect(lockSql(mockPrisma.$queryRaw.mock.calls[0])).toMatch(/FROM "(Profile|UserContent)"/)
    expect(mockPrisma.$queryRaw.mock.calls[0][1]).toBe(id)
    expect(mockPrisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(firstWrite())
  }
  const unattached = {
    id: 'IMG',
    ownerProfileId: 'profile-1',
    storagePath: 'x/img',
    profileGallery: null,
    userContentGallery: null,
    messageGallery: null,
  }

  it('attachToProfile', async () => {
    mockPrisma.image.findMany.mockResolvedValueOnce([unattached])
    mockPrisma.profileImage.count.mockResolvedValue(0)
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)
    await service.attachToProfile('IMG', 'profile-1')
    expectLockedFirst('profile-1')
  })

  it('attachToUserContent', async () => {
    mockPrisma.image.findMany.mockResolvedValueOnce([unattached])
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: 'content-1',
      postedById: 'profile-1',
    })
    mockPrisma.userContentImage.count.mockResolvedValue(0)
    await service.attachToUserContent('IMG', 'content-1')
    expectLockedFirst('content-1')
  })

  it('detachFromProfile', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      ...unattached,
      profileGallery: { profileId: 'profile-1' },
    })
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)
    await service.detachFromProfile('IMG', 'profile-1')
    expectLockedFirst('profile-1')
  })

  it('detachFromUserContent', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      ...unattached,
      userContentGallery: { userContentId: 'content-1' },
    })
    await service.detachFromUserContent('IMG', 'profile-1')
    expectLockedFirst('content-1')
  })

  it('deleteImage (profile gallery)', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      ...unattached,
      profileGallery: { profileId: 'profile-1' },
    })
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)
    await service.deleteImage('IMG', 'profile-1')
    expectLockedFirst('profile-1')
  })

  it('deleteImage (unattached) takes the image lock, not a gallery lock', async () => {
    mockPrisma.image.findUnique.mockResolvedValue(unattached)
    mockPrisma.image.findMany.mockResolvedValueOnce([unattached]) // locked recheck
    await service.deleteImage('IMG', 'profile-1')
    const sqls = mockPrisma.$queryRaw.mock.calls.map(lockSql)
    expect(sqls.some((q: string) => /FROM "(Profile|UserContent)"/.test(q))).toBe(false)
    expect(sqls.some((q: string) => /FROM "Image" i/.test(q))).toBe(true)
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'IMG' } })
  })

  it('reorderProfileGallery', async () => {
    mockPrisma.profileImage.count.mockResolvedValue(1)
    mockPrisma.profileImage.findMany
      .mockResolvedValueOnce([{ imageId: 'IMG' }])
      .mockResolvedValueOnce([])
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)
    await service.reorderProfileGallery('profile-1', [{ id: 'IMG', position: 0 }])
    // count() for validation runs before the transaction; the lock must precede the writes.
    expect(mockPrisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mockPrisma.image.update.mock.invocationCallOrder[0]
    )
  })

  it('attachManyToUserContentTx', async () => {
    mockPrisma.image.findMany.mockResolvedValueOnce([unattached])
    mockPrisma.userContentImage.count.mockResolvedValue(0)
    await service.attachManyToUserContentTx(mockPrisma, ['IMG'], 'content-1', 'profile-1')
    expect(mockPrisma.$queryRaw.mock.calls[0][1]).toBe('content-1')
    expect(mockPrisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mockPrisma.userContentImage.count.mock.invocationCallOrder[0]
    )
  })
})

describe('attach paths lock the image before checking gallery membership', () => {
  const lockSql = (call: any[]) => call[0].join('?')
  const unattached = {
    id: 'IMG',
    ownerProfileId: 'profile-1',
    profileGallery: null,
    userContentGallery: null,
    messageGallery: null,
  }
  // The image lock is the $queryRaw on "Image"; membership is read by the first image.findMany.
  const expectImageLockBeforeMembershipRead = (galleryLocked: boolean) => {
    const calls = mockPrisma.$queryRaw.mock.calls
    const imageLockIdx = calls.findIndex((c: any[]) => /FROM "Image"/.test(lockSql(c)))
    expect(imageLockIdx).toBe(galleryLocked ? 1 : 0) // gallery lock (if any) first, then image
    // Locks only images that are not in any gallery, in id order.
    expect(lockSql(calls[imageLockIdx])).toMatch(
      /WHERE i\.id IN \(\?\)[\s\S]*NOT EXISTS[\s\S]*"ProfileImage"[\s\S]*"UserContentImage"[\s\S]*"MessageImage"[\s\S]*ORDER BY i\.id FOR UPDATE/
    )
    expect(mockPrisma.$queryRaw.mock.invocationCallOrder[imageLockIdx]).toBeLessThan(
      mockPrisma.image.findMany.mock.invocationCallOrder[0]
    )
  }

  it('attachToProfile', async () => {
    mockPrisma.image.findMany.mockResolvedValueOnce([unattached])
    mockPrisma.profileImage.count.mockResolvedValue(0)
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)
    await service.attachToProfile('IMG', 'profile-1')
    expectImageLockBeforeMembershipRead(true)
  })

  it('attachToUserContent', async () => {
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: 'content-1',
      postedById: 'profile-1',
    })
    mockPrisma.image.findMany.mockResolvedValueOnce([unattached])
    mockPrisma.userContentImage.count.mockResolvedValue(0)
    await service.attachToUserContent('IMG', 'content-1')
    expectImageLockBeforeMembershipRead(true)
  })

  it('attachManyToUserContentTx', async () => {
    mockPrisma.image.findMany.mockResolvedValueOnce([unattached])
    mockPrisma.userContentImage.count.mockResolvedValue(0)
    await service.attachManyToUserContentTx(mockPrisma, ['IMG'], 'content-1', 'profile-1')
    expectImageLockBeforeMembershipRead(true)
  })

  it('attachManyToMessageTx', async () => {
    mockPrisma.messageImage = { create: vi.fn() }
    mockPrisma.image.findMany.mockResolvedValueOnce([unattached])
    await service.attachManyToMessageTx(mockPrisma, ['IMG'], 'msg-1', 'profile-1')
    expectImageLockBeforeMembershipRead(false)
    expect(mockPrisma.messageImage.create).toHaveBeenCalledWith({
      data: { imageId: 'IMG', messageId: 'msg-1' },
    })
  })

  it('a concurrent attach that committed first is seen under the lock and rejected', async () => {
    // The other gallery's attach committed while we waited on the image lock.
    mockPrisma.image.findMany.mockResolvedValueOnce([
      { ...unattached, userContentGallery: { userContentId: 'content-1' } },
    ])

    await expect(service.attachToProfile('IMG', 'profile-1')).rejects.toMatchObject({
      code: 'ALREADY_ATTACHED',
    })
    expect(mockPrisma.profileImage.create).not.toHaveBeenCalled()
    expect(mockPrisma.image.update).not.toHaveBeenCalled()
  })
})

describe('detach/delete re-read when gallery membership changed before the lock', () => {
  const base = {
    id: 'IMG',
    ownerProfileId: 'profile-1',
    storagePath: 'x/img',
    profileGallery: null,
    userContentGallery: null,
    messageGallery: null,
  }

  it('detachFromUserContent: image moved C1 → C2; removes the C2 join and compacts C2, never C1', async () => {
    mockPrisma.image.findUnique
      .mockResolvedValueOnce({ ...base, userContentGallery: { userContentId: 'C1' } }) // stale
      .mockResolvedValueOnce({ ...base, userContentGallery: { userContentId: 'C2' } }) // re-read
    mockPrisma.userContentImage.deleteMany
      .mockResolvedValueOnce({ count: 0 }) // C1 no longer holds it
      .mockResolvedValueOnce({ count: 1 })

    await service.detachFromUserContent('IMG', 'profile-1')

    expect(mockPrisma.userContentImage.deleteMany.mock.calls).toEqual([
      [{ where: { imageId: 'IMG', userContentId: 'C1' } }],
      [{ where: { imageId: 'IMG', userContentId: 'C2' } }],
    ])
    expect(mockPrisma.image.findMany).toHaveBeenCalledTimes(1)
    expect(mockPrisma.image.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userContentGallery: { userContentId: 'C2' } } })
    )
  })

  it('detachFromProfile: image detached concurrently; re-read reports NOT_FOUND without compacting', async () => {
    mockPrisma.image.findUnique
      .mockResolvedValueOnce({ ...base, profileGallery: { profileId: 'profile-1' } })
      .mockResolvedValueOnce({ ...base })
    mockPrisma.profileImage.deleteMany.mockResolvedValueOnce({ count: 0 })

    await expect(service.detachFromProfile('IMG', 'profile-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    expect(mockPrisma.image.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })

  it('deleteImage: unattached at read, attached before the lock; retries via the gallery branch', async () => {
    mockPrisma.image.findUnique
      .mockResolvedValueOnce({ ...base }) // looked unattached
      .mockResolvedValueOnce({ ...base, profileGallery: { profileId: 'profile-1' } })
    mockPrisma.image.findMany
      .mockResolvedValueOnce([{ ...base, profileGallery: { profileId: 'profile-1' } }]) // locked recheck: attached
      .mockResolvedValueOnce([]) // compaction after the real delete
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)

    await service.deleteImage('IMG', 'profile-1')

    expect(mockPrisma.profileImage.deleteMany).toHaveBeenCalledWith({
      where: { imageId: 'IMG', profileId: 'profile-1' },
    })
    expect(mockPrisma.image.delete).toHaveBeenCalledTimes(1)
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { hasFace: false },
    })
    expect(mockUnlink).toHaveBeenCalled()
  })

  it('deleteImage: a message-attached image is deleted directly (no gallery to compact)', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({ ...base, messageGallery: { messageId: 'm-1' } })

    await service.deleteImage('IMG', 'profile-1')

    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'IMG' } })
  })

  it('gives up with CONFLICT after repeated membership changes, without deleting anything', async () => {
    mockPrisma.image.findUnique.mockResolvedValue({
      ...base,
      profileGallery: { profileId: 'profile-1' },
    })
    mockPrisma.profileImage.deleteMany.mockResolvedValue({ count: 0 })

    await expect(service.deleteImage('IMG', 'profile-1')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    expect(mockPrisma.profileImage.deleteMany).toHaveBeenCalledTimes(3)
    expect(mockPrisma.image.delete).not.toHaveBeenCalled()
    expect(mockUnlink).not.toHaveBeenCalled()
  })
})

describe('reorder validates membership under the gallery lock', () => {
  it.each([
    ['reorderProfileGallery', 'profileImage', 'profile-1'],
    ['reorderUserContentGallery', 'userContentImage', 'content-1'],
  ])('%s', async (method, joinModel, galleryId) => {
    mockPrisma[joinModel].count.mockResolvedValue(1)
    mockPrisma[joinModel].findMany
      .mockResolvedValueOnce([{ imageId: 'A' }])
      .mockResolvedValueOnce([])
    mockPrisma.profileImage.findFirst.mockResolvedValue(null)

    await service[method](galleryId, [{ id: 'A', position: 0 }])

    const lockAt = mockPrisma.$queryRaw.mock.invocationCallOrder[0]
    expect(lockAt).toBeLessThan(mockPrisma[joinModel].count.mock.invocationCallOrder[0])
    expect(lockAt).toBeLessThan(mockPrisma[joinModel].findMany.mock.invocationCallOrder[0])
  })
})

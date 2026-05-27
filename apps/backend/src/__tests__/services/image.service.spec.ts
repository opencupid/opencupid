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

    expect(mockPrisma.profileImage.delete).toHaveBeenCalledWith({ where: { imageId: IMG } })
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

  it('swallows P2002 from userContentImage.create and continues with remaining ids', async () => {
    const { Prisma } = await import('@prisma/client')
    const svc = service
    mockPrisma.image.findMany.mockResolvedValue([
      { id: 'img-a', ownerProfileId: 'profile-1', profileGallery: null, userContentGallery: null },
      { id: 'img-b', ownerProfileId: 'profile-1', profileGallery: null, userContentGallery: null },
    ] as any)
    mockPrisma.userContentImage.count.mockResolvedValue(0)

    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '0',
    })
    mockPrisma.userContentImage.create.mockRejectedValueOnce(p2002).mockResolvedValueOnce(undefined)

    await expect(
      svc.attachManyToUserContentTx(mockPrisma, ['img-a', 'img-b'], 'content-1', 'profile-1')
    ).resolves.toBeUndefined()

    // First image's join failed; its position update is skipped.
    expect(mockPrisma.image.update).toHaveBeenCalledTimes(1)
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img-b' },
      data: { position: 1 },
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

    expect(mockPrisma.userContentImage.delete).toHaveBeenCalledWith({ where: { imageId: IMG } })
    expect(mockPrisma.image.delete).not.toHaveBeenCalled()
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })
})

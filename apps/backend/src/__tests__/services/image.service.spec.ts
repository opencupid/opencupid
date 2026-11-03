import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Prisma } from '@prisma/client'
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
let images: Record<string, any> = {}

const ME = 'profile-1'
const img = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  ownerProfileId: ME,
  storagePath: `${ME}/${id}`,
  hasFace: false,
  attachment: null,
  messageGallery: null,
  ...extra,
})
const given = (...list: any[]) => {
  for (const i of list) images[i.id] = i
}
/** invocation order of the first call to each mock, for asserting lock order */
const firstCall = (m: any) => m.mock.invocationCallOrder[0]
const profileLock = (id = ME) => ({ where: { id }, data: { updatedAt: expect.any(Date) } })
const imageLock = (id: string) => ({
  where: { id },
  data: { updatedAt: expect.any(Date) },
  include: { attachment: true, messageGallery: true },
})

beforeEach(async () => {
  Object.assign(mockPrisma, createMockPrisma())
  // Image / UserContent models aren't in createMockPrisma — declare them inline.
  mockPrisma.image = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  }
  mockPrisma.messageImage = { create: vi.fn() }
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
  // image / userContent extensions land. Re-bind it to the live mockPrisma
  // so transactions see the full surface.
  mockPrisma.$transaction = vi.fn((fn: (client: any) => any) => fn(mockPrisma))
  mockPrisma.imageAttachment.findMany.mockResolvedValue([])
  mockPrisma.imageAttachment.findFirst.mockResolvedValue(null)
  mockPrisma.imageAttachment.deleteMany.mockResolvedValue({ count: 1 })
  mockUnlink.mockClear()
  images = {}
  // lockImages(): image.update(...) is the row lock; it returns the image with its
  // memberships, or raises P2025 when the image does not exist.
  mockPrisma.image.update.mockImplementation(async ({ where }: any) => {
    const img = images[where.id]
    if (!img) {
      throw new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      })
    }
    return img
  })
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
    // Critical: the image is created unattached.
    expect(mockPrisma.imageAttachment.create).not.toHaveBeenCalled()
  })
})

describe('listing galleries', () => {
  it('listProfileGallery orders by ImageAttachment.position and returns the images', async () => {
    mockPrisma.imageAttachment.findMany.mockResolvedValue([
      { image: img('a') },
      { image: img('b') },
    ])

    const result = await service.listProfileGallery(ME)

    expect(mockPrisma.imageAttachment.findMany).toHaveBeenCalledWith({
      where: { profileId: ME },
      include: { image: true },
      orderBy: { position: 'asc' },
    })
    expect(result.map((i: any) => i.id)).toEqual(['a', 'b'])
  })

  it('listUserContentGallery orders by ImageAttachment.position', async () => {
    await service.listUserContentGallery('content-1')

    expect(mockPrisma.imageAttachment.findMany).toHaveBeenCalledWith({
      where: { userContentId: 'content-1' },
      include: { image: true },
      orderBy: { position: 'asc' },
    })
  })
})

describe('attachToProfile', () => {
  it('locks the profile gallery, then the image, appends without a position, then syncs hasFace', async () => {
    given(img('a'))
    mockPrisma.imageAttachment.findFirst.mockResolvedValue({ image: { hasFace: true } })

    await service.attachToProfile('a', ME)

    expect(mockPrisma.profile.update).toHaveBeenNthCalledWith(1, profileLock())
    expect(mockPrisma.image.update).toHaveBeenCalledWith(imageLock('a'))
    // No position: the DB sequence appends it.
    expect(mockPrisma.imageAttachment.create).toHaveBeenCalledWith({
      data: { imageId: 'a', profileId: ME },
    })
    expect(mockPrisma.profile.update).toHaveBeenLastCalledWith({
      where: { id: ME },
      data: { hasFace: true },
    })
    expect(firstCall(mockPrisma.profile.update)).toBeLessThan(firstCall(mockPrisma.image.update))
    expect(firstCall(mockPrisma.image.update)).toBeLessThan(
      firstCall(mockPrisma.imageAttachment.create)
    )
  })

  it.each([
    ['another owner', img('a', { ownerProfileId: 'other' }), 'OWNER_MISMATCH'],
    ['already in a gallery', img('a', { attachment: { userContentId: 'c' } }), 'ALREADY_ATTACHED'],
    ['already in a message', img('a', { messageGallery: { messageId: 'm' } }), 'ALREADY_ATTACHED'],
  ])('rejects an image that is %s, without writing', async (_label, image, code) => {
    given(image)

    await expect(service.attachToProfile('a', ME)).rejects.toMatchObject({ code })
    expect(mockPrisma.imageAttachment.create).not.toHaveBeenCalled()
  })

  it('reports a missing image as NOT_FOUND', async () => {
    await expect(service.attachToProfile('missing', ME)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    expect(mockPrisma.imageAttachment.create).not.toHaveBeenCalled()
  })
})

describe('attachToUserContent', () => {
  beforeEach(() => {
    mockPrisma.userContent.findUnique.mockResolvedValue({ id: 'content-1', postedById: ME })
  })

  it('locks only the image (no profile lock), appends without a position, leaves hasFace alone', async () => {
    given(img('a'))

    await service.attachToUserContent('a', 'content-1')

    expect(mockPrisma.image.update).toHaveBeenCalledWith(imageLock('a'))
    expect(mockPrisma.imageAttachment.create).toHaveBeenCalledWith({
      data: { imageId: 'a', userContentId: 'content-1' },
    })
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })

  it('rejects an image not owned by the content author', async () => {
    given(img('a', { ownerProfileId: 'other' }))

    await expect(service.attachToUserContent('a', 'content-1')).rejects.toMatchObject({
      code: 'OWNER_MISMATCH',
    })
    expect(mockPrisma.imageAttachment.create).not.toHaveBeenCalled()
  })

  it('reports missing content as NOT_FOUND', async () => {
    mockPrisma.userContent.findUnique.mockResolvedValue(null)

    await expect(service.attachToUserContent('a', 'content-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('attachManyToUserContentTx', () => {
  it('locks images in id order but creates attachments in the picked order', async () => {
    given(img('b'), img('a'), img('c'))

    await service.attachManyToUserContentTx(mockPrisma, ['c', 'a', 'b', 'a'], 'content-1', ME)

    expect(mockPrisma.image.update.mock.calls.map((c: any) => c[0].where.id)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(mockPrisma.imageAttachment.create.mock.calls.map((c: any) => c[0].data)).toEqual([
      { imageId: 'c', userContentId: 'content-1' },
      { imageId: 'a', userContentId: 'content-1' },
      { imageId: 'b', userContentId: 'content-1' },
    ])
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })

  it('is a no-op for empty input', async () => {
    await service.attachManyToUserContentTx(mockPrisma, [], 'content-1', ME)
    expect(mockPrisma.image.update).not.toHaveBeenCalled()
  })

  it.each([
    ['missing', [img('a')], ['a', 'zz'], 'NOT_FOUND'],
    [
      'owned by someone else',
      [img('a'), img('b', { ownerProfileId: 'other' })],
      ['a', 'b'],
      'OWNER_MISMATCH',
    ],
    [
      'already attached',
      [img('a'), img('b', { attachment: { profileId: ME } })],
      ['a', 'b'],
      'ALREADY_ATTACHED',
    ],
  ])('rejects the whole batch when an image is %s', async (_label, list, ids, code) => {
    given(...list)

    await expect(
      service.attachManyToUserContentTx(mockPrisma, ids, 'content-1', ME)
    ).rejects.toMatchObject({ code })
    expect(mockPrisma.imageAttachment.create).not.toHaveBeenCalled()
  })
})

describe('attachManyToMessageTx', () => {
  it('rejects an image that is in a gallery', async () => {
    given(img('a', { attachment: { profileId: ME } }))

    await expect(
      service.attachManyToMessageTx(mockPrisma, ['a'], 'msg-1', ME)
    ).rejects.toMatchObject({ code: 'ALREADY_ATTACHED' })
    expect(mockPrisma.messageImage.create).not.toHaveBeenCalled()
  })

  it('creates MessageImage rows and records the picked order in Image.position', async () => {
    given(img('a'), img('b'))

    await service.attachManyToMessageTx(mockPrisma, ['b', 'a'], 'msg-1', ME)

    expect(mockPrisma.messageImage.create.mock.calls.map((c: any) => c[0].data.imageId)).toEqual([
      'b',
      'a',
    ])
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'b' },
      data: { position: 0 },
    })
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { position: 1 },
    })
  })
})

describe('detachFromProfile', () => {
  it('locks the gallery and the image, removes only this profile gallery row, then syncs hasFace', async () => {
    mockPrisma.image.findUnique.mockResolvedValue(img('a'))
    given(img('a'))

    await service.detachFromProfile('a', ME)

    expect(mockPrisma.profile.update).toHaveBeenNthCalledWith(1, profileLock())
    expect(mockPrisma.imageAttachment.deleteMany).toHaveBeenCalledWith({
      where: { imageId: 'a', profileId: ME },
    })
    expect(firstCall(mockPrisma.image.update)).toBeLessThan(
      firstCall(mockPrisma.imageAttachment.deleteMany)
    )
    expect(mockPrisma.profile.update).toHaveBeenLastCalledWith({
      where: { id: ME },
      data: { hasFace: false },
    })
  })

  it('reports NOT_FOUND when the image is not in the profile gallery, without re-syncing', async () => {
    mockPrisma.image.findUnique.mockResolvedValue(img('a'))
    given(img('a'))
    mockPrisma.imageAttachment.deleteMany.mockResolvedValue({ count: 0 })

    await expect(service.detachFromProfile('a', ME)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(mockPrisma.imageAttachment.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ['missing image', null, 'NOT_FOUND'],
    ['non-owner', img('a', { ownerProfileId: 'other' }), 'OWNER_MISMATCH'],
  ])('rejects a %s before opening a transaction', async (_label, found, code) => {
    mockPrisma.image.findUnique.mockResolvedValue(found)

    await expect(service.detachFromProfile('a', ME)).rejects.toMatchObject({ code })
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})

describe('detachFromUserContent', () => {
  it('removes only the row for the given content and takes no profile lock', async () => {
    mockPrisma.image.findUnique.mockResolvedValue(img('a'))
    given(img('a'))

    await service.detachFromUserContent('a', ME, 'content-1')

    expect(mockPrisma.imageAttachment.deleteMany).toHaveBeenCalledWith({
      where: { imageId: 'a', userContentId: 'content-1' },
    })
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })

  it('reports NOT_FOUND when the image is not in that content gallery', async () => {
    mockPrisma.image.findUnique.mockResolvedValue(img('a'))
    given(img('a'))
    mockPrisma.imageAttachment.deleteMany.mockResolvedValue({ count: 0 })

    await expect(service.detachFromUserContent('a', ME, 'content-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('deleteImage', () => {
  it("locks the owner's gallery, then the image, deletes it, re-syncs hasFace, then unlinks files", async () => {
    mockPrisma.image.findUnique.mockResolvedValue(img('a'))
    given(img('a'))

    await service.deleteImage('a', ME)

    expect(mockPrisma.profile.update).toHaveBeenNthCalledWith(1, profileLock())
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'a' } })
    expect(firstCall(mockPrisma.profile.update)).toBeLessThan(firstCall(mockPrisma.image.update))
    expect(firstCall(mockPrisma.image.update)).toBeLessThan(firstCall(mockPrisma.image.delete))
    expect(mockPrisma.profile.update).toHaveBeenLastCalledWith({
      where: { id: ME },
      data: { hasFace: false },
    })
    expect(mockUnlink).toHaveBeenCalled()
  })

  it('rejects a non-owner without deleting', async () => {
    mockPrisma.image.findUnique.mockResolvedValue(img('a', { ownerProfileId: 'other' }))

    await expect(service.deleteImage('a', ME)).rejects.toMatchObject({ code: 'OWNER_MISMATCH' })
    expect(mockPrisma.image.delete).not.toHaveBeenCalled()
    expect(mockUnlink).not.toHaveBeenCalled()
  })
})

describe('deleteUnattachedImage', () => {
  it('locks the image, checks it is unattached, deletes it and unlinks files', async () => {
    given(img('a'))

    await service.deleteUnattachedImage('a')

    expect(mockPrisma.image.update).toHaveBeenCalledWith(imageLock('a'))
    expect(firstCall(mockPrisma.image.update)).toBeLessThan(firstCall(mockPrisma.image.delete))
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'a' } })
    expect(mockUnlink).toHaveBeenCalled()
  })

  it.each([
    ['a gallery', { attachment: { userContentId: 'c' } }],
    ['a message', { messageGallery: { messageId: 'm' } }],
  ])('refuses an image in %s (read under the lock), without touching files', async (_l, extra) => {
    given(img('a', extra))

    await expect(service.deleteUnattachedImage('a')).rejects.toMatchObject({
      code: 'ALREADY_ATTACHED',
    })
    expect(mockPrisma.image.delete).not.toHaveBeenCalled()
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('reports a missing image', async () => {
    await expect(service.deleteUnattachedImage('missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
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

/** calls to imageAttachment.update as [imageId, position] */
const positionWrites = () =>
  mockPrisma.imageAttachment.update.mock.calls.map((c: any) => [
    c[0].where.imageId,
    c[0].data.position,
  ])

describe('reorderProfileGallery', () => {
  beforeEach(() => {
    given(img('a'), img('b'), img('c'))
    // sparse sequence-drawn positions
    mockPrisma.imageAttachment.findMany.mockResolvedValue([
      { imageId: 'a', position: 10 },
      { imageId: 'b', position: 20 },
      { imageId: 'c', position: 30 },
    ])
  })

  it('permutes the existing positions into array order (client positions ignored), two-phase, then syncs', async () => {
    await service.reorderProfileGallery(ME, [
      { id: 'c', position: 7 },
      { id: 'a', position: 7 },
      { id: 'b', position: 0 },
    ])

    expect(mockPrisma.profile.update).toHaveBeenNthCalledWith(1, profileLock())
    expect(firstCall(mockPrisma.profile.update)).toBeLessThan(firstCall(mockPrisma.image.update))
    // validated under the locks
    expect(firstCall(mockPrisma.image.update)).toBeLessThan(
      firstCall(mockPrisma.imageAttachment.findMany)
    )
    // phase 1: unique negatives; phase 2: the gallery's own values, smallest first
    expect(positionWrites()).toEqual([
      ['c', -1],
      ['a', -2],
      ['b', -3],
      ['c', 10],
      ['a', 20],
      ['b', 30],
    ])
    // no rows deleted or created, so no new sequence values are drawn
    expect(mockPrisma.imageAttachment.deleteMany).not.toHaveBeenCalled()
    expect(mockPrisma.imageAttachment.create).not.toHaveBeenCalled()
    expect(mockPrisma.profile.update).toHaveBeenLastCalledWith({
      where: { id: ME },
      data: { hasFace: false },
    })
  })

  it.each([
    [
      'repeats an image id',
      [
        { id: 'a', position: 0 },
        { id: 'a', position: 1 },
        { id: 'b', position: 2 },
      ],
    ],
    [
      'omits an image',
      [
        { id: 'a', position: 0 },
        { id: 'b', position: 1 },
      ],
    ],
    [
      'names an unknown image',
      [
        { id: 'a', position: 0 },
        { id: 'b', position: 1 },
        { id: 'zz', position: 2 },
      ],
    ],
  ])('rejects a payload that %s, without writing', async (_label, items) => {
    await expect(service.reorderProfileGallery(ME, items)).rejects.toMatchObject({
      code: 'INVALID_REORDER',
    })
    expect(mockPrisma.imageAttachment.update).not.toHaveBeenCalled()
  })
})

describe('reorderUserContentGallery', () => {
  it('takes no profile lock and only reuses the gallery positions', async () => {
    given(img('a'), img('b'))
    mockPrisma.imageAttachment.findMany.mockResolvedValue([
      { imageId: 'a', position: 4 },
      { imageId: 'b', position: 9 },
    ])

    await service.reorderUserContentGallery('content-1', [
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
    ])

    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
    expect(positionWrites()).toEqual([
      ['b', -1],
      ['a', -2],
      ['b', 4],
      ['a', 9],
    ])
  })

  it('leaves an image attached after validation last (its higher sequence value is untouched)', async () => {
    // Gallery A(4), B(9) validated; C attaches concurrently with sequence value 12.
    given(img('a'), img('b'))
    mockPrisma.imageAttachment.findMany.mockResolvedValue([
      { imageId: 'a', position: 4 },
      { imageId: 'b', position: 9 },
    ])

    await service.reorderUserContentGallery('content-1', [
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
    ])

    // Only B and A are written, with values ≤ 9, so the final order is B(4), A(9), C(12).
    const written = positionWrites()
    expect(written.every(([id]: [string]) => id === 'a' || id === 'b')).toBe(true)
    expect(Math.max(...written.map(([, pos]: [string, number]) => pos))).toBeLessThan(12)
  })
})

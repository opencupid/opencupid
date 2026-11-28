import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

// The like flow with the real restricted-photo grant: one payload serves both
// ends, so both profiles are cut to the pair's eligibility.

let service: any
let mockPrisma: any

const datingRow = (id: string, eligible: boolean) => ({
  id,
  isDatingActive: eligible,
  birthday: new Date(new Date().getFullYear() - 30, 0, 1),
  gender: id === 'liker' ? 'female' : 'male',
  hasKids: 'no',
  prefAgeMin: 25,
  prefAgeMax: 40,
  prefGender: id === 'liker' ? ['male'] : ['female'],
  prefKids: [],
})

const image = (id: string, storagePath: string) => ({
  id,
  storagePath,
  mimeType: 'image/webp',
  altText: '',
  blurhash: '',
  width: null,
  height: null,
  position: 0,
})

const withGallery = (id: string) => ({
  id,
  publicName: id,
  profileImages: [
    { isRestricted: true, image: image(`${id}-r`, `${id}/r`) },
    { isRestricted: false, image: image(`${id}-u`, `${id}/u`) },
  ],
})

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  vi.doMock('../../services/messaging.service', () => ({
    MessageService: { getInstance: () => ({ acceptConversationOnMatch: vi.fn() }) },
  }))
  vi.doMock('@/services/image.service', () => ({
    ImageService: {
      getInstance: () => ({
        getImageUrls: (img: { storagePath: string }) => [{ size: 'thumb', url: img.storagePath }],
      }),
    },
  }))
  const module = await import('../../services/interaction.service')
  ;(module.InteractionService as any).instance = undefined
  service = module.InteractionService.getInstance()

  mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => any) =>
    fn({
      hiddenProfile: { deleteMany: vi.fn() },
      likedProfile: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ createdAt: new Date(), isNew: true }),
      },
    })
  )
  mockPrisma.likedProfile.findUnique.mockResolvedValue(null)
  mockPrisma.profile.findUniqueOrThrow.mockImplementation(async ({ where }: any) =>
    withGallery(where.id)
  )
})

const urls = (edge: any) => edge.profile.profileImages.map((i: any) => i.variants[0].url)

describe('InteractionService.like restricted photos', () => {
  it('gives both ends the first photo when the pair is eligible', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([
      datingRow('liker', true),
      datingRow('target', true),
    ])
    const pair = await service.like('liker', 'target')
    expect(urls(pair.to)).toEqual(['target/r', 'target/u'])
    expect(urls(pair.from)).toEqual(['liker/r', 'liker/u'])
  })

  it("drops both ends' restricted photos when the pair is not eligible", async () => {
    mockPrisma.profile.findMany.mockResolvedValue([
      datingRow('liker', true),
      datingRow('target', false),
    ])
    const pair = await service.like('liker', 'target')
    expect(urls(pair.to)).toEqual(['target/u'])
    // pair.from is also the target's WebSocket payload.
    expect(urls(pair.from)).toEqual(['liker/u'])
  })
})

describe('InteractionService lists restricted photos', () => {
  it('cuts each liked profile to its own pair with the viewer', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([
      datingRow('liker', true),
      datingRow('match', true),
      datingRow('other', false),
    ])
    mockPrisma.likedProfile.findMany.mockResolvedValue([
      { toId: 'match', to: withGallery('match'), createdAt: new Date(), isNew: true },
      { toId: 'other', to: withGallery('other'), createdAt: new Date(), isNew: true },
    ])
    const edges = await service.getLikesSent('liker')
    expect(edges.map(urls)).toEqual([['match/r', 'match/u'], ['other/u']])
  })
})

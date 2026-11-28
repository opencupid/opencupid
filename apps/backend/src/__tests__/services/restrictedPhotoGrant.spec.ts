import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let mockPrisma: any
let grant: typeof import('../../services/restrictedPhotoGrant')

const yearsAgo = (n: number) => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - n)
  return d
}

// a and b fit each other; c is outside both age ranges; d is not dating.
const dating = (id: string, age: number, extra: Record<string, unknown> = {}) => ({
  id,
  isDatingActive: true,
  birthday: yearsAgo(age),
  gender: id === 'a' ? 'female' : 'male',
  hasKids: 'no',
  prefAgeMin: 25,
  prefAgeMax: 40,
  prefGender: id === 'a' ? ['male'] : ['female'],
  prefKids: ['no'],
  ...extra,
})
const profiles = [
  dating('a', 30),
  dating('b', 32),
  dating('c', 60),
  dating('d', 31, { isDatingActive: false }),
]

const gallery = () => [
  { isRestricted: true, image: { id: 'r' } },
  { isRestricted: false, image: { id: 'u' } },
]
const imageIds = (p: { profileImages: { image: { id: string } }[] }) =>
  p.profileImages.map((g) => g.image.id)

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  mockPrisma.profile.findMany.mockImplementation(async ({ where }: any) =>
    profiles.filter((p) => where.id.in.includes(p.id))
  )
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  grant = await import('../../services/restrictedPhotoGrant')
})

describe('pairEligibility', () => {
  it('is true only for two dating, mutually compatible profiles', async () => {
    const isEligible = await grant.pairEligibility([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'd'],
    ])
    expect(isEligible('a', 'b')).toBe(true)
    expect(isEligible('b', 'a')).toBe(true)
    expect(isEligible('a', 'c')).toBe(false)
    expect(isEligible('b', 'd')).toBe(false)
  })

  it('is false for a missing profile, a closed account and a profile with itself', async () => {
    const isEligible = await grant.pairEligibility([
      ['a', 'gone'],
      ['a', null],
      ['a', 'a'],
    ])
    expect(isEligible('a', 'gone')).toBe(false)
    expect(isEligible('a', null)).toBe(false)
    expect(isEligible('a', 'a')).toBe(false)
  })

  it('loads every profile of every pair in one query', async () => {
    await grant.pairEligibility([
      ['a', 'b'],
      ['a', 'c'],
    ])
    expect(mockPrisma.profile.findMany).toHaveBeenCalledTimes(1)
    expect(mockPrisma.profile.findMany.mock.calls[0][0].where.id.in.sort()).toEqual(['a', 'b', 'c'])
  })

  it('does not query without profiles', async () => {
    await grant.pairEligibility([])
    expect(mockPrisma.profile.findMany).not.toHaveBeenCalled()
  })
})

describe('withVisibleImages', () => {
  it("keeps the owner's order when allowed and drops restricted photos otherwise", () => {
    expect(imageIds(grant.withVisibleImages({ profileImages: gallery() }, true))).toEqual([
      'r',
      'u',
    ])
    expect(imageIds(grant.withVisibleImages({ profileImages: gallery() }, false))).toEqual(['u'])
  })
})

describe('grantSummaryImages', () => {
  const summary = (profileAId: string, profileBId: string | null) => ({
    id: `cp-${profileAId}-${profileBId}`,
    conversation: {
      profileAId,
      profileBId,
      profileA: { id: profileAId, profileImages: gallery() },
      profileB: profileBId ? { id: profileBId, profileImages: gallery() } : null,
    },
  })

  it("cuts both profiles to the pair's eligibility", async () => {
    const [eligible, ineligible] = (await grant.grantSummaryImages([
      summary('a', 'b'),
      summary('a', 'c'),
    ] as any)) as any[]
    expect(imageIds(eligible.conversation.profileA)).toEqual(['r', 'u'])
    expect(imageIds(eligible.conversation.profileB)).toEqual(['r', 'u'])
    expect(imageIds(ineligible.conversation.profileA)).toEqual(['u'])
    expect(imageIds(ineligible.conversation.profileB)).toEqual(['u'])
  })

  it('keeps the tombstone of a closed account', async () => {
    const [row] = (await grant.grantSummaryImages([summary('a', null)] as any)) as any[]
    expect(row.conversation.profileB).toBeNull()
    expect(imageIds(row.conversation.profileA)).toEqual(['u'])
  })

  it('passes null through', async () => {
    expect(await grant.grantSummaryImage(null)).toBeNull()
  })
})

describe('grantMessageImages', () => {
  const message = (id: string, senderId: string, profileAId: string, profileBId: string) => ({
    id,
    sender: { id: senderId, profileImages: gallery() },
    conversation: { profileAId, profileBId },
  })

  it("cuts the sender's gallery to the conversation pair's eligibility", async () => {
    const [eligible, ineligible] = (await grant.grantMessageImages([
      message('m1', 'b', 'a', 'b'),
      message('m2', 'c', 'a', 'c'),
    ] as any)) as any[]
    expect(imageIds(eligible.sender)).toEqual(['r', 'u'])
    expect(imageIds(ineligible.sender)).toEqual(['u'])
  })

  it('gives the sender the same cut as the recipient', async () => {
    const own = (await grant.grantMessageImage(message('m1', 'a', 'a', 'c') as any)) as any
    expect(imageIds(own.sender)).toEqual(['u'])
  })

  it('keeps a message without a sender', async () => {
    const orphan = { id: 'm', sender: null, conversation: { profileAId: 'a', profileBId: 'b' } }
    expect(await grant.grantMessageImage(orphan as any)).toEqual(orphan)
  })
})

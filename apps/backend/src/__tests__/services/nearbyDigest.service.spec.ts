import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, mockNotifyLoadedUser } = vi.hoisted(() => ({
  mockPrisma: {
    profile: { findMany: vi.fn() },
    nearbySignupNotification: { create: vi.fn() },
  },
  mockNotifyLoadedUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/services/notifier.service', () => ({
  notifierService: { notifyLoadedUser: mockNotifyLoadedUser },
}))
vi.mock('@/db/includes/blocklistWhereClause', () => ({
  blocklistWhereClause: (id: string) => ({ blocklistFor: id }),
}))

import {
  boundingBox,
  referenceTime,
  sendNearbyDigests,
  sendsThisSpell,
  DORMANT_DAYS,
  MAX_SENDS_PER_SPELL,
} from '@/services/nearbyDigest.service'
import { socialVisibleWhere } from '@/services/profileMatch.service'

const NOW = new Date('2026-11-23T09:00:00Z')
const LAST_SEEN = new Date('2026-10-01T12:00:00Z')
const BUDAPEST = { lat: 47.4979, lon: 19.0402 }

function recipient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'recipient',
    ...BUDAPEST,
    user: { id: 'user-r', profile: { publicName: 'R' } },
    activitySummary: { lastSeenAt: LAST_SEEN },
    nearbySignupNotifications: [],
    ...overrides,
  }
}

/** Points roughly `km` north of Budapest. */
function neighbour(id: string, km: number) {
  return { id, lat: BUDAPEST.lat + km / 111.2, lon: BUDAPEST.lon }
}

function mockRun(recipients: unknown[], candidates: unknown[]) {
  mockPrisma.profile.findMany.mockImplementation(async (args: any) =>
    args.include ? recipients : candidates
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.profile.findMany.mockReset()
})

describe('pure helpers', () => {
  it('referenceTime is the later of the last visit and the last digest', () => {
    const later = new Date('2026-11-16T09:00:00Z')
    expect(referenceTime(LAST_SEEN, [])).toEqual(LAST_SEEN)
    expect(referenceTime(LAST_SEEN, [later, new Date('2026-11-09T09:00:00Z')])).toEqual(later)
  })

  it('sendsThisSpell only counts digests after the last visit, so a visit resets it', () => {
    const before = new Date('2026-09-01T00:00:00Z')
    const after = new Date('2026-11-16T00:00:00Z')
    expect(sendsThisSpell(LAST_SEEN, [after, before])).toBe(1)
    expect(sendsThisSpell(new Date('2026-11-20T00:00:00Z'), [after, before])).toBe(0)
  })

  it('boundingBox contains every point within the distance', () => {
    const box = boundingBox(BUDAPEST.lat, BUDAPEST.lon, 25)
    const east = BUDAPEST.lon + 25 / (111.2 * Math.cos((BUDAPEST.lat * Math.PI) / 180))
    expect(box.lat.lte).toBeGreaterThanOrEqual(neighbour('n', 25).lat)
    expect(box.lon.lte).toBeGreaterThanOrEqual(east)
    expect(box.lat.gte).toBeLessThan(BUDAPEST.lat)
  })
})

describe('sendNearbyDigests', () => {
  it('selects dormant, opted-in, located profiles without an opt-out', async () => {
    mockRun([], [])
    await sendNearbyDigests({ runDate: '2026-11-23', now: NOW })

    const { where, include } = mockPrisma.profile.findMany.mock.calls[0][0]
    const cutoff = new Date(NOW.getTime() - DORMANT_DAYS * 24 * 60 * 60 * 1000)
    expect(where.activitySummary).toEqual({ lastSeenAt: { lt: cutoff } })
    expect(where.nearbySignupOptOut).toEqual({ is: null })
    expect(where.AND).toContainEqual({ user: { isActive: true, emailNotificationsOptIn: true } })
    expect(include.nearbySignupNotifications.take).toBe(MAX_SENDS_PER_SPELL)
  })

  it('considers every profile when no cohort is given', async () => {
    mockRun([], [])
    await sendNearbyDigests({ runDate: '2026-11-23', now: NOW })

    expect(mockPrisma.profile.findMany.mock.calls[0][0].where).not.toHaveProperty('id')
  })

  it('narrows a cohort run to the given profiles without relaxing eligibility', async () => {
    mockRun([], [])
    await sendNearbyDigests({ runDate: '2026-11-23', now: NOW, profileIds: ['p1', 'p2'] })

    const { where } = mockPrisma.profile.findMany.mock.calls[0][0]
    expect(where.id).toEqual({ in: ['p1', 'p2'] })
    expect(where.nearbySignupOptOut).toEqual({ is: null })
    expect(where.AND).toContainEqual({ user: { isActive: true, emailNotificationsOptIn: true } })
  })

  it('looks for new neighbours with the browse filter, blocklist, reference time and box', async () => {
    const lastDigest = new Date('2026-11-16T09:00:00Z')
    mockRun([recipient({ nearbySignupNotifications: [{ sentAt: lastDigest }] })], [])
    await sendNearbyDigests({ runDate: '2026-11-23', now: NOW })

    const { where } = mockPrisma.profile.findMany.mock.calls[1][0]
    const { lat: _lat, lon: _lon, ...visibleWithoutLocation } = socialVisibleWhere
    expect(where).toMatchObject({
      ...visibleWithoutLocation,
      blocklistFor: 'recipient',
      id: { not: 'recipient' },
      createdAt: { gt: lastDigest },
    })
    expect(where.lat).toEqual(boundingBox(BUDAPEST.lat, BUDAPEST.lon, 25).lat)
    expect(where.lon).toEqual(boundingBox(BUDAPEST.lat, BUDAPEST.lon, 25).lon)
  })

  it('emails and logs a recipient with at least 3 new people within 25 km', async () => {
    mockRun(
      [recipient()],
      [neighbour('a', 2), neighbour('b', 10), neighbour('c', 24), neighbour('far', 30)]
    )

    const count = await sendNearbyDigests({ runDate: '2026-11-23', now: NOW })

    expect(count).toBe(1)
    expect(mockNotifyLoadedUser).toHaveBeenCalledWith(
      { id: 'user-r', profile: { publicName: 'R' } },
      'nearby_digest',
      { path: '/browse', count: 3 },
      { dedupSuffix: '2026-11-23' }
    )
    expect(mockPrisma.nearbySignupNotification.create).toHaveBeenCalledWith({
      data: { profileId: 'recipient', newCount: 3, newProfileIds: ['a', 'b', 'c'] },
    })
  })

  it('dispatches the email before writing the log row', async () => {
    const order: string[] = []
    mockNotifyLoadedUser.mockImplementation(async () => order.push('dispatch'))
    mockPrisma.nearbySignupNotification.create.mockImplementation(async () => order.push('log'))
    mockRun([recipient()], [neighbour('a', 1), neighbour('b', 1), neighbour('c', 1)])

    await sendNearbyDigests({ runDate: '2026-11-23', now: NOW })

    expect(order).toEqual(['dispatch', 'log'])
  })

  it('skips a recipient with fewer than 3 new people nearby', async () => {
    mockRun([recipient()], [neighbour('a', 1), neighbour('b', 1), neighbour('far', 40)])

    expect(await sendNearbyDigests({ runDate: '2026-11-23', now: NOW })).toBe(0)
    expect(mockNotifyLoadedUser).not.toHaveBeenCalled()
  })

  it('skips a recipient who already got the maximum digests this spell', async () => {
    const sends = ['2026-11-16', '2026-11-09', '2026-11-02'].map((d) => ({
      sentAt: new Date(`${d}T09:00:00Z`),
    }))
    mockRun([recipient({ nearbySignupNotifications: sends })], [])

    expect(await sendNearbyDigests({ runDate: '2026-11-23', now: NOW })).toBe(0)
    // No neighbour query at all for a capped recipient.
    expect(mockPrisma.profile.findMany).toHaveBeenCalledTimes(1)
  })

  it('skips a profile without an activity summary', async () => {
    mockRun([recipient({ activitySummary: null })], [])

    expect(await sendNearbyDigests({ runDate: '2026-11-23', now: NOW })).toBe(0)
    expect(mockPrisma.profile.findMany).toHaveBeenCalledTimes(1)
  })

  it('reports but neither sends nor writes on a dry run', async () => {
    mockRun([recipient()], [neighbour('a', 1), neighbour('b', 1), neighbour('c', 1)])
    const onRecipient = vi.fn()

    const count = await sendNearbyDigests({
      runDate: '2026-11-23',
      now: NOW,
      dryRun: true,
      onRecipient,
    })

    expect(count).toBe(1)
    expect(onRecipient).toHaveBeenCalledWith('recipient', 3)
    expect(mockNotifyLoadedUser).not.toHaveBeenCalled()
    expect(mockPrisma.nearbySignupNotification.create).not.toHaveBeenCalled()
  })
})

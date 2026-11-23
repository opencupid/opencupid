import { prisma } from '@/lib/prisma'
import { haversineKm } from '@shared/maps'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { notBlockedUserWhere } from '@/db/includes/notBlockedUserWhere'
import { socialVisibleWhere } from './profileMatch.service'
import { notifierService } from './notifier.service'

/** A profile not seen for this long counts as dormant. */
export const DORMANT_DAYS = 30
/** New profiles within this straight-line distance count as nearby. */
export const RADIUS_KM = 25
/** Fewer new nearby profiles than this is not worth an email. */
export const MIN_NEW_PROFILES = 3
/** At most this many digests between two visits; a visit resets the count. */
export const MAX_SENDS_PER_SPELL = 3

const DAY_MS = 24 * 60 * 60 * 1000
const KM_PER_DEGREE_LAT = 111

/** Each email only counts people who joined after the last visit and the last digest. */
export function referenceTime(lastSeenAt: Date, sentAts: Date[]): Date {
  return new Date(Math.max(lastSeenAt.getTime(), ...sentAts.map((d) => d.getTime())))
}

/** Digests sent since the last visit. */
export function sendsThisSpell(lastSeenAt: Date, sentAts: Date[]): number {
  return sentAts.filter((d) => d > lastSeenAt).length
}

/** A lat/lon box around a point that contains every point within `km`; uses the (lat, lon) index. */
export function boundingBox(lat: number, lon: number, km: number) {
  const dLat = km / KM_PER_DEGREE_LAT
  const dLon = km / (KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180))
  return {
    lat: { gte: lat - dLat, lte: lat + dLat },
    lon: { gte: lon - dLon, lte: lon + dLon },
  }
}

async function findDormantRecipients(now: Date) {
  const profiles = await prisma.profile.findMany({
    where: {
      isActive: true,
      isOnboarded: true,
      isBlocked: false,
      lat: { not: null },
      lon: { not: null },
      AND: [notBlockedUserWhere, { user: { isActive: true, emailNotificationsOptIn: true } }],
      activitySummary: { lastSeenAt: { lt: new Date(now.getTime() - DORMANT_DAYS * DAY_MS) } },
      nearbySignupOptOut: { is: null },
    },
    include: {
      user: { include: { profile: { select: { publicName: true } } } },
      activitySummary: { select: { lastSeenAt: true } },
      nearbySignupNotifications: {
        select: { sentAt: true },
        orderBy: { sentAt: 'desc' },
        take: MAX_SENDS_PER_SPELL,
      },
    },
  })

  return profiles.flatMap((p) => {
    const lastSeenAt = p.activitySummary?.lastSeenAt
    if (!lastSeenAt || p.lat === null || p.lon === null) return []
    const sentAts = p.nearbySignupNotifications.map((n) => n.sentAt)
    if (sendsThisSpell(lastSeenAt, sentAts) >= MAX_SENDS_PER_SPELL) return []
    return [
      { id: p.id, lat: p.lat, lon: p.lon, user: p.user, since: referenceTime(lastSeenAt, sentAts) },
    ]
  })
}

type Recipient = Awaited<ReturnType<typeof findDormantRecipients>>[number]

/** Ids of profiles browse would show this recipient, created after `since`, within RADIUS_KM. */
async function newProfilesNear(recipient: Recipient): Promise<string[]> {
  const candidates = await prisma.profile.findMany({
    where: {
      ...socialVisibleWhere,
      ...blocklistWhereClause(recipient.id),
      id: { not: recipient.id },
      createdAt: { gt: recipient.since },
      // Replaces the filter's lat/lon not-null checks; a range excludes nulls too.
      ...boundingBox(recipient.lat, recipient.lon, RADIUS_KM),
    },
    select: { id: true, lat: true, lon: true },
  })
  return candidates
    .filter((c) => c.lat !== null && c.lon !== null)
    .filter((c) => haversineKm(recipient, { lat: c.lat!, lon: c.lon! }) <= RADIUS_KM)
    .map((c) => c.id)
}

export interface NearbyDigestRun {
  /** YYYY-MM-DD; part of each email's dispatch key so a same-day rerun sends nothing twice. */
  runDate: string
  now?: Date
  /** Log who would qualify without sending or writing anything. */
  dryRun?: boolean
  onRecipient?: (profileId: string, newCount: number) => Promise<void> | void
}

/**
 * Email dormant profiles about people who joined nearby since their last
 * visit or last digest. Emails go on the rate-limited bulk queue.
 *
 * Order per recipient: dispatch first, then the log row. If the job dies in
 * between, a same-day rerun selects the profile again; the email is dropped
 * by its jobId (completed jobs are kept for a day, see emailDispatcher.ts)
 * and the row gets written.
 *
 * @returns the number of qualifying recipients
 */
export async function sendNearbyDigests({
  runDate,
  now = new Date(),
  dryRun = false,
  onRecipient,
}: NearbyDigestRun): Promise<number> {
  const recipients = await findDormantRecipients(now)
  let qualified = 0

  for (const recipient of recipients) {
    const newProfileIds = await newProfilesNear(recipient)
    if (newProfileIds.length < MIN_NEW_PROFILES) continue
    qualified++

    if (!dryRun) {
      await notifierService.notifyLoadedUser(
        recipient.user,
        'nearby_digest',
        { path: '/browse', count: newProfileIds.length },
        { dedupSuffix: runDate }
      )
      await prisma.nearbySignupNotification.create({
        data: { profileId: recipient.id, newCount: newProfileIds.length, newProfileIds },
      })
    }
    await onRecipient?.(recipient.id, newProfileIds.length)
  }

  return qualified
}

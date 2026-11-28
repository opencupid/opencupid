import { prisma } from '@/lib/prisma'
import { DatingEligibleProfileSchema, type DatingEligibleProfile } from '@zod/profile/profile.db'
import { visibleProfileImages } from '@/api/mappers/profile.mappers'
import { areMutuallyCompatible } from './profileMatch.service'
import type { MessageWithSender } from './messaging.service'
import type { ConversationParticipantWithConversationSummary } from '@zod/messaging/messaging.dto'

type ProfileId = string | null | undefined

const eligibilityFields = {
  id: true,
  isDatingActive: true,
  birthday: true,
  gender: true,
  hasKids: true,
  prefAgeMin: true,
  prefAgeMax: true,
  prefGender: true,
  prefKids: true,
} as const

/**
 * Restricted photos in a two-person context (a like, a conversation) go to both
 * people or to neither: one payload serves both ends, so every profile in it is
 * filtered with the pair's eligibility, the rule GET /profiles/:id uses (both
 * dating, mutually compatible). Loads every profile of every pair in one query
 * and returns the check.
 */
export async function pairEligibility(
  pairs: readonly (readonly [ProfileId, ProfileId])[]
): Promise<(a: ProfileId, b: ProfileId) => boolean> {
  const ids = [...new Set(pairs.flat().filter((id): id is string => !!id))]
  const rows = ids.length
    ? await prisma.profile.findMany({ where: { id: { in: ids } }, select: eligibilityFields })
    : []
  const eligible = new Map<string, DatingEligibleProfile>()
  for (const row of rows) {
    const parsed = DatingEligibleProfileSchema.safeParse(row)
    if (parsed.success) eligible.set(row.id, parsed.data)
  }
  return (a, b) => {
    const pa = a ? eligible.get(a) : undefined
    const pb = b ? eligible.get(b) : undefined
    return !!pa && !!pb && a !== b && areMutuallyCompatible(pa, pb)
  }
}

/** The profile with its gallery cut to what `canSeeRestricted` allows. */
export function withVisibleImages<P extends { profileImages: { isRestricted: boolean }[] }>(
  profile: P,
  canSeeRestricted: boolean
): P {
  return {
    ...profile,
    profileImages: visibleProfileImages(profile.profileImages, canSeeRestricted),
  }
}

/**
 * Restricted photos in a conversation go to both people or to neither: the
 * galleries of both profiles are cut to the pair's eligibility, so a summary or
 * message can be sent to either participant.
 */
export async function grantSummaryImages<T extends ConversationParticipantWithConversationSummary>(
  rows: T[]
): Promise<T[]> {
  const isEligible = await pairEligibility(
    rows.map((r) => [r.conversation.profileAId, r.conversation.profileBId] as const)
  )
  return rows.map((row) => {
    const { profileA, profileB, profileAId, profileBId } = row.conversation
    const canSee = isEligible(profileAId, profileBId)
    return {
      ...row,
      conversation: {
        ...row.conversation,
        profileA: profileA && withVisibleImages(profileA, canSee),
        profileB: profileB && withVisibleImages(profileB, canSee),
      },
    }
  })
}

/** As grantSummaryImages, for messages: the sender's gallery, cut to the pair's eligibility. */
export async function grantMessageImages<T extends MessageWithSender>(messages: T[]): Promise<T[]> {
  const isEligible = await pairEligibility(
    messages.map((m) => [m.conversation.profileAId, m.conversation.profileBId] as const)
  )
  return messages.map((m) => {
    const canSee = isEligible(m.conversation.profileAId, m.conversation.profileBId)
    return m.sender ? { ...m, sender: withVisibleImages(m.sender, canSee) } : m
  })
}

export async function grantSummaryImage<T extends ConversationParticipantWithConversationSummary>(
  row: T | null
): Promise<T | null> {
  return row ? ((await grantSummaryImages([row]))[0] ?? null) : null
}

export async function grantMessageImage<T extends MessageWithSender>(message: T): Promise<T> {
  return (await grantMessageImages([message]))[0]!
}

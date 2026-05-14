import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { ConversationParticipantWithConversationSummary } from '@zod/messaging/messaging.dto'
import { Conversation } from '@zod/generated'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { appConfig } from '../lib/appconfig'
import { computeSendOutcome } from './messaging.stateMachine'

// Business-error codes raised from the messaging service / route handlers.
// HTTP status mapping is the route's responsibility — do not bake it in here.
export const MessagingErrorCodes = {
  CONVERSATION_BLOCKED: 'CONVERSATION_BLOCKED',
  EMPTY_MESSAGE: 'EMPTY_MESSAGE',
} as const

export type MessagingErrorCode = (typeof MessagingErrorCodes)[keyof typeof MessagingErrorCodes]

export class MessagingError extends Error {
  readonly code: MessagingErrorCode

  constructor(code: MessagingErrorCode, message: string) {
    super(message)
    this.name = 'MessagingError'
    this.code = code
  }
}

const conversationSummaryInclude = {
  conversation: {
    include: {
      // Pair identity lives on the Conversation row itself (profileA/profileB) so
      // the mapper can resolve the partner profile without depending on the
      // participants list — required because PENDING conversations have only the
      // sender as a participant until the trust flag clears.
      profileA: { include: { profileImages: { include: { image: true } } } },
      profileB: { include: { profileImages: { include: { image: true } } } },
      participants: {
        select: {
          profileId: true,
          isCallable: true,
          isMuted: true,
          isArchived: true,
          lastReadAt: true,
        },
      },
      messages: {
        take: 1,
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
    },
  },
}

export const messageWithSenderInclude = {
  sender: {
    select: {
      id: true,
      publicName: true,
      country: true,
      cityName: true,
      lat: true,
      lon: true,
      profileImages: {
        include: { image: true },
        orderBy: { image: { position: 'asc' } },
      },
    },
  },
  attachment: true,
} satisfies Prisma.MessageInclude

export type MessageWithSender = Prisma.MessageGetPayload<{
  include: typeof messageWithSenderInclude
}>

/**
 * Status allowlist for inbox-visible conversations. Allowlist (not denylist)
 * so a future ConversationStatus value defaults to invisible — any new state
 * must be explicitly opted into the inbox.
 */
const INBOX_VISIBLE_STATUSES = ['INITIATED', 'ACCEPTED', 'ARCHIVED'] as const

/**
 * Single source of truth for "is this conversation visible to this viewer?".
 *
 * Two arms, mutually exclusive by status:
 *
 * 1. Multi-participant active conversation: status in the allowlist AND the
 *    viewer is a participant AND there exists another participant who hasn't
 *    been blocked. The viewer-participant check is the access-control gate —
 *    it's redundant for `listConversationsForProfile` (whose outer
 *    `ConversationParticipant.findMany({ profileId })` already requires it)
 *    but load-bearing for `listMessagesForConversation`, which is callable
 *    with any conversationId by any authenticated user.
 * 2. Sender-only PENDING (single-direction quarantine): status PENDING AND the
 *    viewer is the initiator. PENDING convos by construction have only the
 *    initiator as a participant, so initiator-equality implies participation.
 *    Recipient is deliberately invisible — held messages aren't surfaced until
 *    promote.
 *
 * Both `listConversationsForProfile` and `listMessagesForConversation` route
 * through this so the visibility contract stays in one place.
 */
function inboxVisibleConversationWhere(viewerProfileId: string): Prisma.ConversationWhereInput {
  return {
    OR: [
      {
        status: { in: [...INBOX_VISIBLE_STATUSES] },
        AND: [
          { participants: { some: { profileId: viewerProfileId } } },
          {
            participants: {
              some: {
                profile: {
                  id: { not: viewerProfileId },
                  ...blocklistWhereClause(viewerProfileId),
                },
              },
            },
          },
        ],
      },
      { status: 'PENDING', initiatorProfileId: viewerProfileId },
    ],
  }
}

export class MessageService {
  private static instance: MessageService

  private constructor() {}

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService()
    }
    return MessageService.instance
  }

  /**
   * Retrieves a conversation summary for a given conversation and profile.
   * @param conversationId - The ID of the conversation to retrieve.
   * @param profileId - The ID of the profile to retrieve the summary for.
   * @returns A conversation participant with its summary or null if not found.
   */
  async getConversationSummary(
    conversationId: string,
    profileId: string
  ): Promise<ConversationParticipantWithConversationSummary | null> {
    return await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        profileId,
      },
      include: conversationSummaryInclude,
    })
  }

  /**
   * Lists all conversations for a given profile, including unread message counts.
   * @param profileId - The ID of the profile to list conversations for.
   * @returns An array of conversation summaries with unread message counts.
   */
  async listConversationsForProfile(profileId: string) {
    return await prisma.conversationParticipant.findMany({
      where: {
        profileId,
        conversation: inboxVisibleConversationWhere(profileId),
      },

      include: conversationSummaryInclude,
      orderBy: {
        conversation: {
          updatedAt: 'desc',
        },
      },
    })
  }

  /**
   * Lists all messages for a given conversation.
   * @param conversationId - The ID of the conversation to list messages for.
   * @returns An array of messages in the conversation, including sender profile images.
   */
  async listMessagesForConversation(
    conversationId: string,
    viewerProfileId: string,
    options?: { cursor?: string; take?: number }
  ) {
    const pageSize = options?.take ?? 10

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        conversation: inboxVisibleConversationWhere(viewerProfileId),
      },
      include: messageWithSenderInclude,
      orderBy: {
        createdAt: 'desc',
      },
      take: pageSize + 1,
      ...(options?.cursor
        ? {
            cursor: { id: options.cursor },
            skip: 1,
          }
        : {}),
    })

    const hasMore = messages.length > pageSize
    const page = hasMore ? messages.slice(0, pageSize) : messages
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null
    const orderedPage = [...page].reverse()

    return {
      messages: orderedPage,
      nextCursor,
      hasMore,
    }
  }

  /**
   * Marks a conversation as read
   * @param conversationId - The ID of the conversation to mark as read.
   * @param profileId - The ID of the profile marking the conversation as read.
   * @returns The updated conversation participant record.
   */
  async markConversationRead(conversationId: string, profileId: string) {
    return prisma.conversationParticipant.update({
      where: {
        profileId_conversationId: {
          profileId,
          conversationId,
        },
      },
      data: { lastReadAt: new Date() },
    })
  }

  /**
   * Sets conversation status to ACCEPTED when a match occurs between two profiles.
   * @param profileAId - The ID of the first profile.
   * @param profileBId - The ID of the second profile.
   * @returns The updated conversation or null if no conversation exists.
   */
  /**
   * Lookup predicate for "active conversation between this sorted pair". DISCARDED
   * tombstones are excluded — the partial unique index lets them coexist with a
   * fresh active conversation for the same pair, so every lookup that expects a
   * live row must filter them out.
   */
  private activeConversationWhere(sortedProfileAId: string, sortedProfileBId: string) {
    return {
      profileAId: sortedProfileAId,
      profileBId: sortedProfileBId,
      status: { not: 'DISCARDED' as const },
    }
  }

  async acceptConversationOnMatch(
    profileAId: string,
    profileBId: string
  ): Promise<Conversation | null> {
    const [sortedProfileAId, sortedProfileBId] = this.sortProfilePair(profileAId, profileBId)

    const existingConversation = await prisma.conversation.findFirst({
      where: this.activeConversationWhere(sortedProfileAId, sortedProfileBId),
    })

    if (!existingConversation) {
      return null
    }

    // Mutual engagement promotes both INITIATED (waiting on first reply) and
    // PENDING (held due to sender quarantine) to ACCEPTED. PENDING shares the
    // same legitimacy reasoning as the message-reply path's
    // `accept_and_promote_pending` outcome — see the decision record in
    // messaging.stateMachine.ts. BLOCKED/ARCHIVED stand: those represent the
    // recipient's explicit choice and outrank engagement signals. DISCARDED is
    // filtered upstream by activeConversationWhere.
    if (existingConversation.status !== 'INITIATED' && existingConversation.status !== 'PENDING') {
      return existingConversation
    }

    return await prisma.$transaction(async (tx) => {
      // Same composition as the accept_and_promote_pending route handler:
      // promoteConversation handles PENDING → INITIATED + recipient participant
      // insert (mirroring the trust-flag-clear path), then acceptConversationOnReply
      // takes INITIATED → ACCEPTED. Single source of truth for the participant
      // insert and the concurrent-transition status guards.
      if (existingConversation.status === 'PENDING') {
        const recipientId =
          existingConversation.profileAId === existingConversation.initiatorProfileId
            ? existingConversation.profileBId
            : existingConversation.profileAId
        await this.promoteConversation(tx, existingConversation.id, recipientId)
      }
      await this.acceptConversationOnReply(tx, existingConversation.id)

      return await tx.conversation.findUniqueOrThrow({ where: { id: existingConversation.id } })
    })
  }

  async sendMessage(
    tx: Prisma.TransactionClient,
    convoId: string,
    senderProfileId: string,
    content: string,
    messageType: string = 'text/plain',
    attachmentData?: {
      filePath: string
      mimeType: string
      fileSize?: number
      duration?: number
    }
  ): Promise<{ message: MessageWithSender; isDuplicate: boolean }> {
    const cleanContent = messageType === 'text/plain' ? content.trim() : content

    if (messageType === 'text/plain' && !cleanContent) {
      throw new MessagingError(MessagingErrorCodes.EMPTY_MESSAGE, 'Message content cannot be empty')
    }

    // Dedup: identical text content within 5s, text-only (attachments bypass dedup
    // because voice messages have empty content and would falsely match).
    if (messageType === 'text/plain' && !attachmentData) {
      const fiveSecondsAgo = new Date(Date.now() - 5000)
      const duplicate = await tx.message.findFirst({
        where: {
          conversationId: convoId,
          senderId: senderProfileId,
          content: cleanContent,
          messageType,
          createdAt: { gte: fiveSecondsAgo },
        },
        include: messageWithSenderInclude,
      })
      if (duplicate) return { message: duplicate, isDuplicate: true }
    }

    const message = await tx.message.create({
      data: {
        conversationId: convoId,
        senderId: senderProfileId,
        content: cleanContent,
        messageType,
        ...(attachmentData && { attachment: { create: attachmentData } }),
      },
      include: messageWithSenderInclude,
    })

    // Bump parent conversation so inbox ordering (listConversationsForProfile
    // orders by updatedAt DESC) reflects the new activity. Prisma @updatedAt
    // only fires on direct updates, so creating a Message row is not enough.
    await tx.conversation.update({
      where: { id: convoId },
      data: { updatedAt: new Date() },
    })

    return { message, isDuplicate: false }
  }

  async sendWelcomeMessage(recipientProfileId: string, locale: string) {
    const senderId = appConfig.ADMIN_PROFILE_ID
    if (!senderId) return
    // Only send when a template exists for the recipient's exact locale. We deliberately
    // do not fall back to another language: a welcome in the wrong language is worse
    // than no welcome at all.
    const template = await prisma.messageTemplate.findUnique({
      where: { type_locale: { type: 'welcome', locale } },
    })
    if (!template) return
    const content = simpleMarkdownToHtml(template.content)
    return await prisma.$transaction(async (tx) => {
      const { convo, wasCreated } = await this.resolveConversation(tx, senderId, recipientProfileId)
      // System welcome sender is never quarantined — hardcode `false`. NOT an admin
      // broadcast either: if a welcome already exists, we want the 'blocked' outcome
      // so the early-return below skips silently.
      const outcome = computeSendOutcome(convo, wasCreated, senderId, false, false)
      // If the welcome sender already has an INITIATED convo with this recipient
      // (own pending invite) or anything BLOCKED, skip silently — we never want
      // the welcome flow to enforce state-machine transitions or duplicate sends.
      if (outcome === 'blocked') return
      if (outcome === 'accepted_on_reply') {
        await this.acceptConversationOnReply(tx, convo.id)
      }
      await this.sendMessage(tx, convo.id, senderId, content, 'text/plain')
    })
  }

  async hasMutualLike(
    profileAId: string,
    profileBId: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<boolean> {
    const count = await tx.likedProfile.count({
      where: {
        OR: [
          { fromId: profileAId, toId: profileBId },
          { fromId: profileBId, toId: profileAId },
        ],
      },
    })
    return count === 2
  }

  /**
   * Looks up an existing active conversation between the viewer and a partner
   * profile, returning the same shape as `getConversationSummary` so the route
   * mapper produces an identical ConversationSummary. DISCARDED tombstones are
   * excluded via `activeConversationWhere`. Used by the resolve-or-draft
   * endpoint to decide between "return persisted" and "synthesize draft".
   */
  async findConversationSummaryByPartner(
    viewerProfileId: string,
    partnerProfileId: string
  ): Promise<ConversationParticipantWithConversationSummary | null> {
    const [profileAId, profileBId] = this.sortProfilePair(viewerProfileId, partnerProfileId)
    return await prisma.conversationParticipant.findFirst({
      where: {
        profileId: viewerProfileId,
        conversation: this.activeConversationWhere(profileAId, profileBId),
      },
      include: conversationSummaryInclude,
    })
  }

  async resolveConversation(
    tx: Prisma.TransactionClient,
    senderProfileId: string,
    recipientProfileId: string,
    opts: { createAsPending?: boolean } = {}
  ): Promise<{ convo: Conversation; wasCreated: boolean }> {
    const [profileAId, profileBId] = this.sortProfilePair(senderProfileId, recipientProfileId)

    const existing = await tx.conversation.findFirst({
      where: this.activeConversationWhere(profileAId, profileBId),
    })

    if (existing) return { convo: existing, wasCreated: false }

    const isMutualMatch = await this.hasMutualLike(profileAId, profileBId, tx)
    let status: 'PENDING' | 'INITIATED' | 'ACCEPTED'
    let participants
    if (opts.createAsPending && !isMutualMatch) {
      // Sender only; recipient added on promote.
      status = 'PENDING'
      participants = { create: [{ profileId: senderProfileId }] }
    } else if (opts.createAsPending && isMutualMatch) {
      // Mutual-match quarantine bypass: the recipient's prior like is opt-in to
      // contact, so the message is delivered as INITIATED instead of being held
      // PENDING. Stops short of ACCEPTED — that still requires an actual reply.
      status = 'INITIATED'
      participants = { create: [{ profileId: profileAId }, { profileId: profileBId }] }
    } else {
      status = isMutualMatch ? 'ACCEPTED' : 'INITIATED'
      participants = { create: [{ profileId: profileAId }, { profileId: profileBId }] }
    }

    try {
      const created = await tx.conversation.create({
        data: {
          status,
          initiatorProfileId: senderProfileId,
          profileAId,
          profileBId,
          participants,
        },
      })
      return { convo: created, wasCreated: true }
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err
      // Concurrent creation won the race — re-query and return the existing row.
      const existingAfterRace = await tx.conversation.findFirst({
        where: this.activeConversationWhere(profileAId, profileBId),
      })
      if (!existingAfterRace) {
        // P2002 without a row visible to this tx would indicate a real invariant breach.
        throw err
      }
      return { convo: existingAfterRace, wasCreated: false }
    }
  }

  /**
   * Best-effort PENDING → INITIATED promotion plus the missing participant row, atomic
   * with the caller's tx. count===0 is a silent no-op: the row was already promoted by
   * a peer, moved to DISCARDED by SPAM_BURST, blocked by the recipient, or never
   * existed — in every case the caller's intent is already satisfied or the row should
   * not be revived, so skipping the participant insert is the right behavior.
   *
   * createMany + skipDuplicates keeps participant insertion idempotent under worker
   * re-runs and route races (otherwise P2002 on @@unique([profileId, conversationId])).
   * Genuine read-write conflicts surface as 40001 at the outer SERIALIZABLE commit and
   * are handled by BullMQ retry — not by exceptions here.
   */
  async promoteConversation(
    tx: Prisma.TransactionClient,
    conversationId: string,
    missingParticipantId: string
  ): Promise<void> {
    const { count } = await tx.conversation.updateMany({
      where: { id: conversationId, status: 'PENDING' },
      data: { status: 'INITIATED', updatedAt: new Date() },
    })

    if (count === 0) {
      return
    }

    await tx.conversationParticipant.createMany({
      data: [{ conversationId, profileId: missingParticipantId }],
      skipDuplicates: true,
    })
  }

  async acceptConversationOnReply(tx: Prisma.TransactionClient, convoId: string): Promise<void> {
    // Best-effort INITIATED → ACCEPTED. The status predicate makes a concurrent
    // BLOCKED/DISCARDED/ACCEPTED winner a silent no-op rather than a clobber:
    // under READ COMMITTED the where-clause is evaluated at write time, so if
    // another tx already moved the row off INITIATED the count comes back 0
    // and we leave their state alone.
    await tx.conversation.updateMany({
      where: { id: convoId, status: 'INITIATED' },
      data: { status: 'ACCEPTED', updatedAt: new Date() },
    })
  }

  /**
   * Sorts a pair of profile IDs in a consistent order.
   * @param a
   * @param b
   * @returns
   */
  sortProfilePair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a]
  }
}

export type SendMessageSuccessResponse = {
  conversation: ConversationParticipantWithConversationSummary
  message: MessageWithSender
}

export type SendMessageErrorResponse = {
  success: false
  error: string
}

/*
Checks if the sender is allowed to reply to a conversation.
| Condition                                | Allow?                   |
| ---------------------------------------- | ------------------------ |
| status = `ACCEPTED`                      | ✅ Yes                    |
| status = `INITIATED`, sender ≠ initiator | ✅ Yes                    |
| status = `INITIATED`, sender = initiator | ❌ No (already initiated) |
| status = `BLOCKED` or anything else      | ❌ No                     |
*/
export function canSendMessageInConversation(
  conversation: Pick<Conversation, 'status' | 'initiatorProfileId'> | null,
  senderProfileId: string
): boolean {
  if (!conversation) return true // no conversation yet → allowed to start one

  return (
    conversation.status === 'ACCEPTED' ||
    (conversation.status === 'INITIATED' && conversation.initiatorProfileId !== senderProfileId)
  )
}

/** Welcome messages are stored as plain text; markdown rendering happens on the frontend. */
export function simpleMarkdownToHtml(input: string): string {
  return input
}

// Clean message content for email/notification display
// Strips markdown syntax, collapses whitespace, and truncates
export function cleanMessageForNotification(content: string, maxLength: number = 100): string {
  let cleaned = content
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
    .replace(/\*(.+?)\*/g, '$1') // *italic*
    .replace(/__(.+?)__/g, '$1') // __bold__
    .replace(/_(.+?)_/g, '$1') // _italic_
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url)

  // Loop tag stripping to handle nested fragments like <scr<script>ipt>
  let prev = ''
  while (prev !== cleaned) {
    prev = cleaned
    cleaned = cleaned.replace(/<[^>]*>/g, '')
  }

  cleaned = cleaned.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

  // Truncate at maxLength chars, breaking at word boundary
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength)
    // Find last space to break at word boundary
    const lastSpace = cleaned.lastIndexOf(' ')
    if (lastSpace > maxLength * 0.8) {
      // Only break at word if we're close enough
      cleaned = cleaned.substring(0, lastSpace)
    }
    cleaned += '...'
  }

  return cleaned
}

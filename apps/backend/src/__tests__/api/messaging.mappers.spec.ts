import { describe, it, expect, vi } from 'vitest'
import {
  mapMessageToDTO,
  mapConversationParticipantToSummary,
  mapAttachmentDTO,
} from '../../api/mappers/messaging.mappers'
vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: class {} }))
const { mockAppConfig } = vi.hoisted(() => ({
  mockAppConfig: {
    MEDIA_URL_BASE: '/user-content',
    ADMIN_PROFILE_ID: 'admin-profile',
    DATABASE_URL: 'postgresql://test',
  } as { MEDIA_URL_BASE: string; ADMIN_PROFILE_ID?: string; DATABASE_URL: string },
}))
vi.mock('@/lib/appconfig', () => ({
  get appConfig() {
    return mockAppConfig
  },
}))

const msg: any = {
  id: 'm1',
  conversationId: 'c1',
  senderId: 'p1',
  content: 'hi',
  createdAt: new Date(),
  messageType: 'text/plain',
  sender: { id: 'p1', publicName: 'Me', profileImages: [] },
  attachment: null,
  images: [],
}

const profileMe = { id: 'p1', publicName: 'Me', profileImages: [], isCallable: true }
const profileThem = { id: 'p2', publicName: 'Them', profileImages: [], isCallable: true }

const participant: any = {
  id: 'cp1',
  profileId: 'p1',
  conversationId: 'c1',
  lastReadAt: null,
  isMuted: false,
  isArchived: false,
  isCallable: true,
  conversation: {
    id: 'c1',
    updatedAt: new Date(),
    createdAt: new Date(),
    profileAId: 'p1',
    profileBId: 'p2',
    initiatorProfileId: 'p1',
    profileA: profileMe,
    profileB: profileThem,
    participants: [
      { profileId: 'p1', isCallable: true, isMuted: false, isArchived: false, lastReadAt: null },
      { profileId: 'p2', isCallable: true, isMuted: false, isArchived: false, lastReadAt: null },
    ],
    messages: [msg],
  },
}

describe('messaging mappers', () => {
  describe('mapMessageToDTO', () => {
    it('maps a message with sender to DTO', () => {
      const dto = mapMessageToDTO(msg)
      expect(dto.id).toBe('m1')
      expect(dto.sender.publicName).toBe('Me')
      expect(dto.attachment).toBeNull()
      expect(dto.images).toEqual([])
      expect(dto.isMine).toBeUndefined()
    })

    it('sets isMine true when senderId matches profileId', () => {
      const dto = mapMessageToDTO(msg, 'p1')
      expect(dto.isMine).toBe(true)
    })

    it('sets isMine false when senderId does not match profileId', () => {
      const dto = mapMessageToDTO(msg, 'p2')
      expect(dto.isMine).toBe(false)
    })

    it('maps attachment when present', () => {
      const msgWithAttachment = {
        ...msg,
        attachment: {
          id: 'a1',
          filePath: 'voice/p1/msg.webm',
          mimeType: 'audio/webm',
          fileSize: 1024,
          duration: 5,
          createdAt: new Date(),
        },
      }
      const dto = mapMessageToDTO(msgWithAttachment)
      expect(dto.attachment).not.toBeNull()
      expect(dto.attachment!.mimeType).toBe('audio/webm')
    })
  })

  it('maps participant to conversation summary', () => {
    const summary = mapConversationParticipantToSummary(participant, 'p1')
    expect(summary.partnerProfile.publicName).toBe('Them')
    expect(summary.lastMessage?.isMine).toBe(true)
  })

  describe('isCallable mapping', () => {
    it('returns isCallable true when partner profile and participant are callable', () => {
      const summary = mapConversationParticipantToSummary(participant, 'p1')
      expect(summary.isCallable).toBe(true)
      expect(summary.myIsCallable).toBe(true)
    })

    it('returns isCallable false when partner profile isCallable is false', () => {
      const p: any = {
        ...participant,
        conversation: {
          ...participant.conversation,
          profileB: { ...profileThem, isCallable: false },
        },
      }
      const summary = mapConversationParticipantToSummary(p, 'p1')
      expect(summary.isCallable).toBe(false)
    })

    it('returns isCallable false when partner participant isCallable is false', () => {
      const p: any = {
        ...participant,
        conversation: {
          ...participant.conversation,
          participants: [
            {
              profileId: 'p1',
              isCallable: true,
              isMuted: false,
              isArchived: false,
              lastReadAt: null,
            },
            {
              profileId: 'p2',
              isCallable: false,
              isMuted: false,
              isArchived: false,
              lastReadAt: null,
            },
          ],
        },
      }
      const summary = mapConversationParticipantToSummary(p, 'p1')
      expect(summary.isCallable).toBe(false)
    })

    it('returns myIsCallable false when my participant isCallable is false', () => {
      const p: any = {
        ...participant,
        conversation: {
          ...participant.conversation,
          participants: [
            {
              profileId: 'p1',
              isCallable: false,
              isMuted: false,
              isArchived: false,
              lastReadAt: null,
            },
            {
              profileId: 'p2',
              isCallable: true,
              isMuted: false,
              isArchived: false,
              lastReadAt: null,
            },
          ],
        },
      }
      const summary = mapConversationParticipantToSummary(p, 'p1')
      expect(summary.myIsCallable).toBe(false)
    })
  })

  describe('isAdminInitiator mapping', () => {
    it('returns false when initiator is a regular user', () => {
      const summary = mapConversationParticipantToSummary(participant, 'p1')
      expect(summary.isAdminInitiator).toBe(false)
    })

    it('returns true when initiator equals appConfig.ADMIN_PROFILE_ID', () => {
      const p: any = {
        ...participant,
        conversation: { ...participant.conversation, initiatorProfileId: 'admin-profile' },
      }
      const summary = mapConversationParticipantToSummary(p, 'p1')
      expect(summary.isAdminInitiator).toBe(true)
    })

    it('returns false when ADMIN_PROFILE_ID is unset, even if initiator is also undefined', () => {
      // Guards against undefined === undefined falsely matching every conversation.
      const previous = mockAppConfig.ADMIN_PROFILE_ID
      mockAppConfig.ADMIN_PROFILE_ID = undefined
      try {
        const p: any = {
          ...participant,
          conversation: { ...participant.conversation, initiatorProfileId: undefined },
        }
        const summary = mapConversationParticipantToSummary(p, 'p1')
        expect(summary.isAdminInitiator).toBe(false)
      } finally {
        mockAppConfig.ADMIN_PROFILE_ID = previous
      }
    })
  })

  describe('PENDING conversation (sender-only participant)', () => {
    // Regression: PENDING conversations omit the recipient's participant row.
    // The mapper must still resolve the partner via profileB and treat absent
    // participant state as "callable" (the !== false default).
    const pendingParticipant: any = {
      ...participant,
      conversation: {
        ...participant.conversation,
        participants: [
          {
            profileId: 'p1',
            isCallable: true,
            isMuted: false,
            isArchived: false,
            lastReadAt: null,
          },
        ],
      },
    }

    it('resolves partnerProfile from profileB when participant row is absent', () => {
      const summary = mapConversationParticipantToSummary(pendingParticipant, 'p1')
      expect(summary.partnerProfile.id).toBe('p2')
      expect(summary.partnerProfile.publicName).toBe('Them')
    })

    it('returns isCallable=true when partner has no participant state yet', () => {
      const summary = mapConversationParticipantToSummary(pendingParticipant, 'p1')
      expect(summary.isCallable).toBe(true)
    })
  })

  describe('mapAttachmentDTO', () => {
    it('returns clean URL for voice attachments (no query params)', () => {
      const attachment: any = {
        id: 'a1',
        filePath: 'voice/p1/msg-abc.webm',
        mimeType: 'audio/webm',
        fileSize: 1024,
        duration: 5,
        createdAt: new Date(),
      }
      const dto = mapAttachmentDTO(attachment)
      expect(dto.url).toBe('/user-content/voice/p1/msg-abc.webm')
    })

    it('returns clean URL for image attachments (no query params)', () => {
      const attachment: any = {
        id: 'a2',
        filePath: 'images/cmXXX/abc-card.webp',
        mimeType: 'image/webp',
        fileSize: 2048,
        duration: null,
        createdAt: new Date(),
      }
      const dto = mapAttachmentDTO(attachment)
      expect(dto.url).toBe('/user-content/images/cmXXX/abc-card.webp')
    })
  })
})

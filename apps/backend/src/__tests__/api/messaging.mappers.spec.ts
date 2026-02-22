import { describe, it, expect, vi } from 'vitest'
import {
  mapMessageDTO,
  mapMessageForMessageList,
  mapConversationParticipantToSummary,
  mapAttachmentDTO,
} from '../../api/mappers/messaging.mappers'
vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))
vi.mock('@shared/config/appconfig', () => ({
  appConfig: {
    MEDIA_URL_BASE: '/user-content',
    IMAGE_URL_HMAC_TTL_SECONDS: 3600,
    AUTH_IMG_HMAC_SECRET: 'test-secret',
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
}

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
    participants: [
      {
        profileId: 'p1',
        isCallable: true,
        profile: { id: 'p1', publicName: 'Me', profileImages: [], isCallable: true },
      },
      {
        profileId: 'p2',
        isCallable: true,
        profile: { id: 'p2', publicName: 'Them', profileImages: [], isCallable: true },
      },
    ],
    messages: [msg],
  },
}

describe('messaging mappers', () => {
  it('marks message as mine', () => {
    const m = mapMessageForMessageList(msg, 'p1')
    expect(m.isMine).toBe(true)
  })

  it('maps participant to conversation summary', () => {
    const summary = mapConversationParticipantToSummary(participant, 'p1')
    expect(summary.partnerProfile.publicName).toBe('Them')
    expect(summary.lastMessage?.isMine).toBe(true)
  })

  it('maps message dto with sender profile', () => {
    const dto = mapMessageDTO(msg, participant)
    expect(dto.sender.publicName).toBe('Me')
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
          participants: [
            {
              profileId: 'p1',
              isCallable: true,
              profile: { id: 'p1', publicName: 'Me', profileImages: [], isCallable: true },
            },
            {
              profileId: 'p2',
              isCallable: true,
              profile: { id: 'p2', publicName: 'Them', profileImages: [], isCallable: false },
            },
          ],
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
              profile: { id: 'p1', publicName: 'Me', profileImages: [], isCallable: true },
            },
            {
              profileId: 'p2',
              isCallable: false,
              profile: { id: 'p2', publicName: 'Them', profileImages: [], isCallable: true },
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
              profile: { id: 'p1', publicName: 'Me', profileImages: [], isCallable: true },
            },
            {
              profileId: 'p2',
              isCallable: true,
              profile: { id: 'p2', publicName: 'Them', profileImages: [], isCallable: true },
            },
          ],
        },
      }
      const summary = mapConversationParticipantToSummary(p, 'p1')
      expect(summary.myIsCallable).toBe(false)
    })
  })

  describe('mapAttachmentDTO', () => {
    it('uses HMAC-signed URL for voice attachments', () => {
      const attachment: any = {
        id: 'a1',
        filePath: 'voice/p1/msg-abc.webm',
        mimeType: 'audio/webm',
        fileSize: 1024,
        duration: 5,
        createdAt: new Date(),
      }
      const dto = mapAttachmentDTO(attachment)
      expect(dto.url).toMatch(/^\/user-content\/voice\/p1\/msg-abc\.webm\?exp=\d+&sig=[a-f0-9]+$/)
    })

    it('uses HMAC-signed URL for image attachments', () => {
      const attachment: any = {
        id: 'a2',
        filePath: 'images/cmXXX/abc-card.webp',
        mimeType: 'image/webp',
        fileSize: 2048,
        duration: null,
        createdAt: new Date(),
      }
      const dto = mapAttachmentDTO(attachment)
      expect(dto.url).toMatch(
        /^\/user-content\/images\/cmXXX\/abc-card\.webp\?exp=\d+&sig=[a-f0-9]+$/
      )
    })
  })
})

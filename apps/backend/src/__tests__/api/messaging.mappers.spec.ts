import { describe, it, expect, vi } from 'vitest'
import {
  mapMessageDTO,
  mapMessageForMessageList,
  mapConversationParticipantToSummary,
} from '../../api/mappers/messaging.mappers'
vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))
vi.mock('@shared/config/appconfig', () => ({ appConfig: { IMAGE_URL_BASE: 'http://img' } }))

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
})

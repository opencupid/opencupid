import { describe, it, expect, vi } from 'vitest'
import { mapMessageDTO, mapMessageForMessageList, mapConversationParticipantToSummary } from '../../api/mappers/messaging.mappers'
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
  conversation: {
    id: 'c1',
    updatedAt: new Date(),
    createdAt: new Date(),
    participants: [
      { profileId: 'p1', profile: { id: 'p1', publicName: 'Me', profileImages: [] } },
      { profileId: 'p2', profile: { id: 'p2', publicName: 'Them', profileImages: [] } },
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
})

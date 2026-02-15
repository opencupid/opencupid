import { describe, it, expect } from 'vitest'
import { mapInteractionContext } from '../../api/mappers/interaction.mappers'
import type { DbProfileWithContext } from '@zod/profile/profile.db'

function makeProfile(overrides: Partial<DbProfileWithContext> = {}): DbProfileWithContext {
  return {
    id: 'p1',
    likesReceived: [],
    likesSent: [],
    hiddenBy: [],
    conversationParticipants: [],
    blockedProfiles: [],
    ...overrides,
  } as any
}

describe('mapInteractionContext', () => {
  it('returns base context without dating when includeDatingContext is false', () => {
    const profile = makeProfile()
    const result = mapInteractionContext(profile, false)
    expect(result.haveConversation).toBe(false)
    expect(result.canMessage).toBe(true)
    expect(result.conversationId).toBeNull()
    expect(result.initiated).toBe(false)
    // dating defaults
    expect(result.likedByMe).toBe(false)
    expect(result.isMatch).toBe(false)
  })

  it('returns dating context when includeDatingContext is true with no interactions', () => {
    const profile = makeProfile()
    const result = mapInteractionContext(profile, true)
    expect(result.likedByMe).toBe(false)
    expect(result.passedByMe).toBe(false)
    expect(result.isMatch).toBe(false)
    expect(result.canLike).toBe(true)
    expect(result.canPass).toBe(true)
  })

  it('sets likedByMe when likesReceived has entries', () => {
    const profile = makeProfile({ likesReceived: [{ fromId: 'me' }] as any })
    const result = mapInteractionContext(profile, true)
    expect(result.likedByMe).toBe(true)
    expect(result.canLike).toBe(false)
  })

  it('detects a match when both like each other', () => {
    const profile = makeProfile({
      likesReceived: [{ fromId: 'me' }] as any,
      likesSent: [{ toId: 'me' }] as any,
    })
    const result = mapInteractionContext(profile, true)
    expect(result.isMatch).toBe(true)
  })

  it('sets passedByMe when hiddenBy has entries', () => {
    const profile = makeProfile({ hiddenBy: [{ fromId: 'me' }] as any })
    const result = mapInteractionContext(profile, true)
    expect(result.passedByMe).toBe(true)
    expect(result.canPass).toBe(false)
  })

  it('detects initiated conversation from the other profile', () => {
    const profile = makeProfile({
      id: 'p2',
      conversationParticipants: [{
        conversation: {
          id: 'conv1',
          status: 'INITIATED',
          initiatorProfileId: 'p1', // someone else initiated
        }
      }] as any,
    })
    const result = mapInteractionContext(profile, false)
    expect(result.initiated).toBe(true)
    expect(result.haveConversation).toBe(false)
  })

  it('detects existing conversation (not initiated)', () => {
    const profile = makeProfile({
      id: 'p1',
      conversationParticipants: [{
        conversation: {
          id: 'conv1',
          status: 'ACCEPTED',
          initiatorProfileId: 'p1', // I initiated
        }
      }] as any,
    })
    const result = mapInteractionContext(profile, false)
    expect(result.initiated).toBe(false)
    expect(result.haveConversation).toBe(true)
    expect(result.conversationId).toBe('conv1')
  })
})

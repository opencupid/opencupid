import { describe, it, expect } from 'vitest'
import { mapInteractionContext } from '../../api/mappers/interaction.mappers'
import type { DbProfileWithContext } from '@zod/profile/profile.db'

const VIEWER_ID = 'me'

function makeProfile(overrides: Partial<DbProfileWithContext> = {}): DbProfileWithContext {
  return {
    id: 'p1',
    likesReceived: [],
    likesSent: [],
    hiddenBy: [],
    conversationAsA: [],
    conversationAsB: [],
    blockedProfiles: [],
    ...overrides,
  } as any
}

describe('mapInteractionContext', () => {
  it('returns base context without dating when includeDatingContext is false', () => {
    const profile = makeProfile()
    const result = mapInteractionContext(profile, false, VIEWER_ID)
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
    const result = mapInteractionContext(profile, true, VIEWER_ID)
    expect(result.likedByMe).toBe(false)
    expect(result.passedByMe).toBe(false)
    expect(result.isMatch).toBe(false)
    expect(result.canLike).toBe(true)
    expect(result.canPass).toBe(true)
  })

  it('sets likedByMe when likesReceived has entries', () => {
    const profile = makeProfile({
      likesReceived: [{ fromId: 'me', isAnonymous: true }] as any,
    })
    const result = mapInteractionContext(profile, true, VIEWER_ID)
    expect(result.likedByMe).toBe(true)
    expect(result.canLike).toBe(false)
    expect(result.isAnonymous).toBe(true)
  })

  it('returns isAnonymous false when like is revealed', () => {
    const profile = makeProfile({
      likesReceived: [{ fromId: 'me', isAnonymous: false }] as any,
    })
    const result = mapInteractionContext(profile, true, VIEWER_ID)
    expect(result.isAnonymous).toBe(false)
  })

  it('sets likedMeRevealed true when they liked me non-anonymously', () => {
    const profile = makeProfile({
      likesSent: [{ toId: 'me', isAnonymous: false }] as any,
    })
    const result = mapInteractionContext(profile, true, VIEWER_ID)
    expect(result.likedMeRevealed).toBe(true)
  })

  it('sets likedMeRevealed false when they liked me anonymously', () => {
    const profile = makeProfile({
      likesSent: [{ toId: 'me', isAnonymous: true }] as any,
    })
    const result = mapInteractionContext(profile, true, VIEWER_ID)
    expect(result.likedMeRevealed).toBe(false)
  })

  it('detects a match when both like each other', () => {
    const profile = makeProfile({
      likesReceived: [{ fromId: 'me' }] as any,
      likesSent: [{ toId: 'me' }] as any,
    })
    const result = mapInteractionContext(profile, true, VIEWER_ID)
    expect(result.isMatch).toBe(true)
  })

  it('sets passedByMe when hiddenBy has entries', () => {
    const profile = makeProfile({ hiddenBy: [{ fromId: 'me' }] as any })
    const result = mapInteractionContext(profile, true, VIEWER_ID)
    expect(result.passedByMe).toBe(true)
    expect(result.canPass).toBe(false)
  })

  it('detects initiated conversation from the other profile', () => {
    const profile = makeProfile({
      id: 'p2',
      conversationAsA: [
        {
          id: 'conv1',
          status: 'INITIATED',
          initiatorProfileId: 'p1', // someone else initiated
        },
      ] as any,
    })
    const result = mapInteractionContext(profile, false, 'p1')
    expect(result.initiated).toBe(true)
    expect(result.haveConversation).toBe(false)
  })

  it('treats PENDING-as-sender like INITIATED-as-sender (initiated=true, canMessage=false)', () => {
    // A quarantined sender's first message creates a PENDING conversation.
    // From the sender's UX perspective this is the same state as INITIATED
    // ("I sent, waiting for the other side") — quarantine is a backend
    // implementation detail. The mapper must produce the same canMessage gate
    // as INITIATED-by-self so the GUI greys out the message button.
    const profile = makeProfile({
      id: 'p2',
      conversationAsA: [
        {
          id: 'conv-pending',
          status: 'PENDING',
          initiatorProfileId: 'p1', // viewer p1 initiated; held due to p1's quarantine
        },
      ] as any,
    })
    const result = mapInteractionContext(profile, false, 'p1')
    expect(result.initiated).toBe(true)
    expect(result.canMessage).toBe(false)
    expect(result.conversationId).toBe('conv-pending')
    expect(result.haveConversation).toBe(false)
  })

  it('treats conversation with null initiatorProfileId as not initiated (deleted account)', () => {
    const profile = makeProfile({
      id: 'p2',
      conversationAsA: [
        {
          id: 'conv-orphan',
          status: 'INITIATED',
          initiatorProfileId: null, // initiator's account was deleted
        },
      ] as any,
    })
    const result = mapInteractionContext(profile, false, VIEWER_ID)
    expect(result.initiated).toBe(false)
  })

  it('detects existing conversation (not initiated)', () => {
    const profile = makeProfile({
      id: 'p1',
      conversationAsA: [
        {
          id: 'conv1',
          status: 'ACCEPTED',
          initiatorProfileId: 'p1', // I initiated
        },
      ] as any,
    })
    const result = mapInteractionContext(profile, false, 'p2')
    expect(result.initiated).toBe(false)
    expect(result.haveConversation).toBe(true)
    expect(result.conversationId).toBe('conv1')
  })

  it('returns inert conversation context when target profile is the viewer (self-view)', () => {
    // Regression: when the viewer opens their own public profile, the include
    // would otherwise surface unrelated conversations of theirs. The mapper
    // must not treat that as a messageable target — there is no "message
    // yourself" operation. Belt & suspenders for the route's self-view 404.
    const profile = makeProfile({
      id: VIEWER_ID,
      conversationAsA: [
        {
          id: 'conv-with-someone-else',
          status: 'INITIATED',
          initiatorProfileId: VIEWER_ID,
        },
      ] as any,
    })
    const result = mapInteractionContext(profile, false, VIEWER_ID)
    expect(result.canMessage).toBe(false)
    expect(result.conversationId).toBeNull()
    expect(result.haveConversation).toBe(false)
    expect(result.initiated).toBe(false)
  })
})

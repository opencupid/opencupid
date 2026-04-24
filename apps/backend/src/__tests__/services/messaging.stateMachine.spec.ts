import { describe, it, expect } from 'vitest'
import { computeSendOutcome } from '../../services/messaging.stateMachine'

function convo(status: any, initiatorProfileId: string) {
  return { status, initiatorProfileId }
}

describe('computeSendOutcome', () => {
  it('wasCreated + quarantined → pending', () => {
    expect(computeSendOutcome(convo('PENDING', 'alice'), true, 'alice', true)).toBe('pending')
  })

  it('wasCreated + not quarantined → new_conversation', () => {
    expect(computeSendOutcome(convo('INITIATED', 'alice'), true, 'alice', false)).toBe(
      'new_conversation'
    )
  })

  it('existing PENDING, sender = initiator → pending (regardless of quarantine)', () => {
    expect(computeSendOutcome(convo('PENDING', 'alice'), false, 'alice', true)).toBe('pending')
    expect(computeSendOutcome(convo('PENDING', 'alice'), false, 'alice', false)).toBe('pending')
  })

  it('existing PENDING, sender ≠ initiator → accept_and_promote_pending', () => {
    expect(computeSendOutcome(convo('PENDING', 'alice'), false, 'bob', false)).toBe(
      'accept_and_promote_pending'
    )
  })

  it('existing INITIATED, sender ≠ initiator → accepted_on_reply', () => {
    expect(computeSendOutcome(convo('INITIATED', 'alice'), false, 'bob', false)).toBe(
      'accepted_on_reply'
    )
  })

  it('existing ACCEPTED → reply', () => {
    expect(computeSendOutcome(convo('ACCEPTED', 'alice'), false, 'alice', false)).toBe('reply')
    expect(computeSendOutcome(convo('ACCEPTED', 'alice'), false, 'bob', false)).toBe('reply')
  })

  it('existing INITIATED, sender = initiator → blocked', () => {
    expect(computeSendOutcome(convo('INITIATED', 'alice'), false, 'alice', false)).toBe('blocked')
  })

  it('BLOCKED / ARCHIVED / DISCARDED → blocked', () => {
    expect(computeSendOutcome(convo('BLOCKED', 'alice'), false, 'alice', false)).toBe('blocked')
    expect(computeSendOutcome(convo('ARCHIVED', 'alice'), false, 'alice', false)).toBe('blocked')
    expect(computeSendOutcome(convo('DISCARDED', 'alice'), false, 'alice', false)).toBe('blocked')
  })
})

import { describe, it, expect } from 'vitest'
import { computeSendOutcome } from '../../services/messaging.stateMachine'

function convo(status: any, initiatorProfileId: string) {
  return { status, initiatorProfileId }
}

describe('computeSendOutcome', () => {
  it('wasCreated + quarantined → pending', () => {
    expect(computeSendOutcome(convo('PENDING', 'alice'), true, 'alice', true, false)).toBe(
      'pending'
    )
  })

  it('wasCreated + not quarantined → new_conversation', () => {
    expect(computeSendOutcome(convo('INITIATED', 'alice'), true, 'alice', false, false)).toBe(
      'new_conversation'
    )
  })

  it('existing PENDING, sender = initiator → pending (regardless of quarantine)', () => {
    expect(computeSendOutcome(convo('PENDING', 'alice'), false, 'alice', true, false)).toBe(
      'pending'
    )
    expect(computeSendOutcome(convo('PENDING', 'alice'), false, 'alice', false, false)).toBe(
      'pending'
    )
  })

  it('existing PENDING, sender ≠ initiator → accept_and_promote_pending (regardless of quarantine)', () => {
    // Mutual engagement promotes: when the recipient sends back into the sender's
    // PENDING, the conversation flips to ACCEPTED via accept_and_promote_pending,
    // even when the recipient is also quarantined. Engagement is treated as a
    // legitimacy signal that overrides individual quarantine.
    expect(computeSendOutcome(convo('PENDING', 'alice'), false, 'bob', false, false)).toBe(
      'accept_and_promote_pending'
    )
    expect(computeSendOutcome(convo('PENDING', 'alice'), false, 'bob', true, false)).toBe(
      'accept_and_promote_pending'
    )
  })

  it('existing INITIATED, sender ≠ initiator → accepted_on_reply', () => {
    expect(computeSendOutcome(convo('INITIATED', 'alice'), false, 'bob', false, false)).toBe(
      'accepted_on_reply'
    )
  })

  it('existing ACCEPTED → reply', () => {
    expect(computeSendOutcome(convo('ACCEPTED', 'alice'), false, 'alice', false, false)).toBe(
      'reply'
    )
    expect(computeSendOutcome(convo('ACCEPTED', 'alice'), false, 'bob', false, false)).toBe(
      'reply'
    )
  })

  it('existing INITIATED, sender = initiator, NOT admin → blocked', () => {
    expect(computeSendOutcome(convo('INITIATED', 'alice'), false, 'alice', false, false)).toBe(
      'blocked'
    )
  })

  it('BLOCKED / ARCHIVED / DISCARDED → blocked', () => {
    expect(computeSendOutcome(convo('BLOCKED', 'alice'), false, 'alice', false, false)).toBe(
      'blocked'
    )
    expect(computeSendOutcome(convo('ARCHIVED', 'alice'), false, 'alice', false, false)).toBe(
      'blocked'
    )
    expect(computeSendOutcome(convo('DISCARDED', 'alice'), false, 'alice', false, false)).toBe(
      'blocked'
    )
  })

  describe('isAdminBroadcast capability (#1377)', () => {
    // Override semantics: admin-broadcast bypasses the self-initiated INITIATED
    // anti-spam rule, but does NOT override BLOCKED/ARCHIVED/DISCARDED — those
    // represent recipient choices that admin must respect.

    it('existing INITIATED, sender = initiator, isAdminBroadcast → reply (override)', () => {
      expect(computeSendOutcome(convo('INITIATED', 'alice'), false, 'alice', false, true)).toBe(
        'reply'
      )
    })

    it('does NOT override BLOCKED, even when isAdminBroadcast', () => {
      expect(computeSendOutcome(convo('BLOCKED', 'alice'), false, 'alice', false, true)).toBe(
        'blocked'
      )
    })

    it('does NOT override ARCHIVED, even when isAdminBroadcast', () => {
      expect(computeSendOutcome(convo('ARCHIVED', 'alice'), false, 'alice', false, true)).toBe(
        'blocked'
      )
    })

    it('does NOT override DISCARDED, even when isAdminBroadcast', () => {
      expect(computeSendOutcome(convo('DISCARDED', 'alice'), false, 'alice', false, true)).toBe(
        'blocked'
      )
    })

    it('does NOT alter non-blocked outcomes', () => {
      // Unchanged: ACCEPTED is still 'reply', whether or not admin.
      expect(computeSendOutcome(convo('ACCEPTED', 'alice'), false, 'alice', false, true)).toBe(
        'reply'
      )
      // Unchanged: PENDING-by-initiator is still 'pending'.
      expect(computeSendOutcome(convo('PENDING', 'alice'), false, 'alice', false, true)).toBe(
        'pending'
      )
      // Unchanged: new conversation creation still wins over the override branch.
      expect(computeSendOutcome(convo('INITIATED', 'alice'), true, 'alice', false, true)).toBe(
        'new_conversation'
      )
    })

    it('admin broadcast as recipient of user-initiated INITIATED → accepted_on_reply', () => {
      // The override only applies to self-initiated INITIATED. When the admin
      // sender is the *recipient* of a user-initiated INITIATED (e.g. user
      // messaged the welcome sender first and got no reply), the regular reply
      // semantic wins — isAdminBroadcast is not consulted on this branch.
      expect(computeSendOutcome(convo('INITIATED', 'alice'), false, 'bob', false, true)).toBe(
        'accepted_on_reply'
      )
    })
  })
})

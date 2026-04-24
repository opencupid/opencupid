import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type {
  InteractionEdge,
  InteractionEdgePair,
  ReceivedLike,
} from '@zod/interaction/interaction.dto'
import type { ProfileSummary } from '@zod/profile/profile.dto'

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

const mockBus = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: async <T>(fn: () => Promise<T>) => fn(),
}))

vi.mock('@/lib/bus', () => ({
  bus: mockBus,
}))

import { useInteractionStore } from '../useInteractionStore'

const SELF_ID = 'self-profile-id'
const OTHER_ID = 'other-profile-id'

function profile(id: string, publicName: string): ProfileSummary {
  return {
    id,
    publicName,
    profileImages: [],
    location: { country: '' },
  }
}

function edge(p: ProfileSummary, isMatch: boolean): InteractionEdge {
  return {
    profile: p,
    isMatch,
    isNew: true,
    isAnonymous: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function pair(isMatch: boolean): InteractionEdgePair {
  return {
    isMatch,
    from: edge(profile(SELF_ID, 'Me'), isMatch),
    to: edge(profile(OTHER_ID, 'Other'), isMatch),
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockApi.post.mockReset()
})

describe('useInteractionStore.sendLike', () => {
  it('on a non-match, pushes the TARGET into sent (not the initiator)', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true, pair: pair(false) } })
    const store = useInteractionStore()

    const res = await store.sendLike(OTHER_ID, false)

    expect(res.success).toBe(true)
    expect(store.sent).toHaveLength(1)
    expect(store.sent[0]?.profile.id).toBe(OTHER_ID)
    expect(store.matches).toHaveLength(0)
  })

  it('on a match, pushes the TARGET into matches (not the initiator)', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true, pair: pair(true) } })
    const store = useInteractionStore()

    const res = await store.sendLike(OTHER_ID, false)

    expect(res.success).toBe(true)
    expect(store.matches).toHaveLength(1)
    expect(store.matches[0]?.profile.id).toBe(OTHER_ID)
    expect(store.matches[0]?.isMatch).toBe(true)
    expect(store.sent).toHaveLength(0)
  })

  it('on a match, increments newMatchesCount for the initiator', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true, pair: pair(true) } })
    const store = useInteractionStore()
    expect(store.newMatchesCount).toBe(0)

    await store.sendLike(OTHER_ID, false)

    expect(store.newMatchesCount).toBe(1)
  })

  it('on a match, removes the now-mutual entry from receivedLikes', async () => {
    const stalePending: ReceivedLike = {
      profile: profile(OTHER_ID, 'Other'),
      isMatch: false,
      isNew: true,
      isAnonymous: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const unrelatedPending: ReceivedLike = {
      profile: profile('someone-else', 'Stranger'),
      isMatch: false,
      isNew: true,
      isAnonymous: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    mockApi.post.mockResolvedValueOnce({ data: { success: true, pair: pair(true) } })
    const store = useInteractionStore()
    store.receivedLikes = [stalePending, unrelatedPending]

    await store.sendLike(OTHER_ID, false)

    expect(store.receivedLikes).toHaveLength(1)
    expect(store.receivedLikes[0]?.profile?.id).toBe('someone-else')
  })

  it('on a non-match, leaves receivedLikes untouched', async () => {
    const pending: ReceivedLike = {
      profile: profile(OTHER_ID, 'Other'),
      isMatch: false,
      isNew: true,
      isAnonymous: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    mockApi.post.mockResolvedValueOnce({ data: { success: true, pair: pair(false) } })
    const store = useInteractionStore()
    store.receivedLikes = [pending]

    await store.sendLike(OTHER_ID, false)

    expect(store.receivedLikes).toHaveLength(1)
  })
})

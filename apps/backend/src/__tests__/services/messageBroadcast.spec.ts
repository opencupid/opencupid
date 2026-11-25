import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isConversationArchived: vi.fn(),
  broadcastToProfile: vi.fn(),
}))

vi.mock('../../services/messaging.service', () => ({
  MessageService: { getInstance: () => mocks },
}))
vi.mock('../../utils/wsUtils', () => ({ broadcastToProfile: mocks.broadcastToProfile }))

import { broadcastNewMessage } from '../../services/messageBroadcast'

const fastify = {} as any
const message = { id: 'm1', conversationId: 'c1', senderId: 'p1' } as any

describe('broadcastNewMessage', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    { isArchived: false, isDelivered: true },
    { isArchived: true, isDelivered: true },
    { isArchived: true, isDelivered: false },
  ])("carries the recipient's own archived state: %o", async ({ isArchived, isDelivered }) => {
    mocks.isConversationArchived.mockResolvedValue(isArchived)
    mocks.broadcastToProfile.mockReturnValue(isDelivered)

    expect(await broadcastNewMessage(fastify, 'p2', message)).toEqual({ isDelivered, isArchived })

    expect(mocks.isConversationArchived).toHaveBeenCalledWith('c1', 'p2')
    expect(mocks.broadcastToProfile).toHaveBeenCalledWith(fastify, 'p2', {
      type: 'ws:new_message',
      payload: { ...message, isArchived },
    })
  })
})

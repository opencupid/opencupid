import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../queues/activityFlushQueue', () => ({
  enqueueActivity: vi.fn().mockResolvedValue(undefined),
}))

import { recordActivity } from '../../services/activity.service'
import { enqueueActivity } from '../../queues/activityFlushQueue'

const mockedEnqueue = vi.mocked(enqueueActivity)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('recordActivity', () => {
  it('enqueues the profileId', async () => {
    await recordActivity('profile-abc')
    expect(mockedEnqueue).toHaveBeenCalledWith('profile-abc')
  })

  it('does not throw if enqueue fails', async () => {
    mockedEnqueue.mockRejectedValueOnce(new Error('redis down'))
    await expect(recordActivity('profile-abc')).resolves.not.toThrow()
  })
})

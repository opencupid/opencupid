import { describe, it, expect, vi } from 'vitest'

const calls: string[] = []

vi.mock('../../services/activityDistill.service', () => ({
  distillActivitySegments: vi.fn(async () => {
    calls.push('distill')
  }),
}))
vi.mock('../../services/profileVisibility.service', () => ({
  syncHiddenFromResults: vi.fn(async () => {
    calls.push('sync')
  }),
}))

import { processActivityDistillJob } from '../../workers/activityWorker'

describe('processActivityDistillJob', () => {
  it('syncs profile visibility after the distill', async () => {
    await processActivityDistillJob()

    expect(calls).toEqual(['distill', 'sync'])
  })
})

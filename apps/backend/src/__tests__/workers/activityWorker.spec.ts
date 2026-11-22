import { describe, it, expect, vi } from 'vitest'

vi.mock('../../services/activityDistill.service', () => ({
  distillActivitySegments: vi.fn(),
}))

import { processActivityDistillJob } from '../../workers/activityWorker'
import { distillActivitySegments } from '../../services/activityDistill.service'

describe('processActivityDistillJob', () => {
  it('distills activity segments', async () => {
    await processActivityDistillJob()

    expect(distillActivitySegments).toHaveBeenCalled()
  })
})

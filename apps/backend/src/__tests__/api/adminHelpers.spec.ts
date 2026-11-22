import { describe, it, expect } from 'vitest'
import { fillZeroDaysSplit } from '../../api/adminHelpers'

describe('fillZeroDaysSplit', () => {
  it('returns every day with every key, zero-filling missing days', () => {
    const days = ['2026-11-20', '2026-11-21', '2026-11-22']
    const rows = [{ date: '2026-11-21', sent: BigInt(3), received: BigInt(1) }]

    expect(fillZeroDaysSplit(rows, days, ['sent', 'received'])).toEqual([
      { date: '2026-11-20', sent: 0, received: 0 },
      { date: '2026-11-21', sent: 3, received: 1 },
      { date: '2026-11-22', sent: 0, received: 0 },
    ])
  })

  it('ignores rows outside the requested days', () => {
    const rows = [{ date: '2026-01-01', initiated: BigInt(5), joined: BigInt(5) }]
    expect(fillZeroDaysSplit(rows, ['2026-11-22'], ['initiated', 'joined'])).toEqual([
      { date: '2026-11-22', initiated: 0, joined: 0 },
    ])
  })
})

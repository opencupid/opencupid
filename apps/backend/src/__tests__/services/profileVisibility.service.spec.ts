import { describe, it, expect, vi } from 'vitest'

import { computeHiddenFromResults } from '../../services/profileVisibility.service'

function txWithIntro(intro: { id: string } | null) {
  return { localizedProfileField: { findFirst: vi.fn().mockResolvedValue(intro) } }
}

describe('computeHiddenFromResults', () => {
  it('hides a profile with no face and no intro', async () => {
    const tx = txWithIntro(null)

    expect(await computeHiddenFromResults(tx as never, 'p1', false)).toBe(true)
    expect(tx.localizedProfileField.findFirst).toHaveBeenCalledWith({
      where: { profileId: 'p1', field: { in: ['introSocial', 'introDating'] }, value: { not: '' } },
      select: { id: true },
    })
  })

  it('shows a profile with no face but an intro in some language', async () => {
    expect(await computeHiddenFromResults(txWithIntro({ id: 'f1' }) as never, 'p1', false)).toBe(
      false
    )
  })

  it('shows a profile with a face without looking at intros', async () => {
    const tx = txWithIntro(null)

    expect(await computeHiddenFromResults(tx as never, 'p1', true)).toBe(false)
    expect(tx.localizedProfileField.findFirst).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi } from 'vitest'

import { syncProfileHiddenFromResults } from '../../services/profileVisibility.service'

describe('syncProfileHiddenFromResults', () => {
  it('recomputes the flag for one profile from hasFace and the intro fields', async () => {
    const tx = { $executeRaw: vi.fn() }

    await syncProfileHiddenFromResults(tx as never, 'p1')

    const [strings, profileId] = tx.$executeRaw.mock.calls[0]
    const sql = (strings as string[]).join('?')
    expect(sql).toContain('SET "isHiddenFromResults" = NOT p."hasFace" AND NOT EXISTS')
    expect(sql).toContain(`f."field" IN ('introSocial', 'introDating')`)
    expect(sql).toContain(`btrim(f."value") <> ''`)
    expect(sql).not.toContain('lastSeenAt')
    expect(profileId).toBe('p1')
  })
})

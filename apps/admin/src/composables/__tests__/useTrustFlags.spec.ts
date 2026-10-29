import { describe, it, expect, vi } from 'vitest'

vi.mock('../useApi', () => ({ apiRequest: vi.fn() }))

import { flagOrigin } from '../useTrustFlags'

describe('flagOrigin', () => {
  it('maps flaggedBy prefixes to origins', () => {
    expect(flagOrigin('admin:manual')).toBe('admin')
    expect(flagOrigin('heuristic:spam_burst')).toBe('heuristic')
    expect(flagOrigin('system:profile_create')).toBe('system')
  })

  it('treats any other writer as system', () => {
    expect(flagOrigin('unknown')).toBe('system')
  })
})

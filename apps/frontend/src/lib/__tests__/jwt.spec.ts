import { describe, expect, it } from 'vitest'
import { parseJwtPayload } from '../jwt'

describe('parseJwtPayload', () => {
  it('returns the claims', () => {
    const claims = { userId: 'u1', profileId: 'p1', tokenVersion: 0, pending: true }
    expect(parseJwtPayload(`header.${btoa(JSON.stringify(claims))}.signature`)).toEqual(claims)
  })

  it.each(['', 'no-dots', 'header.not-base64!.signature', `header.${btoa('not json')}.signature`])(
    'returns null for a malformed token (%j)',
    (token) => {
      expect(parseJwtPayload(token)).toBeNull()
    }
  )
})

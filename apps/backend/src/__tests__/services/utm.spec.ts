import { describe, expect, it } from 'vitest'
import { withUtm } from '../../services/email/utm'

describe('withUtm', () => {
  it('adds source, medium and campaign', () => {
    const url = new URL(withUtm('https://frontend.test/inbox', 'new_message'))
    expect(url.origin + url.pathname).toBe('https://frontend.test/inbox')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: 'notification',
      utm_medium: 'email',
      utm_campaign: 'new_message',
    })
  })

  it('keeps an existing query and hash', () => {
    const url = new URL(withUtm('https://frontend.test/posts/p1?tab=replies#c2', 'new_like'))
    expect(url.searchParams.get('tab')).toBe('replies')
    expect(url.searchParams.get('utm_campaign')).toBe('new_like')
    expect(url.hash).toBe('#c2')
  })

  it('overwrites rather than duplicates existing utm keys', () => {
    const url = new URL(withUtm('https://frontend.test/browse?utm_campaign=old', 'nearby_digest'))
    expect(url.searchParams.getAll('utm_campaign')).toEqual(['nearby_digest'])
  })
})

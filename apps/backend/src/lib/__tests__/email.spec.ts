import { describe, it, expect } from 'vitest'
import { canonicalizeEmail } from '../email'

describe('canonicalizeEmail', () => {
  it('trims and lowercases all domains', () => {
    expect(canonicalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com')
  })

  it('preserves dots for non-Gmail domains', () => {
    expect(canonicalizeEmail('foo.bar@example.com')).toBe('foo.bar@example.com')
  })

  it('strips dots in the local part for gmail.com', () => {
    expect(canonicalizeEmail('j.smith@gmail.com')).toBe('jsmith@gmail.com')
  })

  it('strips +suffix in the local part for gmail.com', () => {
    expect(canonicalizeEmail('jsmith+netflix@gmail.com')).toBe('jsmith@gmail.com')
  })

  it('preserves +suffix for non-Gmail domains', () => {
    expect(canonicalizeEmail('foo+tag@example.com')).toBe('foo+tag@example.com')
  })

  it('pins the degenerate Gmail empty-local-part case', () => {
    expect(canonicalizeEmail('+tag@gmail.com')).toBe('@gmail.com')
  })

  it('strips both dots and +suffix for gmail.com', () => {
    expect(canonicalizeEmail('J.Smith+tag@Gmail.com')).toBe('jsmith@gmail.com')
  })

  it('treats googlemail.com like gmail.com', () => {
    expect(canonicalizeEmail('j.smith+x@googlemail.com')).toBe('jsmith@googlemail.com')
  })

  it('is idempotent', () => {
    const once = canonicalizeEmail('J.Smith+tag@Gmail.com')
    expect(canonicalizeEmail(once)).toBe(once)
  })

  it('returns trim+lowercased input when there is no @', () => {
    expect(canonicalizeEmail('  NotAnEmail ')).toBe('notanemail')
  })
})

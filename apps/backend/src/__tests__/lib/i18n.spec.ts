import { describe, expect, it } from 'vitest'
import { tFor } from '@/lib/i18n'
import type { Brand } from '@/lib/appconfig'
import en from '@shared/i18n/en.json'
import hu from '@shared/i18n/hu.json'

// Drives the real lib/i18n.ts instances and translation catalogs, so a
// regression to a process-wide fallback fails here.
const brand = (domain: string, fallbackLocale: string): Brand => ({
  domain,
  siteName: domain,
  frontendUrl: `https://${domain}`,
  emailFrom: `hello@${domain}`,
  fallbackLocale,
})
const hungarianBrand = brand('hu.test', 'hu')
const englishBrand = brand('en.test', 'en')

const key = 'emails.login_link.subject'
const english = en.emails.login_link.subject
const hungarian = hu.emails.login_link.subject

describe('tFor', () => {
  it('has the catalogs loaded on first use, without awaiting', () => {
    expect(english).not.toBe(hungarian)
    expect(tFor(brand('first-use.test', 'hu'), 'en')(key)).toBe(english)
  })

  it("renders a language without translations in the brand's fallback locale", () => {
    expect(tFor(hungarianBrand, 'zz')(key)).toBe(hungarian)
    expect(tFor(englishBrand, 'zz')(key)).toBe(english)
  })

  it('gives each brand its own fallback, whatever the call order', () => {
    const order = [englishBrand, hungarianBrand, englishBrand, hungarianBrand]
    expect(order.map((b) => tFor(b, 'zz')(key))).toEqual([english, hungarian, english, hungarian])
  })

  it("renders a supported language as is, whatever the brand's fallback", () => {
    expect(tFor(hungarianBrand, 'en')(key)).toBe(english)
    expect(tFor(englishBrand, 'hu')(key)).toBe(hungarian)
  })
})

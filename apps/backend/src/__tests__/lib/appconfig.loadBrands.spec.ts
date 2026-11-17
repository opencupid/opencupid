import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BrandConfigError, loadBrands } from '../../lib/appconfig'

const fileA = [
  '# Brand A',
  'DOMAIN=a.test',
  'SITE_NAME="Site A"',
  'FRONTEND_URL=https://a.test',
  'EMAIL_FROM="Site A <hello@a.test>"',
  'EMAIL_REPLY_TO=help@a.test',
  // frontend-only keys are ignored by the backend
  'CSP_ALLOWED_DOMAINS="https://x.test"',
  // read by the backend only together with UMAMI_URL
  'UMAMI_WEBSITE_ID=abc',
].join('\n')
const fileB = [
  'DOMAIN=b.test',
  'SITE_NAME=B',
  'FRONTEND_URL=https://b.test',
  'EMAIL_FROM=B <hello@b.test>',
].join('\n')

let dir: string
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brands-'))
})
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})
const write = (name: string, body: string) => fs.writeFileSync(path.join(dir, name), body)

describe('loadBrands from BRANDS_DIR', () => {
  it('loads one brand per *.env file, sorted by file name', () => {
    write('b.env', fileB)
    write('a.env', fileA)
    write('README.md', 'not a brand')

    expect(loadBrands({}, dir)).toEqual([
      {
        domain: 'a.test',
        siteName: 'Site A',
        frontendUrl: 'https://a.test',
        emailFrom: 'Site A <hello@a.test>',
        emailReplyTo: 'help@a.test',
        fallbackLocale: 'en',
      },
      {
        domain: 'b.test',
        siteName: 'B',
        frontendUrl: 'https://b.test',
        emailFrom: 'B <hello@b.test>',
        fallbackLocale: 'en',
      },
    ])
  })

  it('ignores the process env when BRANDS_DIR is set', () => {
    write('a.env', fileA)
    const brands = loadBrands({ DOMAIN: 'process.test', FRONTEND_URL: 'https://process.test' }, dir)
    expect(brands.map((b) => b.domain)).toEqual(['a.test'])
  })

  it('normalizes DOMAIN to a bare lowercase host', () => {
    write('a.env', fileA.replace('DOMAIN=a.test', 'DOMAIN=" .A.Test "'))
    expect(loadBrands({}, dir)[0].domain).toBe('a.test')
  })

  it('leaves emailReplyTo unset when EMAIL_REPLY_TO is empty', () => {
    write('b.env', `${fileB}\nEMAIL_REPLY_TO=`)
    expect(loadBrands({}, dir)[0]).not.toHaveProperty('emailReplyTo')
  })

  it('names the file and the key of an invalid brand', () => {
    write('a.env', fileA)
    write('bad.env', fileB.replace('FRONTEND_URL=https://b.test', 'FRONTEND_URL=not-a-url'))
    expect(() => loadBrands({}, dir)).toThrow(BrandConfigError)
    expect(() => loadBrands({}, dir)).toThrow(/bad\.env.*FRONTEND_URL/)
  })

  it('rejects a brand file missing a required key', () => {
    write('b.env', fileB.replace(/^EMAIL_FROM=.*$/m, ''))
    expect(() => loadBrands({}, dir)).toThrow(/b\.env.*EMAIL_FROM/)
  })

  it('rejects two files with the same DOMAIN', () => {
    write('a.env', fileA)
    write('a-copy.env', fileA)
    expect(() => loadBrands({}, dir)).toThrow(/DOMAIN a\.test/)
  })

  it('rejects an empty directory', () => {
    expect(() => loadBrands({}, dir)).toThrow(/no \*\.env files/)
  })

  it('rejects a missing directory', () => {
    expect(() => loadBrands({}, path.join(dir, 'nope'))).toThrow(/not readable/)
  })
})

describe('loadBrands without BRANDS_DIR (single brand)', () => {
  const env = {
    DOMAIN: 'Solo.Test',
    FRONTEND_URL: 'https://solo.test',
    EMAIL_FROM: 'Solo <hello@solo.test>',
  }

  it('builds the one brand from the env', () => {
    expect(loadBrands(env, undefined)).toEqual([
      {
        domain: 'solo.test',
        siteName: 'OpenCupid',
        frontendUrl: 'https://solo.test',
        emailFrom: 'Solo <hello@solo.test>',
        fallbackLocale: 'en',
      },
    ])
  })

  it('names the environment as the source of an error', () => {
    expect(() => loadBrands({ ...env, DOMAIN: '' }, undefined)).toThrow(/the environment.*DOMAIN/)
  })
})

describe('brand FALLBACK_LOCALE', () => {
  const env = {
    DOMAIN: 'solo.test',
    FRONTEND_URL: 'https://solo.test',
    EMAIL_FROM: 'Solo <hello@solo.test>',
  }

  it('defaults to en', () => {
    expect(loadBrands(env, undefined)[0].fallbackLocale).toBe('en')
  })

  it('takes a supported locale per brand file', () => {
    write('a.env', `${fileA}\nFALLBACK_LOCALE=hu`)
    write('b.env', `${fileB}\nFALLBACK_LOCALE=en`)
    expect(loadBrands({}, dir).map((b) => b.fallbackLocale)).toEqual(['hu', 'en'])
  })

  it.each(['de', 'hu-HU', '', 'constructor'])('rejects %j, naming file and key', (locale) => {
    write('a.env', `${fileA}\nFALLBACK_LOCALE=${locale}`)
    expect(() => loadBrands({}, dir)).toThrow(/a\.env.*FALLBACK_LOCALE.*one of en, hu/)
  })
})

describe('brand UMAMI_URL / UMAMI_WEBSITE_ID', () => {
  it('enables Umami per brand when both are set, without a trailing slash', () => {
    write('a.env', `${fileA}\nUMAMI_URL=https://u.a.test/`)
    write('b.env', fileB)
    const [a, b] = loadBrands({}, dir)
    expect(a.umami).toEqual({ url: 'https://u.a.test', websiteId: 'abc' })
    expect(b.umami).toBeUndefined()
  })

  it('leaves Umami off when only one of the two is set', () => {
    write('a.env', fileA) // UMAMI_WEBSITE_ID only
    write('b.env', `${fileB}\nUMAMI_URL=https://u.b.test`)
    expect(loadBrands({}, dir).map((b) => b.umami)).toEqual([undefined, undefined])
  })

  it('rejects a UMAMI_URL that is not a URL, naming file and key', () => {
    write('a.env', `${fileA}\nUMAMI_URL=u.a.test`)
    expect(() => loadBrands({}, dir)).toThrow(/a\.env.*UMAMI_URL/)
  })
})

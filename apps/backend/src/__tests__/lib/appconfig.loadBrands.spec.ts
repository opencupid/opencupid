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
      },
      {
        domain: 'b.test',
        siteName: 'B',
        frontendUrl: 'https://b.test',
        emailFrom: 'B <hello@b.test>',
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
      },
    ])
  })

  it('names the environment as the source of an error', () => {
    expect(() => loadBrands({ ...env, DOMAIN: '' }, undefined)).toThrow(/the environment.*DOMAIN/)
  })
})

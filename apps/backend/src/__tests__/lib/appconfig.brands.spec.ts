import { describe, expect, it } from 'vitest'
import { configSchema } from '../../lib/appconfig'

// Importing appconfig loads .env / .env.example into process.env, so it is a
// valid base environment to vary BRANDS against.
const baseEnv = { ...process.env, DOMAIN: 'a.test' }

const brandA = {
  domain: 'a.test',
  siteName: 'A',
  frontendUrl: 'https://a.test',
  emailFrom: 'A <hello@a.test>',
}
const brandB = { ...brandA, domain: 'b.test', siteName: 'B', frontendUrl: 'https://b.test' }

function parse(brands: string | undefined) {
  return configSchema.safeParse({ ...baseEnv, BRANDS: brands })
}

describe('appconfig BRANDS', () => {
  it('is optional', () => {
    const res = parse(undefined)
    expect(res.success).toBe(true)
    expect(res.data?.BRANDS).toBeUndefined()
  })

  it('parses a JSON brand list', () => {
    const res = parse(JSON.stringify([brandA, brandB]))
    expect(res.success).toBe(true)
    expect(res.data?.BRANDS).toEqual([brandA, brandB])
  })

  it('rejects invalid JSON', () => {
    expect(parse('[{').success).toBe(false)
  })

  it('rejects an entry missing required fields', () => {
    const { emailFrom: _omit, ...incomplete } = brandA
    expect(parse(JSON.stringify([incomplete])).success).toBe(false)
  })

  it('rejects duplicate domains', () => {
    expect(parse(JSON.stringify([brandA, { ...brandB, domain: 'a.test' }])).success).toBe(false)
  })

  it("rejects a list that doesn't include this process's DOMAIN", () => {
    expect(parse(JSON.stringify([brandB])).success).toBe(false)
  })
})

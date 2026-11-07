import { describe, expect, it, vi } from 'vitest'

const { mockAppConfig } = vi.hoisted(() => ({
  mockAppConfig: {} as Record<string, unknown>,
}))

vi.mock('@/lib/appconfig', () => ({ appConfig: mockAppConfig }))

const singleBrandEnv = {
  DOMAIN: 'solo.test',
  SITE_NAME: 'Solo',
  FRONTEND_URL: 'https://solo.test',
  EMAIL_FROM: 'Solo <hello@solo.test>',
  EMAIL_REPLY_TO: 'support@solo.test',
}

const gaians = {
  domain: 'gaians.test',
  siteName: 'Gaians',
  frontendUrl: 'https://gaians.test',
  emailFrom: 'Gaians <hello@gaians.test>',
}
const komaterkep = {
  domain: 'komaterkep.test',
  siteName: 'Komatérkép',
  frontendUrl: 'https://komaterkep.test',
  emailFrom: 'Komatérkép <hello@komaterkep.test>',
  emailReplyTo: 'help@komaterkep.test',
}

async function loadBrand(config: Record<string, unknown>) {
  for (const key of Object.keys(mockAppConfig)) delete mockAppConfig[key]
  Object.assign(mockAppConfig, config)
  vi.resetModules()
  return import('../../lib/brand')
}

describe('brand registry', () => {
  it('builds a single brand from process env when BRANDS is unset', async () => {
    const { brandFor } = await loadBrand(singleBrandEnv)
    expect(brandFor('solo.test')).toEqual({
      domain: 'solo.test',
      siteName: 'Solo',
      frontendUrl: 'https://solo.test',
      emailFrom: 'Solo <hello@solo.test>',
      emailReplyTo: 'support@solo.test',
    })
  })

  it('resolves the recipient brand from BRANDS regardless of the process DOMAIN', async () => {
    const { brandFor } = await loadBrand({
      ...singleBrandEnv,
      DOMAIN: 'komaterkep.test',
      BRANDS: [gaians, komaterkep],
    })
    expect(brandFor('gaians.test')).toEqual(gaians)
    expect(brandFor('komaterkep.test')).toEqual(komaterkep)
  })

  it('throws for a domain no brand has', async () => {
    const { brandFor } = await loadBrand({
      ...singleBrandEnv,
      DOMAIN: 'komaterkep.test',
      BRANDS: [gaians, komaterkep],
    })
    expect(() => brandFor('nowhere.test')).toThrow('No brand for domain nowhere.test')
  })
})

describe('brandForHost', () => {
  it('resolves the brand whose domain is the host or a parent of it', async () => {
    const { brandForHost } = await loadBrand({
      ...singleBrandEnv,
      DOMAIN: 'komaterkep.test',
      BRANDS: [gaians, komaterkep],
    })
    expect(brandForHost('gaians.test')).toEqual(gaians)
    expect(brandForHost('admin.gaians.test')).toEqual(gaians)
    expect(brandForHost('WWW.Komaterkep.test')).toEqual(komaterkep)
  })

  it('rejects a host no brand serves with a 421', async () => {
    const { brandForHost, UnknownHostError } = await loadBrand({
      ...singleBrandEnv,
      BRANDS: [gaians, komaterkep],
      DOMAIN: 'gaians.test',
    })
    for (const host of ['nowhere.test', 'evilgaians.test', 'localhost']) {
      const err = (() => {
        try {
          brandForHost(host)
        } catch (e) {
          return e
        }
      })()
      expect(err).toBeInstanceOf(UnknownHostError)
      expect(err).toMatchObject({ statusCode: 421, hostname: host })
    }
  })
})

describe('frontendOrigins', () => {
  it('lists the origin of every brand frontend', async () => {
    const { frontendOrigins } = await loadBrand({
      ...singleBrandEnv,
      DOMAIN: 'gaians.test',
      BRANDS: [gaians, { ...komaterkep, frontendUrl: 'https://komaterkep.test:8443/app/' }],
    })
    expect(frontendOrigins()).toEqual(['https://gaians.test', 'https://komaterkep.test:8443'])
  })
})

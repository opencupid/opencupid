import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAppConfig, mockLoggerWarn } = vi.hoisted(() => ({
  mockAppConfig: {} as Record<string, unknown>,
  mockLoggerWarn: vi.fn(),
}))

vi.mock('@/lib/appconfig', () => ({ appConfig: mockAppConfig }))
vi.mock('@/lib/logger', () => ({ logger: { warn: mockLoggerWarn } }))

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
  beforeEach(() => mockLoggerWarn.mockReset())

  it('builds a single brand from process env when BRANDS is unset', async () => {
    const { currentBrand, brandFor } = await loadBrand(singleBrandEnv)
    const expected = {
      domain: 'solo.test',
      siteName: 'Solo',
      frontendUrl: 'https://solo.test',
      emailFrom: 'Solo <hello@solo.test>',
      emailReplyTo: 'support@solo.test',
    }
    expect(currentBrand()).toEqual(expected)
    expect(brandFor('solo.test')).toEqual(expected)
  })

  it('resolves the recipient brand from BRANDS regardless of the process brand', async () => {
    const { currentBrand, brandFor } = await loadBrand({
      ...singleBrandEnv,
      DOMAIN: 'komaterkep.test',
      BRANDS: [gaians, komaterkep],
    })
    expect(currentBrand()).toEqual(komaterkep)
    expect(brandFor('gaians.test')).toEqual(gaians)
    expect(mockLoggerWarn).not.toHaveBeenCalled()
  })

  it('falls back to the process brand and warns for an unknown domain', async () => {
    const { brandFor } = await loadBrand({
      ...singleBrandEnv,
      DOMAIN: 'komaterkep.test',
      BRANDS: [gaians, komaterkep],
    })
    expect(brandFor('nowhere.test')).toEqual(komaterkep)
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'nowhere.test' }),
      expect.any(String)
    )
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

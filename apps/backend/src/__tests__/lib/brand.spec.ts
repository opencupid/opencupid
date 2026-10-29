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

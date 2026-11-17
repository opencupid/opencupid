import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mockWarn = vi.fn()
vi.mock('@/lib/logger', () => ({ logger: { warn: (...a: unknown[]) => mockWarn(...a) } }))

import { sendUmamiEvent } from '../../lib/umami'

const brand = {
  domain: 'example.org',
  siteName: 'Example',
  frontendUrl: 'https://example.org',
  emailFrom: 'hi@example.org',
  fallbackLocale: 'en',
  umami: { url: 'https://u.example.org', websiteId: 'site-1' },
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue({ ok: true, status: 200 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendUmamiEvent', () => {
  it("posts the event to the brand's Umami site with the client IP", async () => {
    await sendUmamiEvent(brand, {
      name: 'magic-link-verify',
      url: '/magic-link',
      data: { outcome: 'consumed' },
      ip: '81.0.0.1',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://u.example.org/api/send')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      type: 'event',
      payload: {
        website: 'site-1',
        hostname: 'example.org',
        url: '/magic-link',
        name: 'magic-link-verify',
        data: { outcome: 'consumed' },
        ip: '81.0.0.1',
      },
    })
  })

  it('sends a fixed user agent that Umami does not drop as a bot', async () => {
    const { isbot } = await import('isbot')
    await sendUmamiEvent(brand, { name: 'e', url: '/', data: {} })

    const ua = fetchMock.mock.calls[0][1].headers['User-Agent']
    expect(isbot(ua)).toBe(false)
  })

  it('does nothing when the brand has no Umami site', async () => {
    const { umami: _, ...noUmami } = brand
    await sendUmamiEvent(noUmami, { name: 'e', url: '/', data: {} })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logs and swallows a rejected event', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 })
    await expect(sendUmamiEvent(brand, { name: 'e', url: '/', data: {} })).resolves.toBeUndefined()
    expect(mockWarn).toHaveBeenCalled()
  })

  it('logs and swallows a network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    await expect(sendUmamiEvent(brand, { name: 'e', url: '/', data: {} })).resolves.toBeUndefined()
    expect(mockWarn).toHaveBeenCalled()
  })
})

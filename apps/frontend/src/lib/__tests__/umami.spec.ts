import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Handler } from 'mitt'

const busHandlers: Record<string, Handler<any>> = {}
const mockOn = vi.fn((event: string, handler: Handler<any>) => {
  busHandlers[event] = handler
})

vi.mock('@/lib/bus', () => ({
  bus: { on: mockOn },
}))

const ENABLED = { UMAMI_URL: 'https://u.example.com', UMAMI_WEBSITE_ID: 'abc-123' }
const DISABLED = { UMAMI_URL: '', UMAMI_WEBSITE_ID: '' }

function setConfig(overrides: Partial<{ UMAMI_URL: string; UMAMI_WEBSITE_ID: string }>) {
  ;(globalThis as any).__APP_CONFIG__ = {
    ...(globalThis as any).__APP_CONFIG__,
    ...overrides,
  }
}

function fireScriptLoad() {
  const script = document.head.querySelector('script') as HTMLScriptElement | null
  script?.dispatchEvent(new Event('load'))
}

function fireScriptError() {
  const script = document.head.querySelector('script') as HTMLScriptElement | null
  script?.dispatchEvent(new Event('error'))
}

describe('umami', () => {
  let originalConfig: any

  beforeEach(() => {
    originalConfig = { ...((globalThis as any).__APP_CONFIG__ ?? {}) }
    document.head.innerHTML = ''
    delete (window as any).umami
    for (const key of Object.keys(busHandlers)) delete busHandlers[key]
    mockOn.mockClear()
    vi.resetModules()
  })

  afterEach(() => {
    ;(globalThis as any).__APP_CONFIG__ = originalConfig
  })

  describe('initUmami', () => {
    it('does not append a script when both env vars are empty', async () => {
      setConfig(DISABLED)
      const { initUmami } = await import('../umami')
      initUmami()
      expect(document.head.querySelector('script')).toBeNull()
    })

    it('does not append a script when UMAMI_URL is empty', async () => {
      setConfig({ UMAMI_URL: '', UMAMI_WEBSITE_ID: 'abc' })
      const { initUmami } = await import('../umami')
      initUmami()
      expect(document.head.querySelector('script')).toBeNull()
    })

    it('does not append a script when UMAMI_WEBSITE_ID is empty', async () => {
      setConfig({ UMAMI_URL: 'https://u.example.com', UMAMI_WEBSITE_ID: '' })
      const { initUmami } = await import('../umami')
      initUmami()
      expect(document.head.querySelector('script')).toBeNull()
    })

    it('appends a script with src and data-website-id when enabled', async () => {
      setConfig(ENABLED)
      const { initUmami } = await import('../umami')
      initUmami()
      const script = document.head.querySelector('script') as HTMLScriptElement | null
      expect(script).not.toBeNull()
      expect(script!.src).toBe('https://u.example.com/script.js')
      expect(script!.getAttribute('data-website-id')).toBe('abc-123')
      expect(script!.getAttribute('data-performance')).toBe('true')
    })
  })

  describe('identifyUmami / resetUmamiIdentity', () => {
    it('calls window.umami.identify with userId as session data once the script loads', async () => {
      setConfig(ENABLED)
      const { initUmami, identifyUmami } = await import('../umami')
      const identify = vi.fn()

      initUmami()
      identifyUmami('user-1')
      expect(identify).not.toHaveBeenCalled()
      ;(window as any).umami = { identify, track: vi.fn() }
      fireScriptLoad()
      await Promise.resolve()

      // Pass userId as data, not as the unique-id arg, so Umami doesn't pivot
      // the sessionId hash and fragment the visit into separate session rows.
      expect(identify).toHaveBeenCalledWith({ user: 'user-1' })
    })

    it('calls window.umami.identify with { user: null } on reset', async () => {
      setConfig(ENABLED)
      const { initUmami, resetUmamiIdentity } = await import('../umami')
      const identify = vi.fn()

      initUmami()
      ;(window as any).umami = { identify, track: vi.fn() }
      fireScriptLoad()
      await Promise.resolve()

      resetUmamiIdentity()
      await Promise.resolve()
      expect(identify).toHaveBeenCalledWith({ user: null })
    })

    it('does not throw when the script load fails', async () => {
      setConfig(ENABLED)
      const { initUmami, identifyUmami } = await import('../umami')

      initUmami()
      identifyUmami('profile-1')
      fireScriptError()
      await Promise.resolve()

      expect(window.umami).toBeUndefined()
    })

    it('is a no-op when umami is disabled', async () => {
      setConfig(DISABLED)
      const { initUmami, identifyUmami, resetUmamiIdentity } = await import('../umami')

      initUmami()
      identifyUmami('profile-1')
      resetUmamiIdentity()
      await Promise.resolve()

      expect(document.head.querySelector('script')).toBeNull()
    })
  })

  describe('tracker.track', () => {
    it('calls window.umami.track once the script loads', async () => {
      setConfig(ENABLED)
      const { initUmami, tracker } = await import('../umami')
      const track = vi.fn()

      initUmami()
      tracker.track('event-x', { a: 1 })
      expect(track).not.toHaveBeenCalled()
      ;(window as any).umami = { identify: vi.fn(), track }
      fireScriptLoad()
      await Promise.resolve()

      expect(track).toHaveBeenCalledWith('event-x', { a: 1 })
    })

    it('is a no-op when umami is disabled', async () => {
      setConfig(DISABLED)
      const { initUmami, tracker } = await import('../umami')

      initUmami()
      tracker.track('event-x')
      await Promise.resolve()

      expect(document.head.querySelector('script')).toBeNull()
    })
  })

  describe('bus listener registration', () => {
    it('registers auth:login and auth:logged-out listeners when enabled', async () => {
      setConfig(ENABLED)
      await import('../umami')
      const events = mockOn.mock.calls.map(([event]) => event)
      expect(events).toContain('auth:login')
      expect(events).toContain('auth:logged-out')
    })

    it('does not register any bus listeners when disabled', async () => {
      setConfig(DISABLED)
      await import('../umami')
      expect(mockOn).not.toHaveBeenCalled()
    })

    it('auth:login handler invokes umami.identify with the userId as session data', async () => {
      setConfig(ENABLED)
      const { initUmami } = await import('../umami')
      const identify = vi.fn()

      initUmami()
      ;(window as any).umami = { identify, track: vi.fn() }
      fireScriptLoad()
      await Promise.resolve()

      busHandlers['auth:login']?.({ userId: 'user-42' })
      await Promise.resolve()
      expect(identify).toHaveBeenCalledWith({ user: 'user-42' })
    })

    it('auth:logged-out handler invokes umami.identify with { user: null }', async () => {
      setConfig(ENABLED)
      const { initUmami } = await import('../umami')
      const identify = vi.fn()

      initUmami()
      ;(window as any).umami = { identify, track: vi.fn() }
      fireScriptLoad()
      await Promise.resolve()

      busHandlers['auth:logged-out']?.(undefined)
      await Promise.resolve()
      expect(identify).toHaveBeenCalledWith({ user: null })
    })
  })
})

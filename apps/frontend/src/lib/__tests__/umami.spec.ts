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

/** The name and data of each event a `track` mock sent. */
function eventsSent(track: ReturnType<typeof vi.fn>) {
  return track.mock.calls.map(([build]) => {
    const { name, data } = build({ website: 'abc-123' })
    return [name, data]
  })
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
      expect(script!.getAttribute('data-auto-pageview')).toBe('false')
    })
  })

  describe('trackPageviews', () => {
    const origin = window.location.origin
    const Blank = { render: () => null }

    async function setup(config = ENABLED) {
      setConfig(config)
      const { createRouter, createWebHistory } = await import('vue-router')
      const { initUmami, trackPageviews, tracker } = await import('../umami')
      window.history.replaceState(null, '', '/')
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', redirect: '/browse' },
          { path: '/browse', component: Blank },
          { path: '/browse/grid', component: Blank },
          { path: '/inbox', component: Blank },
          { path: '/inbox/:id', component: Blank },
          { path: '/blocked', component: Blank, beforeEnter: () => false },
        ],
      })
      const track = vi.fn()
      trackPageviews(router)
      initUmami()
      ;(window as any).umami = { identify: vi.fn(), track }
      fireScriptLoad()

      /** The url and referrer of each pageview sent so far. */
      const pageviews = async () => {
        await new Promise((resolve) => setTimeout(resolve))
        return sent()
          .filter((payload) => !payload.name)
          .map(({ url, referrer }) => ({ url, referrer }))
      }
      /** Every payload sent so far, built on top of a stale tracker payload. */
      const sent = () =>
        track.mock.calls.map(([build]) =>
          build({ website: 'abc-123', url: 'stale', referrer: 'stale' })
        )
      const back = async () => {
        const landed = new Promise((resolve) => router.afterEach(() => resolve(undefined)))
        router.back()
        await landed
      }
      return { router, track, tracker, sent, pageviews, back }
    }

    it('sends the page the initial navigation lands on, after redirects', async () => {
      const { router, pageviews } = await setup()
      await router.push('/')

      expect(await pageviews()).toEqual([{ url: `${origin}/browse`, referrer: document.referrer }])
    })

    it('sends one pageview per navigation with the previous page as referrer', async () => {
      const { router, pageviews } = await setup()
      await router.push('/inbox')
      await router.push('/inbox/c1')

      expect(await pageviews()).toEqual([
        { url: `${origin}/inbox`, referrer: document.referrer },
        { url: `${origin}/inbox/c1`, referrer: `${origin}/inbox` },
      ])
    })

    it('counts a back navigation and does not double the next one', async () => {
      const { router, pageviews, back } = await setup()
      await router.push('/inbox')
      await router.push('/inbox/c1')
      await back()
      await router.push('/inbox/c1')

      expect(await pageviews()).toEqual([
        { url: `${origin}/inbox`, referrer: document.referrer },
        { url: `${origin}/inbox/c1`, referrer: `${origin}/inbox` },
        { url: `${origin}/inbox`, referrer: `${origin}/inbox/c1` },
        { url: `${origin}/inbox/c1`, referrer: `${origin}/inbox` },
      ])
    })

    it('sends an event with the page the user is on, also after going back', async () => {
      const { router, tracker, sent, back } = await setup()
      await router.push('/inbox')
      await router.push('/inbox/c1')
      await back()
      tracker.track('event-x', { a: 1 })
      await new Promise((resolve) => setTimeout(resolve))

      expect(sent().at(-1)).toEqual({
        website: 'abc-123',
        url: `${origin}/inbox`,
        referrer: `${origin}/inbox/c1`,
        name: 'event-x',
        data: { a: 1 },
      })
    })

    it('ignores query changes on the same page', async () => {
      const { router, pageviews } = await setup()
      await router.push('/browse/grid?bbox=1,2,3,4')
      await router.replace('/browse/grid?bbox=1,2,3,5')
      await router.replace('/browse/grid?bbox=1,2,3,6&tags=a')

      expect(await pageviews()).toEqual([
        { url: `${origin}/browse/grid?bbox=1,2,3,4`, referrer: document.referrer },
      ])
    })

    it('ignores a navigation a guard cancels', async () => {
      const { router, pageviews } = await setup()
      await router.push('/inbox')
      await router.push('/blocked')

      expect(await pageviews()).toHaveLength(1)
    })

    it('sends nothing when umami is disabled', async () => {
      const { router, track } = await setup(DISABLED)
      await router.push('/inbox')
      await new Promise((resolve) => setTimeout(resolve))

      expect(track).not.toHaveBeenCalled()
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

      expect(eventsSent(track)).toEqual([['event-x', { a: 1 }]])
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

  describe('outage tracking', () => {
    async function setup() {
      setConfig(ENABLED)
      const { initUmami } = await import('../umami')
      const track = vi.fn()

      initUmami()
      ;(window as any).umami = { identify: vi.fn(), track }
      fireScriptLoad()
      await Promise.resolve()

      const emit = async (event: 'api:offline' | 'api:online', payload?: unknown) => {
        busHandlers[event]?.(payload)
        await Promise.resolve()
      }
      return { track, emit }
    }

    it('sends outage-api as soon as an API outage is diagnosed', async () => {
      const { track, emit } = await setup()

      await emit('api:offline', { cause: 'api' })

      expect(eventsSent(track)).toEqual([['outage-api', undefined]])
    })

    it('holds outage-network back until the connection has recovered', async () => {
      const { track, emit } = await setup()

      await emit('api:offline', { cause: 'network' })
      expect(track).not.toHaveBeenCalled()

      await emit('api:online')
      expect(eventsSent(track)).toEqual([['outage-network', undefined]])
    })

    it('sends the held outage-network once the cause turns into an API outage', async () => {
      const { track, emit } = await setup()

      await emit('api:offline', { cause: 'network' })
      await emit('api:offline', { cause: 'api' })

      expect(eventsSent(track)).toEqual([
        ['outage-network', undefined],
        ['outage-api', undefined],
      ])

      await emit('api:online')
      expect(track).toHaveBeenCalledTimes(2)
    })

    it('counts each cause once per outage even when the diagnosis flips back and forth', async () => {
      const { track, emit } = await setup()

      await emit('api:offline', { cause: 'api' })
      await emit('api:offline', { cause: 'network' })
      await emit('api:offline', { cause: 'api' })
      await emit('api:offline', { cause: 'network' })
      await emit('api:online')

      expect(eventsSent(track)).toEqual([
        ['outage-api', undefined],
        ['outage-network', undefined],
      ])
    })

    it('counts a new outage after recovery', async () => {
      const { track, emit } = await setup()

      await emit('api:offline', { cause: 'api' })
      await emit('api:online')
      await emit('api:offline', { cause: 'api' })

      expect(track).toHaveBeenCalledTimes(2)
    })
  })

  describe('redacting secrets before send', () => {
    const origin = window.location.origin

    it('registers the before-send hook on window before adding the script', async () => {
      setConfig(ENABLED)
      const appended: Array<{ hook: unknown; attr: string | null }> = []
      const realAppend = document.head.appendChild.bind(document.head)
      vi.spyOn(document.head, 'appendChild').mockImplementation((node: any) => {
        appended.push({ hook: window.umamiBeforeSend, attr: node.getAttribute('data-before-send') })
        return realAppend(node)
      })
      const { initUmami } = await import('../umami')
      initUmami()
      expect(appended).toEqual([{ hook: expect.any(Function), attr: 'umamiBeforeSend' }])
      vi.restoreAllMocks()
    })

    it.each([
      [
        'the magic-link token, keeping other params',
        `${origin}/magic-link?token=abc123&redirect=%2Finbox`,
        `${origin}/magic-link?redirect=%2Finbox`,
      ],
      [
        'a token that is the only param',
        `${origin}/magic-link?token=abc123`,
        `${origin}/magic-link`,
      ],
      [
        'the unsubscribe token in the path, keeping the query',
        `${origin}/unsubscribe/eyJhbGciOi.payload.sig?lang=hu`,
        `${origin}/unsubscribe/:token?lang=hu`,
      ],
      ['a relative URL', '/magic-link?token=abc&redirect=%2Fme', '/magic-link?redirect=%2Fme'],
    ])('removes %s', async (_label, input, expected) => {
      const { redactUrl } = await import('../umami')
      expect(redactUrl(input)).toBe(expected)
    })

    it.each([
      ['a page with UTM tags', `${origin}/browse?utm_source=notification&utm_campaign=new_like`],
      ['an external referrer', 'https://mail.example.com/inbox?token=theirs'],
      ['an empty referrer', ''],
      ['a URL whose encoding URL() would normalize', `${origin}/browse?tags=a%2Cb&q=x+y`],
    ])('leaves %s unchanged', async (_label, input) => {
      const { redactUrl } = await import('../umami')
      expect(redactUrl(input)).toBe(input)
    })

    it('redacts both url and referrer and keeps the rest of the payload', async () => {
      setConfig(ENABLED)
      const { initUmami } = await import('../umami')
      initUmami()
      const payload = {
        website: 'abc-123',
        url: `${origin}/inbox`,
        referrer: `${origin}/magic-link?token=abc123&redirect=%2Finbox`,
        title: 'Inbox',
      }
      expect(window.umamiBeforeSend!('event', payload)).toEqual({
        ...payload,
        referrer: `${origin}/magic-link?redirect=%2Finbox`,
      })
    })
  })
})

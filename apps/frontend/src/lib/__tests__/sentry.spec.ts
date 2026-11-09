import { describe, it, expect, vi, beforeEach } from 'vitest'

const init = vi.fn()
const setTag = vi.fn()
vi.mock('@sentry/vue', () => ({ init, setTag }))

const matchesAny = (patterns: RegExp[], value: string) => patterns.some((p) => p.test(value))

describe('initSentry', () => {
  beforeEach(() => {
    init.mockClear()
    setTag.mockClear()
  })

  it('does nothing without a DSN', async () => {
    vi.stubGlobal('__APP_CONFIG__', { SENTRY_DSN: '', DOMAIN: 'example.org' })
    const { initSentry } = await import('../sentry')
    await initSentry({} as never)
    expect(init).not.toHaveBeenCalled()
  })

  it('passes the noise filters to Sentry', async () => {
    vi.stubGlobal('__APP_CONFIG__', {
      SENTRY_DSN: 'https://k@example.org/1',
      DOMAIN: 'example.org',
    })
    const { initSentry, ignoreErrors, denyUrls } = await import('../sentry')
    await initSentry({} as never)
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ ignoreErrors, denyUrls }))
    expect(setTag).toHaveBeenCalledWith('frontend_origin', 'example.org')
  })
})

describe('noise filters', () => {
  it('ignore ResizeObserver loop notices in both browser wordings', async () => {
    const { ignoreErrors } = await import('../sentry')
    expect(matchesAny(ignoreErrors, 'ResizeObserver loop limit exceeded')).toBe(true)
    expect(
      matchesAny(ignoreErrors, 'ResizeObserver loop completed with undelivered notifications.')
    ).toBe(true)
    expect(matchesAny(ignoreErrors, 'TypeError: x is undefined')).toBe(false)
  })

  it('deny scripts injected by in-app browsers', async () => {
    const { denyUrls } = await import('../sentry')
    expect(matchesAny(denyUrls, 'iabjs://navigation_performance_logger_android')).toBe(true)
    expect(matchesAny(denyUrls, 'https://komaterkep.hu/assets/build/entry-CAsIyahr.js')).toBe(false)
  })
})

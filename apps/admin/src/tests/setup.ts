import { vi } from 'vitest'

// jsdom does not provide IntersectionObserver; stub the minimum surface
// our pages use (observe / disconnect) so onMounted hooks don't crash in tests.
class IntersectionObserverStub {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}

;(globalThis as any).IntersectionObserver = IntersectionObserverStub

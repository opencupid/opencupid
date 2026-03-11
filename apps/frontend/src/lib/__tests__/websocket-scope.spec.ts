/**
 * Regression test for VueUse useWebSocket + Vue effect scope.
 *
 * Root cause: VueUse's useWebSocket internally relies on Vue's effect scope
 * (tryOnScopeDispose, watch, useEventListener). When called after an `await`
 * — as happens in our bootstrap chain — Vue's getCurrentScope() returns null,
 * and composable internals silently no-op. This caused the WebSocket to never
 * connect, breaking notification dots, LikesAndMatchesBanner, etc.
 *
 * Fix: Pin @vueuse/core to 13.x where scope dependency is less strict.
 * This test ensures the composable actually opens a WebSocket when called
 * after an async gap, catching any future VueUse upgrade that reintroduces
 * the scope-dependent behaviour.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope } from 'vue'
import { useWebSocket } from '@vueuse/core'

// --- Mock browser WebSocket ------------------------------------------------

class MockWebSocket {
  static instances: MockWebSocket[] = []

  url: string
  readyState = 0 // CONNECTING
  onopen: ((ev: Event) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  close = vi.fn()
  send = vi.fn()

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    // Simulate async connection
    setTimeout(() => {
      this.readyState = 1 // OPEN
      this.onopen?.(new Event('open'))
    }, 0)
  }

  addEventListener = vi.fn()
  removeEventListener = vi.fn()
}

// --- Tests -----------------------------------------------------------------

describe('useWebSocket effect scope regression', () => {
  let originalWebSocket: typeof globalThis.WebSocket

  beforeEach(() => {
    MockWebSocket.instances = []
    originalWebSocket = globalThis.WebSocket
    // Replace browser WebSocket with mock
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket
  })

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket
  })

  it('creates a WebSocket when called inside an effect scope (baseline)', () => {
    const scope = effectScope()

    scope.run(() => {
      useWebSocket('ws://localhost/test', { immediate: true })
    })

    expect(MockWebSocket.instances.length).toBe(1)
    expect(MockWebSocket.instances[0]!.url).toBe('ws://localhost/test')

    scope.stop()
  })

  it('creates a WebSocket when called AFTER await (outside scope) — the bootstrap scenario', async () => {
    // This simulates what happens in bootstrap.ts:
    //   await Promise.all([...])   <-- scope is lost here
    //   connectWebSocket()         <-- useWebSocket called without scope

    // Simulate an async gap that drops the effect scope
    await Promise.resolve()

    // Call useWebSocket directly — no wrapping scope
    useWebSocket('ws://localhost/test-after-await', {
      immediate: true,
    })

    // The critical assertion: a WebSocket instance was actually created
    expect(MockWebSocket.instances.length).toBe(1)
    expect(MockWebSocket.instances[0]!.url).toBe('ws://localhost/test-after-await')
  })

  it('creates a WebSocket when called after await inside an effect scope', async () => {
    // This tests the exact pattern: scope.run → await → useWebSocket
    // In Vue components, the setup function's scope is active before the first
    // await but gone after. This test verifies the composable still connects.

    const scope = effectScope()

    await scope.run(async () => {
      // Before await — scope is active
      await Promise.resolve() // simulate async work (fetchOwnerProfile, fetchTicketUrl)

      // After await — scope may be detached depending on VueUse version
      useWebSocket('ws://localhost/test-scope-await', { immediate: true })
    })

    expect(MockWebSocket.instances.length).toBe(1)
    expect(MockWebSocket.instances[0]!.url).toBe('ws://localhost/test-scope-await')

    scope.stop()
  })

  it('reactive URL getter works after await', async () => {
    // Our websocket.ts passes a getter: useWebSocket(() => ticketUrl, ...)
    // Verify getter-based URL works outside scope too

    const ticketUrl = 'ws://localhost/initial'

    await Promise.resolve()

    useWebSocket(() => ticketUrl, { immediate: true })

    expect(MockWebSocket.instances.length).toBe(1)
    // The getter is evaluated at connection time
    expect(MockWebSocket.instances[0]!.url).toBe('ws://localhost/initial')
  })
})

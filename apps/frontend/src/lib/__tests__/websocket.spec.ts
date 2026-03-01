import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Mocks -----------------------------------------------------------

const mockClose = vi.fn()
const mockUseWebSocket = vi.fn(() => ({ close: mockClose }))
vi.mock('@vueuse/core', () => ({ useWebSocket: mockUseWebSocket }))

const mockApiGet = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: mockApiGet } }))

const mockBusOn = vi.fn()
vi.mock('@/lib/bus', () => ({ bus: { on: mockBusOn, emit: vi.fn() } }))

vi.stubGlobal('__APP_CONFIG__', {
  WS_BASE_URL: 'wss://example.com',
})

// --- Helpers ---------------------------------------------------------

/** Return the options object passed to useWebSocket */
function wsOptions() {
  const lastCall = mockUseWebSocket.mock.calls.at(-1) as unknown[]
  return lastCall[1] as Record<string, unknown>
}

/** Return the URL getter passed to useWebSocket */
function wsUrlGetter() {
  const lastCall = mockUseWebSocket.mock.calls.at(-1) as unknown[]
  return lastCall[0] as () => string
}

// --- Tests -----------------------------------------------------------

describe('websocket', () => {
  let connectWebSocket: () => Promise<void>
  let disconnectWebSocket: () => void

  beforeEach(async () => {
    vi.clearAllMocks()
    // Default: ticket fetch succeeds
    mockApiGet.mockResolvedValue({ data: { ticket: 'ticket-abc' } })

    // Re-import to reset module-level state
    vi.resetModules()
    const mod = await import('../websocket')
    connectWebSocket = mod.connectWebSocket
    disconnectWebSocket = mod.disconnectWebSocket
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── connectWebSocket ───────────────────────────────────────────────

  it('fetches a ticket and creates socket with getter URL', async () => {
    await connectWebSocket()

    expect(mockApiGet).toHaveBeenCalledWith('/auth/ws-ticket')
    expect(mockUseWebSocket).toHaveBeenCalledOnce()

    // URL should be a getter function, not a static string
    const urlArg = (mockUseWebSocket.mock.calls[0] as unknown[])[0] as () => string
    expect(typeof urlArg).toBe('function')
    expect(urlArg()).toBe('wss://example.com/message?ticket=ticket-abc')
  })

  it('does not create socket when ticket fetch fails', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('network'))

    await connectWebSocket()

    expect(mockUseWebSocket).not.toHaveBeenCalled()
  })

  it('cleans up existing socket before creating a new one', async () => {
    await connectWebSocket()
    mockApiGet.mockResolvedValue({ data: { ticket: 'ticket-new' } })

    await connectWebSocket()

    // First socket should have been closed
    expect(mockClose).toHaveBeenCalled()
    // Two useWebSocket calls total
    expect(mockUseWebSocket).toHaveBeenCalledTimes(2)
  })

  // ── onDisconnected ─────────────────────────────────────────────────

  it('fetches a fresh ticket on unintentional disconnect', async () => {
    await connectWebSocket()
    mockApiGet.mockClear()
    mockApiGet.mockResolvedValue({ data: { ticket: 'ticket-fresh' } })

    // Simulate unintentional disconnect
    const options = wsOptions()
    const onDisconnected = options.onDisconnected as () => void
    onDisconnected()

    // Wait for the async fetch inside onDisconnected
    await vi.waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/auth/ws-ticket')
    })

    // The getter should now return the fresh ticket URL
    const getter = wsUrlGetter()
    expect(getter()).toBe('wss://example.com/message?ticket=ticket-fresh')
  })

  it('does NOT fetch a ticket after intentional disconnectWebSocket()', async () => {
    await connectWebSocket()
    mockApiGet.mockClear()

    disconnectWebSocket()

    // Simulate the disconnect callback firing after close()
    const options = wsOptions()
    const onDisconnected = options.onDisconnected as () => void
    onDisconnected()

    // Give any potential async work a chance to run
    await Promise.resolve()
    await Promise.resolve()

    expect(mockApiGet).not.toHaveBeenCalled()
  })

  // ── disconnectWebSocket ────────────────────────────────────────────

  it('closes socket and nulls reference', async () => {
    await connectWebSocket()

    disconnectWebSocket()

    expect(mockClose).toHaveBeenCalled()
  })

  it('is safe to call when no socket exists', () => {
    // Should not throw
    expect(() => disconnectWebSocket()).not.toThrow()
  })
})

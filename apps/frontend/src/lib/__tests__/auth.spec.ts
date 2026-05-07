/**
 * Tests the auth-orchestrator: when `auth:login` fires on the bus, the
 * orchestrator kicks off bootstrap and exposes a `bootstrapReady()` handle
 * that callers on the navigation path await before navigating to
 * authenticated routes.
 *
 * Critical invariant: after bus.emit('auth:login', ...) returns control to
 * the emitter, bootstrapReady() must reflect the in-flight cycle (i.e.
 * await it and you get back the moment bootstrap completes, not earlier).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Both the bus instance and the mock function must be hoisted so they're
// initialized before Vitest's hoisted vi.mock factories run.
const { realBus, mockOnLogin } = vi.hoisted(() => {
  // Inline mitt-style emitter to avoid touching the real package during
  // hoisted module init.
  const handlers = new Map<string, Set<(p: unknown) => void>>()
  return {
    realBus: {
      on(type: string, h: (p: unknown) => void) {
        if (!handlers.has(type)) handlers.set(type, new Set())
        handlers.get(type)!.add(h)
      },
      off(type: string, h: (p: unknown) => void) {
        handlers.get(type)?.delete(h)
      },
      emit(type: string, payload?: unknown) {
        handlers.get(type)?.forEach((h) => h(payload))
      },
    },
    mockOnLogin: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('@/lib/bus', () => ({ bus: realBus }))
vi.mock('../bootstrap', () => ({
  useBootstrap: () => ({ onLogin: mockOnLogin }),
}))

import { bootstrapReady } from '../auth'

describe('lib/auth orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnLogin.mockResolvedValue(undefined)
  })

  it('bootstrapReady resolves immediately when no auth:login has fired', async () => {
    // Caller awaits without ever triggering login — should not hang.
    await expect(bootstrapReady()).resolves.toBeUndefined()
  })

  it('bootstrapReady awaits the in-flight bootstrap after auth:login', async () => {
    let onLoginResolved = false
    mockOnLogin.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10))
      onLoginResolved = true
    })

    // Synchronous bus emit registers the in-flight promise on the orchestrator.
    realBus.emit('auth:login', { userId: 'u1' })

    // Caller sees a still-pending promise and awaits it.
    await bootstrapReady()
    expect(onLoginResolved).toBe(true)
    expect(mockOnLogin).toHaveBeenCalledOnce()
  })

  it('bootstrapReady tracks the latest cycle on relogin', async () => {
    // First cycle resolves quickly.
    realBus.emit('auth:login', { userId: 'u1' })
    await bootstrapReady()
    expect(mockOnLogin).toHaveBeenCalledTimes(1)

    // Second cycle — must reflect the second invocation.
    let secondResolved = false
    mockOnLogin.mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 10))
      secondResolved = true
    })
    realBus.emit('auth:login', { userId: 'u2' })
    await bootstrapReady()
    expect(secondResolved).toBe(true)
    expect(mockOnLogin).toHaveBeenCalledTimes(2)
  })

  it('bootstrap failures reject so navigators can block + surface an error', async () => {
    mockOnLogin.mockRejectedValueOnce(new Error('profile fetch failed'))

    realBus.emit('auth:login', { userId: 'u1' })

    // Rejection propagates — navigators await this and decide what to do
    // (display error UI, retry, etc.) rather than landing the user in a
    // half-bootstrapped authenticated shell.
    await expect(bootstrapReady()).rejects.toThrow('profile fetch failed')
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { useUpdateChecker } from '../useUpdateChecker'
import { useAppStore } from '../../stores/appStore'

// Helper component to trigger lifecycle hooks
function mountWithChecker() {
  const TestComponent = defineComponent({
    setup() {
      useUpdateChecker()
      return {}
    },
    template: '<div />',
  })
  return mount(TestComponent)
}

describe('useUpdateChecker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls checkVersion immediately on mount', async () => {
    const appStore = useAppStore()
    const spy = vi.spyOn(appStore, 'checkVersion').mockResolvedValue({
      success: true,
      data: { updateAvailable: false, frontendVersion: '0.5.0', currentVersion: '0.5.0' },
    })

    mountWithChecker()

    // flush the microtask from the immediate call
    await flushPromises()

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('schedules periodic checks after the initial call', async () => {
    const appStore = useAppStore()
    const spy = vi.spyOn(appStore, 'checkVersion').mockResolvedValue({
      success: true,
      data: { updateAvailable: false, frontendVersion: '0.5.0', currentVersion: '0.5.0' },
    })

    mountWithChecker()
    await flushPromises()

    expect(spy).toHaveBeenCalledTimes(1)

    // Advance by 5 minutes (base interval)
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

    expect(spy).toHaveBeenCalledTimes(2)

    // Another 5 minutes
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('clears timer on unmount — no further calls', async () => {
    const appStore = useAppStore()
    const spy = vi.spyOn(appStore, 'checkVersion').mockResolvedValue({
      success: true,
      data: { updateAvailable: false, frontendVersion: '0.5.0', currentVersion: '0.5.0' },
    })

    const wrapper = mountWithChecker()
    await flushPromises()

    expect(spy).toHaveBeenCalledTimes(1)

    wrapper.unmount()

    // Advance well past the interval
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)

    // Should still be 1 — no new calls after unmount
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('handles API errors gracefully without unhandled rejections', async () => {
    const appStore = useAppStore()
    const spy = vi.spyOn(appStore, 'checkVersion').mockRejectedValue(new Error('Network error'))

    mountWithChecker()

    // Should not throw
    await flushPromises()

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('uses exponential backoff on consecutive failures', async () => {
    const appStore = useAppStore()
    const spy = vi.spyOn(appStore, 'checkVersion').mockResolvedValue({
      success: false,
      message: 'Server error',
    })

    mountWithChecker()
    await flushPromises()

    // First call done
    expect(spy).toHaveBeenCalledTimes(1)

    // After first failure: delay = 5min * 2^1 = 10min
    // Advancing by 5 min should NOT trigger another call
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(spy).toHaveBeenCalledTimes(1)

    // Advance to 10 min total
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(spy).toHaveBeenCalledTimes(2)

    // After second failure: delay = 5min * 2^2 = 20min
    await vi.advanceTimersByTimeAsync(19 * 60 * 1000)
    expect(spy).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1 * 60 * 1000)
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('resets backoff on success after failures', async () => {
    const appStore = useAppStore()
    const spy = vi.spyOn(appStore, 'checkVersion')
      // First call: failure
      .mockResolvedValueOnce({ success: false, message: 'error' })
      // Second call: success
      .mockResolvedValueOnce({
        success: true,
        data: { updateAvailable: false, frontendVersion: '0.5.0', currentVersion: '0.5.0' },
      })
      // Third call: success
      .mockResolvedValueOnce({
        success: true,
        data: { updateAvailable: false, frontendVersion: '0.5.0', currentVersion: '0.5.0' },
      })

    mountWithChecker()
    await flushPromises()

    // First call (failure) done — next delay = 10 min
    expect(spy).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    expect(spy).toHaveBeenCalledTimes(2)

    // Second call succeeded — backoff resets to 5 min
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('caps backoff at 30 minutes', async () => {
    const appStore = useAppStore()
    const spy = vi.spyOn(appStore, 'checkVersion').mockResolvedValue({
      success: false,
      message: 'error',
    })

    mountWithChecker()
    await flushPromises()

    // Failure 1 done. Next delays: 10min, 20min, 30min (capped), 30min, ...
    // Advance through failures to hit the cap
    // failure 1 -> delay 10min
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    expect(spy).toHaveBeenCalledTimes(2)

    // failure 2 -> delay 20min
    await vi.advanceTimersByTimeAsync(20 * 60 * 1000)
    expect(spy).toHaveBeenCalledTimes(3)

    // failure 3 -> delay 40min but capped at 30min
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    expect(spy).toHaveBeenCalledTimes(4)

    // failure 4 -> still capped at 30min
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    expect(spy).toHaveBeenCalledTimes(5)
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { usePwaInstall, promptInstall } from '../usePwaInstall'
import { useAppStore } from '../../stores/appStore'

function mountWithPwaInstall() {
  const TestComponent = defineComponent({
    setup() {
      usePwaInstall()
      return {}
    },
    template: '<div />',
  })
  return mount(TestComponent)
}

function createMockBeforeInstallPromptEvent(): Event & {
  prompt: ReturnType<typeof vi.fn>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
} {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  ;(event as any).prompt = vi.fn().mockResolvedValue(undefined)
  ;(event as any).userChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' })
  return event as any
}

describe('usePwaInstall', () => {
  const wrappers: VueWrapper[] = []

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    while (wrappers.length > 0) {
      const wrapper = wrappers.pop()
      try {
        wrapper?.unmount()
      } catch {
        // ignore already-unmounted wrappers
      }
    }
  })

  it('sets canInstallPwa to true when beforeinstallprompt fires', () => {
    const appStore = useAppStore()
    wrappers.push(mountWithPwaInstall())

    expect(appStore.canInstallPwa).toBe(false)

    window.dispatchEvent(createMockBeforeInstallPromptEvent())

    expect(appStore.canInstallPwa).toBe(true)
  })

  it('sets canInstallPwa to false when appinstalled fires', () => {
    const appStore = useAppStore()
    wrappers.push(mountWithPwaInstall())

    window.dispatchEvent(createMockBeforeInstallPromptEvent())
    expect(appStore.canInstallPwa).toBe(true)

    window.dispatchEvent(new Event('appinstalled'))
    expect(appStore.canInstallPwa).toBe(false)
  })

  it('promptInstall calls prompt() on the captured event', async () => {
    const appStore = useAppStore()
    wrappers.push(mountWithPwaInstall())

    const mockEvent = createMockBeforeInstallPromptEvent()
    window.dispatchEvent(mockEvent)

    await promptInstall()

    expect(mockEvent.prompt).toHaveBeenCalledOnce()
    expect(appStore.canInstallPwa).toBe(false)
  })

  it('promptInstall does nothing when no event is captured', async () => {
    wrappers.push(mountWithPwaInstall())

    // Should not throw
    await promptInstall()
  })

  it('clears canInstallPwa after user dismisses the install dialog', async () => {
    const appStore = useAppStore()
    wrappers.push(mountWithPwaInstall())

    const mockEvent = createMockBeforeInstallPromptEvent()
    ;(mockEvent as any).userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' })
    window.dispatchEvent(mockEvent)

    await promptInstall()

    expect(appStore.canInstallPwa).toBe(false)
  })

  it('removes event listeners on unmount', () => {
    const appStore = useAppStore()
    const wrapper = mountWithPwaInstall()
    wrappers.push(wrapper)

    wrapper.unmount()

    window.dispatchEvent(createMockBeforeInstallPromptEvent())
    expect(appStore.canInstallPwa).toBe(false)
  })
})

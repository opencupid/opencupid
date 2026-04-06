import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockReplace = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useRoute: () => ({ name: 'Browse' }),
}))

vi.mock('@/features/shared/composables/useNativeOffcanvas', () => ({
  useNativeOffcanvas: vi.fn(),
}))

const mockDrawerType = ref<'profile' | 'inbox' | null>(null)

vi.mock('@/features/app/composables/useAppShellState', () => ({
  useAppShellState: () => ({ drawerType: mockDrawerType }),
}))

// Stub child panels to avoid pulling in deep dependencies
vi.mock('@/features/myprofile/components/ProfilePanel.vue', () => ({
  default: { name: 'ProfilePanel', template: '<div data-testid="profile-panel" />' },
}))
vi.mock('@/features/messaging/components/InboxPanel.vue', () => ({
  default: { name: 'InboxPanel', template: '<div data-testid="inbox-panel" />' },
}))

import OwnerDrawerOrchestrator from '../OwnerDrawerOrchestrator.vue'

describe('OwnerDrawerOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDrawerType.value = null
  })

  it('renders ProfilePanel when drawerType is profile', () => {
    mockDrawerType.value = 'profile'
    const wrapper = mount(OwnerDrawerOrchestrator, {
      global: { stubs: { OwnerDrawer: { template: '<div><slot /></div>' } } },
    })
    expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="inbox-panel"]').exists()).toBe(false)
  })

  it('renders InboxPanel when drawerType is inbox', () => {
    mockDrawerType.value = 'inbox'
    const wrapper = mount(OwnerDrawerOrchestrator, {
      global: { stubs: { OwnerDrawer: { template: '<div><slot /></div>' } } },
    })
    expect(wrapper.find('[data-testid="inbox-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(false)
  })

  it('renders nothing when drawerType is null', () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      global: { stubs: { OwnerDrawer: { template: '<div><slot /></div>' } } },
    })
    expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="inbox-panel"]').exists()).toBe(false)
  })

  it('does not wire close events — panels navigate directly', () => {
    // Close is now handled inside each panel via router.replace({ name: 'Browse' }).
    // OwnerDrawerOrchestrator is purely a slot dispatcher — no @close handlers.
    mockDrawerType.value = 'profile'
    const wrapper = mount(OwnerDrawerOrchestrator, {
      global: { stubs: { OwnerDrawer: { template: '<div><slot /></div>' } } },
    })
    expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(true)
    expect(mockReplace).not.toHaveBeenCalled()
  })
})

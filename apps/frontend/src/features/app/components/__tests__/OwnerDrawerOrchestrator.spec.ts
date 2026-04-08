import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

const mockReplace = vi.fn()
let mockRouteName = 'Browse'

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useRoute: () => ({
    get name() {
      return mockRouteName
    },
  }),
}))

const mockDrawerType = ref<'profile' | 'inbox' | null>(null)

vi.mock('@/features/app/composables/useAppShellState', () => ({
  useAppShellState: () => ({ drawerType: mockDrawerType }),
}))

// Stub the panels to avoid pulling in their deep dependency trees.
vi.mock('@/features/myprofile/components/ProfilePanel.vue', () => ({
  default: { name: 'ProfilePanel', template: '<div data-testid="profile-panel" />' },
}))
vi.mock('@/features/messaging/components/InboxPanel.vue', () => ({
  default: { name: 'InboxPanel', template: '<div data-testid="inbox-panel" />' },
}))

// Pass-through BOffcanvas stub that re-emits modelValue updates and exposes
// a triggerable @hidden event so tests can simulate Bootstrap's slide-out
// completion (which the orchestrator listens for to clear `displayedType`).
const BOffcanvasStub = defineComponent({
  name: 'BOffcanvas',
  props: ['modelValue'],
  emits: ['update:modelValue', 'hidden'],
  setup(_, { slots }) {
    return () => h('div', { class: 'offcanvas-stub' }, slots.default?.())
  },
})

import OwnerDrawerOrchestrator from '../OwnerDrawerOrchestrator.vue'

const mountIt = () =>
  mount(OwnerDrawerOrchestrator, {
    global: { stubs: { BOffcanvas: BOffcanvasStub } },
  })

describe('OwnerDrawerOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDrawerType.value = null
    mockRouteName = 'Browse'
  })

  describe('content dispatch', () => {
    it('renders ProfilePanel when drawerType is profile', async () => {
      mockDrawerType.value = 'profile'
      const wrapper = mountIt()
      await nextTick()
      expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="inbox-panel"]').exists()).toBe(false)
    })

    it('renders InboxPanel when drawerType is inbox', async () => {
      mockDrawerType.value = 'inbox'
      const wrapper = mountIt()
      await nextTick()
      expect(wrapper.find('[data-testid="inbox-panel"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(false)
    })

    it('renders nothing when drawerType is null', async () => {
      const wrapper = mountIt()
      await nextTick()
      expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="inbox-panel"]').exists()).toBe(false)
    })

    it('swaps content in place when drawerType changes between truthy values', async () => {
      mockDrawerType.value = 'profile'
      const wrapper = mountIt()
      await nextTick()
      expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(true)
      mockDrawerType.value = 'inbox'
      await nextTick()
      expect(wrapper.find('[data-testid="inbox-panel"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(false)
    })
  })

  describe('two-phase teardown (no content flash)', () => {
    it('keeps content mounted when drawerType becomes null (waits for hidden)', async () => {
      mockDrawerType.value = 'profile'
      const wrapper = mountIt()
      await nextTick()
      mockDrawerType.value = null
      await nextTick()
      // Content stays visible during BOffcanvas slide-out animation
      expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(true)
    })

    it('unmounts content only after BOffcanvas emits @hidden', async () => {
      mockDrawerType.value = 'profile'
      const wrapper = mountIt()
      await nextTick()
      mockDrawerType.value = null
      await nextTick()
      wrapper.findComponent(BOffcanvasStub).vm.$emit('hidden')
      await nextTick()
      expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(false)
    })
  })

  describe('dismiss navigation', () => {
    it('calls router.replace({ name: "Browse" }) when closed on a panel route', async () => {
      mockRouteName = 'Me'
      mockDrawerType.value = 'profile'
      const wrapper = mountIt()
      await nextTick()
      // Simulate user pressing ESC / clicking backdrop: BOffcanvas emits update:modelValue=false
      wrapper.findComponent(BOffcanvasStub).vm.$emit('update:modelValue', false)
      await nextTick()
      expect(mockReplace).toHaveBeenCalledWith({ name: 'Browse' })
    })

    it('does not call router.replace when already on Browse', async () => {
      mockRouteName = 'Browse'
      mockDrawerType.value = 'profile'
      const wrapper = mountIt()
      await nextTick()
      wrapper.findComponent(BOffcanvasStub).vm.$emit('update:modelValue', false)
      await nextTick()
      expect(mockReplace).not.toHaveBeenCalled()
    })
  })
})

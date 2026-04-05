import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OwnerDrawerOrchestrator from '../OwnerDrawerOrchestrator.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}))

vi.mock('extendable-media-recorder', () => ({
  MediaRecorder: vi.fn(),
  register: vi.fn(),
  IMediaRecorder: {},
}))
vi.mock('extendable-media-recorder-wav-encoder', () => ({
  connect: vi.fn(),
}))

vi.mock('@/features/shared/composables/useNativeOffcanvas', () => ({
  useNativeOffcanvas: vi.fn(),
}))

const mockClose = vi.fn()

vi.mock('@/features/shared/composables/useOffcanvasState', () => ({
  useOffcanvasState: () => ({
    close: mockClose,
    isOpen: vi.fn(() => false),
    activePanel: { value: null },
  }),
}))

const globalConfig = {
  stubs: {
    OwnerDrawer: { template: '<div><slot /></div>' },
    ProfilePanel: {
      name: 'ProfilePanel',
      template: '<div data-testid="profile-panel" />',
      emits: ['close'],
    },
    InboxPanel: {
      name: 'InboxPanel',
      template: '<div data-testid="inbox-panel" />',
      emits: ['close'],
    },
  },
  mocks: { $t: (k: string) => k },
}

describe('OwnerDrawerOrchestrator', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders ProfilePanel for profile panel', () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="inbox-panel"]').exists()).toBe(false)
  })

  it('renders InboxPanel for inbox panel', () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'inbox' },
      global: globalConfig,
    })
    expect(wrapper.find('[data-testid="inbox-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="profile-panel"]').exists()).toBe(false)
  })

  it('calls offcanvasState.close on close emit from ProfilePanel', async () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.findComponent({ name: 'ProfilePanel' }).vm.$emit('close')
    expect(mockClose).toHaveBeenCalled()
  })

  it('calls offcanvasState.close on close emit from InboxPanel', async () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'inbox' },
      global: globalConfig,
    })
    await wrapper.findComponent({ name: 'InboxPanel' }).vm.$emit('close')
    expect(mockClose).toHaveBeenCalled()
  })
})

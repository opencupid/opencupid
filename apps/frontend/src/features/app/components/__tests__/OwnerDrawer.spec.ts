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

vi.mock('@/features/myprofile/composables/useMyProfileViewModel', () => ({
  useMyProfileViewModel: () => ({
    viewState: { isEditable: false },
    formData: { publicName: 'Test User' },
    profilePreview: null,
    updateProfile: vi.fn(),
  }),
}))

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({
    profile: { publicName: 'Test User', profileImages: [] },
    optInSettings: {},
    fetchOptInSettings: vi.fn(),
    fetchOwnerProfile: vi.fn(),
  }),
}))

vi.mock('@/features/app/composables/useNotificationState', () => ({
  useNotificationState: () => ({
    hasUnreadMessages: false,
    hasMatchNotifications: false,
  }),
}))

vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => ({
    activeConversation: null,
    isLoading: false,
    resetActiveConversation: vi.fn(),
    setActiveConversationById: vi.fn(),
    markAsRead: vi.fn(),
    fetchConversations: vi.fn(),
    suppressMessageNotifications: false,
  }),
}))

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn() }),
}))

// Child views are stubbed — they emit events the orchestrator reacts to
const globalConfig = {
  stubs: {
    OwnerDrawer: { template: '<div><slot /></div>' },
    MyProfileView: {
      name: 'MyProfileView',
      template: '<div data-testid="my-profile-view" />',
      emits: ['navigate:settings', 'close'],
    },
    SettingsView: {
      name: 'SettingsView',
      template: '<div data-testid="settings-view" />',
      emits: ['back', 'close'],
    },
    MessagingView: {
      name: 'MessagingView',
      template: '<div data-testid="messaging-view" />',
      emits: ['convo:select', 'close'],
    },
    PostList: true,
    ConversationDetail: {
      name: 'ConversationDetail',
      template: '<div data-testid="conversation-detail" />',
      emits: ['deselect:convo', 'close'],
    },
    BButton: true,
  },
  mocks: { $t: (k: string) => k },
}

describe('OwnerDrawerOrchestrator', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders MyProfileView for profile panel', () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    expect(wrapper.find('[data-testid="my-profile-view"]').exists()).toBe(true)
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
  })

  it('switches to SettingsView on navigate:settings emit from MyProfileView', async () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.findComponent({ name: 'MyProfileView' }).vm.$emit('navigate:settings')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="settings-view"]').exists()).toBe(true)
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(false)
  })

  it('returns to MyProfileView on back emit from SettingsView', async () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.findComponent({ name: 'MyProfileView' }).vm.$emit('navigate:settings')
    await wrapper.vm.$nextTick()
    await wrapper.findComponent({ name: 'SettingsView' }).vm.$emit('back')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="my-profile-view"]').exists()).toBe(true)
  })

  it('renders MessagingView for inbox panel', () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'inbox' },
      global: globalConfig,
    })
    expect(wrapper.find('[data-testid="messaging-view"]').exists()).toBe(true)
  })

  it('calls offcanvasState.close on close emit from child', async () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.findComponent({ name: 'MyProfileView' }).vm.$emit('close')
    expect(mockClose).toHaveBeenCalled()
  })
})

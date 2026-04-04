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

vi.mock('@/assets/icons/interface/setting-2.svg', () => ({
  default: { template: '<span data-testid="icon-settings" />' },
}))
vi.mock('@/assets/icons/interface/logout.svg', () => ({
  default: { template: '<span data-testid="icon-logout" />' },
}))
vi.mock('@/assets/icons/interface/backward.svg', () => ({
  default: { template: '<span data-testid="icon-backward" />' },
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

const globalConfig = {
  stubs: {
    OwnerDrawer: { template: '<div><slot name="header" /><slot /></div>' },
    MyProfileView: true,
    SettingsView: true,
    MessagingView: true,
    PostList: true,
    ProfileImage: true,
    ConversationDetail: true,
    BButton: true,
  },
  mocks: { $t: (k: string) => k },
}

describe('OwnerDrawerOrchestrator', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows profile panel when panel=profile', () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Test User')
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
  })

  it('gear icon switches to settings sub-view', async () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.find('[aria-label="settings.title"]').trigger('click')
    expect(wrapper.text()).toContain('settings.title')
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(false)
  })

  it('back button from settings returns to profile tab', async () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.find('[aria-label="settings.title"]').trigger('click')
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
  })

  it('shows inbox panel when panel=inbox', () => {
    const wrapper = mount(OwnerDrawerOrchestrator, {
      props: { panel: 'inbox' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('messaging.inbox_title')
  })
})

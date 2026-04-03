import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import UserOffcanvas from '../UserOffcanvas.vue'

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

// SVG icons need module-level mocks (jsdom rejects hyphenated tag names)
vi.mock('@/assets/icons/interface/setting-2.svg', () => ({
  default: { template: '<span data-testid="icon-settings" />' },
}))
vi.mock('@/assets/icons/interface/logout.svg', () => ({
  default: { template: '<span data-testid="icon-logout" />' },
}))
vi.mock('@/assets/icons/interface/backward.svg', () => ({
  default: { template: '<span data-testid="icon-backward" />' },
}))

// Suppress Bootstrap offcanvas JS (no DOM in jsdom)
vi.mock('@/features/shared/composables/useNativeOffcanvas', () => ({
  useNativeOffcanvas: vi.fn(),
}))

const mockOpen = vi.fn()
const mockClose = vi.fn()
const mockIsOpen = vi.fn(() => false)

vi.mock('@/features/shared/composables/useOffcanvasState', () => ({
  useOffcanvasState: () => ({
    open: mockOpen,
    close: mockClose,
    isOpen: mockIsOpen,
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

vi.mock('@/features/messaging/composables/useMessagingViewModel', () => ({
  useMessagingViewModel: () => ({
    conversations: [],
    activeConversation: null,
    isLoading: false,
    haveConversations: false,
    isInitialized: false,
    handleSelectConvo: vi.fn(),
    handleMatchSelect: vi.fn(),
    handleReceivedLikeSelect: vi.fn(),
    handleMessageSent: vi.fn(),
    initialize: vi.fn(),
    fetchConversations: vi.fn(),
    matches: [],
    haveMatches: false,
    showEmptyState: true,
    showMessageModal: false,
    messageProfile: null,
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

vi.mock('@/store/userStore', () => ({
  useUserStore: () => ({
    user: { email: 'test@example.org', phonenumber: null },
    fetchUser: vi.fn(),
  }),
}))

vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: () => ({
    logout: vi.fn(),
  }),
}))

vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => ({
    resetActiveConversation: vi.fn(),
    setActiveConversationById: vi.fn(),
    markAsRead: vi.fn(),
  }),
}))

const globalConfig = {
  stubs: {
    ProfileContent: true,
    EditableFields: { template: '<div><slot /></div>' },
    EditSaveButton: true,
    PostList: true,
    ProfileImage: true,
    LanguageSelectorDropdown: true,
    OptInCheckboxes: true,
    VersionInfo: true,
    PwaInstallButton: true,
    MatchesList: true,
    ReceivedLikesTeaser: true,
    ConversationSummaries: true,
    ConversationDetail: true,
    SendMessageDialog: true,
    BButton: true,
  },
  mocks: { $t: (k: string) => k },
}

describe('UserOffcanvas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows profile panel when panel=profile', () => {
    const wrapper = mount(UserOffcanvas, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Test User')
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
  })

  it('gear icon switches to settings sub-view', async () => {
    const wrapper = mount(UserOffcanvas, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.find('[aria-label="settings.title"]').trigger('click')
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(false)
  })

  it('back button from settings returns to profile tab', async () => {
    const wrapper = mount(UserOffcanvas, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.find('[aria-label="settings.title"]').trigger('click')
    // Back button is the first button in settings header
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
  })

  it('shows inbox panel when panel=inbox', () => {
    const wrapper = mount(UserOffcanvas, {
      props: { panel: 'inbox' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('messaging.inbox_title')
  })

  it('clicking close calls offcanvasState.close', async () => {
    const wrapper = mount(UserOffcanvas, {
      props: { panel: 'profile' },
      global: globalConfig,
    })
    await wrapper.find('.btn-close').trigger('click')
    expect(mockClose).toHaveBeenCalled()
  })
})

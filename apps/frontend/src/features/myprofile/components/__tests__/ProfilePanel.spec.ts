import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import type { ProfileSubView } from '@/features/myprofile/composables/useMyProfileRouteState'

const mockReplace = vi.fn()
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => ({ name: 'Me', params: {} }),
}))

// Control subView from tests
const mockSubView = ref<ProfileSubView>('myprofile')
const mockEditingPostId = ref<string | undefined>(undefined)

vi.mock('@/features/myprofile/composables/useMyProfileRouteState', () => ({
  useMyProfileRouteState: () => ({
    subView: computed(() => mockSubView.value),
    editingPostId: computed(() => mockEditingPostId.value),
  }),
}))

vi.mock('extendable-media-recorder', () => ({
  MediaRecorder: vi.fn(),
  register: vi.fn(),
  IMediaRecorder: {},
}))
vi.mock('extendable-media-recorder-wav-encoder', () => ({
  connect: vi.fn(),
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

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn() }),
}))

vi.mock('@/assets/icons/interface/setting-2.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/backward.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/features/images/components/ProfileImage.vue', () => ({
  default: { template: '<span />' },
}))

import ProfilePanel from '../ProfilePanel.vue'

const globalConfig = {
  stubs: {
    MyProfile: {
      name: 'MyProfile',
      template: '<div data-testid="my-profile-view" />',
    },
    Settings: {
      name: 'Settings',
      template: '<div data-testid="settings-view" />',
      emits: ['close'],
    },
    PostList: {
      name: 'PostList',
      template: '<div data-testid="post-list" />',
    },
    PostsOrchestrator: {
      name: 'PostsOrchestrator',
      template: '<div data-testid="post-list" />',
    },
    DatingPrefs: { name: 'DatingPrefs', template: '<div />', emits: ['close'] },
    DatingWizard: { name: 'DatingWizard', template: '<div />', emits: ['close'] },
    ProfileImage: { template: '<span />' },
    IconSetting2: { template: '<span />' },
    IconBackward: { template: '<span />' },
    PanelHeader: {
      name: 'PanelHeader',
      template: '<div data-testid="panel-header"><slot name="title" /></div>',
      emits: ['back'],
    },
  },
  mocks: { $t: (k: string) => k },
}

describe('ProfilePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubView.value = 'myprofile'
    mockEditingPostId.value = undefined
  })

  it('shows MyProfileView and tab bar on myprofile subView', () => {
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    expect(wrapper.find('[data-testid="my-profile-view"]').exists()).toBe(true)
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
    expect(wrapper.find('[data-testid="settings-view"]').exists()).toBe(false)
  })

  it('shows SettingsView on settings subView', () => {
    mockSubView.value = 'settings'
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    expect(wrapper.find('[data-testid="settings-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="my-profile-view"]').exists()).toBe(false)
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(false)
  })

  it('shows PostList on myposts subView', () => {
    mockSubView.value = 'myposts'
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    expect(wrapper.find('[data-testid="post-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="my-profile-view"]').exists()).toBe(false)
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
  })

  it('settings button calls router.push({ name: MeSettings })', async () => {
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    await wrapper.find('[aria-label="settings.title"]').trigger('click')
    expect(mockPush).toHaveBeenCalledWith({ name: 'MeSettings' })
  })

  it('PanelHeader back emits router.replace({ name: Me }) on settings subView', async () => {
    mockSubView.value = 'settings'
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    await wrapper.findComponent({ name: 'PanelHeader' }).vm.$emit('back')
    expect(mockReplace).toHaveBeenCalledWith({ name: 'Me' })
  })

  it('posts tab click calls router.replace({ name: MePosts })', async () => {
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    const tabs = wrapper.findAll('ul.nav-tabs button')
    await tabs[1]!.trigger('click')
    expect(mockReplace).toHaveBeenCalledWith({ name: 'MePosts' })
  })

  it('close button calls router.replace({ name: Browse })', async () => {
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    await wrapper.find('[aria-label="common.close"]').trigger('click')
    expect(mockReplace).toHaveBeenCalledWith({ name: 'Browse' })
  })

  it('SettingsView close event calls router.replace({ name: Browse })', async () => {
    mockSubView.value = 'settings'
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    await wrapper.findComponent({ name: 'Settings' }).vm.$emit('close')
    expect(mockReplace).toHaveBeenCalledWith({ name: 'Browse' })
  })
})

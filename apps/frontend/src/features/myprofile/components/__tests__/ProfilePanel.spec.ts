import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfilePanel from '../ProfilePanel.vue'

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

const globalConfig = {
  stubs: {
    MyProfileView: {
      name: 'MyProfileView',
      template: '<div data-testid="my-profile-view" />',
    },
    SettingsView: {
      name: 'SettingsView',
      template: '<div data-testid="settings-view" />',
      emits: ['close'],
    },
    PostList: {
      name: 'PostList',
      template: '<div data-testid="post-list" />',
    },
    ProfileImage: { template: '<span />' },
    IconSetting2: { template: '<span />' },
    IconBackward: { template: '<span />' },
  },
  mocks: { $t: (k: string) => k },
}

describe('ProfilePanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows MyProfileView and tab bar by default', () => {
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    expect(wrapper.find('[data-testid="my-profile-view"]').exists()).toBe(true)
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
    expect(wrapper.find('[data-testid="settings-view"]').exists()).toBe(false)
  })

  it('switches to SettingsView when gear button is clicked', async () => {
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    await wrapper.find('[aria-label="settings.title"]').trigger('click')
    expect(wrapper.find('[data-testid="settings-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="my-profile-view"]').exists()).toBe(false)
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(false)
  })

  it('returns to MyProfileView when back button is clicked from settings', async () => {
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    await wrapper.find('[aria-label="settings.title"]').trigger('click')
    await wrapper.find('[aria-label="common.back"]').trigger('click')
    expect(wrapper.find('[data-testid="my-profile-view"]').exists()).toBe(true)
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
  })

  it('switches to PostList when posts tab is clicked', async () => {
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    const tabs = wrapper.findAll('ul.nav-tabs button')
    await tabs[1]!.trigger('click')
    expect(wrapper.find('[data-testid="post-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="my-profile-view"]').exists()).toBe(false)
    expect(wrapper.find('ul.nav-tabs').exists()).toBe(true)
  })

  it('emits close when header close button is clicked', async () => {
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    await wrapper.find('[aria-label="common.close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close when SettingsView emits close (logout)', async () => {
    const wrapper = mount(ProfilePanel, { global: globalConfig })
    await wrapper.find('[aria-label="settings.title"]').trigger('click')
    await wrapper.findComponent({ name: 'SettingsView' }).vm.$emit('close')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})

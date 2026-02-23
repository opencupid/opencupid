import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'

vi.mock('@/features/shared/profiledisplay/TagList.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/shared/profiledisplay/LanguageList.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/shared/ui/StoreErrorOverlay.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/call.svg', () => ({
  default: { template: '<span data-testid="icon-call" />' },
}))
vi.mock('extendable-media-recorder', () => ({
  MediaRecorder: vi.fn(),
  register: vi.fn(),
  IMediaRecorder: {},
}))
vi.mock('extendable-media-recorder-wav-encoder', () => ({
  connect: vi.fn(),
}))

import SendMessageForm from '../components/SendMessageForm.vue'
import { useLocalStore } from '@/store/localStore'

describe('SendMessageForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Initialize localStorage
    localStorage.clear()
  })

  const mockRecipient: PublicProfileWithContext = {
    id: '123',
    publicName: 'Test User',
    isDatingActive: false,
    languages: [],
    tags: [],
    profileImages: [],
    location: {
      country: 'US',
      cityName: 'Test City',
      lat: null,
      lon: null,
    },
    introSocial: '',
    introDating: '',
    conversation: null,
    interactionContext: {
      likedByMe: false,
      isMatch: false,
      passedByMe: false,
      canLike: false,
      canPass: false,
      canDate: false,
      haveConversation: false,
      canMessage: true,
      conversationId: null,
      initiated: false,
    },
  }

  it('defaults to "enter" send mode', () => {
    const localStore = useLocalStore()
    expect(localStore.getSendMode).toBe('enter')
  })

  it('changes send mode when user selects option', async () => {
    const localStore = useLocalStore()
    const wrapper = mount(SendMessageForm, {
      props: {
        recipientProfile: mockRecipient,
        conversationId: null,
      },
      global: {
        stubs: {
          BFormGroup: true,
          BFormTextarea: true,
          BButton: true,
          BDropdown: true,
          BDropdownItem: true,
          TagList: true,
          LanguageList: true,
          StoreErrorOverlay: true,
          VoiceRecorder: true,
          IconMenuDotsVert: true,
          Mic2Icon: true,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    // Change to click mode
    localStore.setSendMode('click')
    await wrapper.vm.$nextTick()

    expect(localStore.getSendMode).toBe('click')
    expect(localStorage.getItem('sendMode')).toBe('click')

    // Change back to enter mode
    localStore.setSendMode('enter')
    await wrapper.vm.$nextTick()

    expect(localStore.getSendMode).toBe('enter')
    expect(localStorage.getItem('sendMode')).toBe('enter')
  })

  it('persists send mode preference in localStorage', () => {
    const localStore = useLocalStore()

    localStore.setSendMode('click')
    expect(localStorage.getItem('sendMode')).toBe('click')

    // Simulate page reload by creating new store instance
    const pinia = createPinia()
    setActivePinia(pinia)
    const newLocalStore = useLocalStore()
    newLocalStore.initialize()

    expect(newLocalStore.getSendMode).toBe('click')
  })

  function mountForm(props: Record<string, unknown> = {}) {
    return mount(SendMessageForm, {
      props: {
        recipientProfile: mockRecipient,
        conversationId: 'conv-1',
        ...props,
      },
      global: {
        stubs: {
          BFormGroup: true,
          BFormTextarea: true,
          BButton: true,
          BDropdown: true,
          BDropdownItem: true,
          TagList: true,
          LanguageList: true,
          StoreErrorOverlay: true,
          VoiceRecorder: true,
          IconMenuDotsVert: true,
          IconCall: true,
          Mic2Icon: true,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
  }

  it('shows call button when canCall is true', () => {
    const wrapper = mountForm({ canCall: true })
    expect(wrapper.find('[title="calls.call_button_title"]').exists()).toBe(true)
  })

  it('hides call button when canCall is false', () => {
    const wrapper = mountForm({ canCall: false })
    expect(wrapper.find('[title="calls.call_button_title"]').exists()).toBe(false)
  })

  it('hides call button while recording voice message', async () => {
    const wrapper = mountForm({ canCall: true })
    expect(wrapper.find('[title="calls.call_button_title"]').exists()).toBe(true)

    // Simulate recording started
    const voiceRecorder = wrapper.findComponent({ name: 'VoiceRecorder' })
    await voiceRecorder.vm.$emit('recording:started')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[title="calls.call_button_title"]').exists()).toBe(false)
  })

  it('renders radio buttons in dropdown menu', async () => {
    const localStore = useLocalStore()
    const wrapper = mount(SendMessageForm, {
      props: {
        recipientProfile: mockRecipient,
        conversationId: null,
      },
      global: {
        stubs: {
          BFormGroup: true,
          BFormTextarea: true,
          BButton: true,
          BDropdown: false,
          BDropdownItem: false,
          TagList: true,
          LanguageList: true,
          StoreErrorOverlay: true,
          VoiceRecorder: true,
          IconMenuDotsVert: true,
          Mic2Icon: true,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    // Find radio button inputs
    const radioButtons = wrapper.findAll('input[type="radio"]')
    expect(radioButtons.length).toBe(2)

    // First radio should be checked (enter mode is default)
    expect(radioButtons[0]!.attributes('checked')).toBeDefined()
    expect(radioButtons[1]!.attributes('checked')).toBeUndefined()

    // Change mode and verify radio states
    localStore.setSendMode('click')
    await wrapper.vm.$nextTick()

    expect(radioButtons[0]!.attributes('checked')).toBeUndefined()
    expect(radioButtons[1]!.attributes('checked')).toBeDefined()
  })
})

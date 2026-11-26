import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref } from 'vue'
import type { PublicProfile } from '@zod/profile/profile.dto'

vi.mock('@/features/shared/profiledisplay/TagList.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/shared/profiledisplay/LanguageList.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/assets/icons/interface/call.svg', () => ({
  default: { template: '<span data-testid="icon-call" />' },
}))
vi.mock('@/assets/icons/interface/cross.svg', () => ({
  default: { template: '<span />' },
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const toastError = vi.fn()
const toastInfo = vi.fn()
vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: toastError, info: toastInfo }),
}))

const apiPost = vi.fn()
const apiPatch = vi.fn()
vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => apiPost(...args),
    patch: (...args: unknown[]) => apiPatch(...args),
  },
  safeApiCall: (fn: () => unknown) => fn(),
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
import { useMessageStore } from '../stores/messageStore'

// VoiceRecorder stub that exposes reset() like the real component
const VoiceRecorderStub = {
  name: 'VoiceRecorder',
  template: '<div />',
  methods: { reset() {} },
  props: ['disabled', 'maxDuration'],
}

// ImageUpload stub — SendMessageForm renders it directly; uploads trigger
// send-on-attach via a watcher on the draft gallery store.
const ImageUploadStub = {
  name: 'ImageUpload',
  template: '<div data-testid="image-upload" />',
  props: ['store', 'preview', 'buttonClass'],
}

describe('SendMessageForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Initialize localStorage
    localStorage.clear()
  })

  const mockRecipient: PublicProfile = {
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
  }

  it('defaults to "click" send mode', () => {
    const localStore = useLocalStore()
    expect(localStore.getSendMode).toBe('click')
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
          VoiceRecorder: true,
          IconMenuDotsVert: true,
          Mic2Icon: true,
          ImageUpload: ImageUploadStub,
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
          BModal: true,
          VoiceRecorder: VoiceRecorderStub,
          VoiceMessage: true,
          IconMenuDotsVert: true,
          IconCall: true,
          Mic2Icon: true,
          ImageUpload: ImageUploadStub,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
  }

  it('gives the attach button the rounded button class', () => {
    const wrapper = mountForm()

    const attach = wrapper.findComponent(ImageUploadStub)
    expect(attach.props('buttonClass')).toContain('btn-rounded')

    // A Bootstrap size modifier would change the padding and break the circle.
    for (const modifier of ['btn-sm', 'btn-lg']) {
      expect(attach.props('buttonClass')).not.toContain(modifier)
    }
  })

  // The video call button is temporarily hidden (see SendMessageForm.vue).
  // Re-enable the tests below together with the button.
  it('does not render the call button while calls are hidden', () => {
    const wrapper = mountForm({ canCall: true })
    expect(wrapper.find('[title="calls.call_button_title"]').exists()).toBe(false)
  })

  // it('gives the call and attach buttons the same rounded button class', () => {
  //   const wrapper = mountForm({ canCall: true })
  //
  //   const call = wrapper.find('[title="calls.call_button_title"]')
  //   expect(call.classes()).toContain('btn-rounded')
  //
  //   const attach = wrapper.findComponent(ImageUploadStub)
  //   expect(attach.props('buttonClass')).toContain('btn-rounded')
  //
  //   // A Bootstrap size modifier would change the padding and break the circle.
  //   const sizeModifiers = ['btn-sm', 'btn-lg']
  //   for (const modifier of sizeModifiers) {
  //     expect(call.classes()).not.toContain(modifier)
  //     expect(attach.props('buttonClass')).not.toContain(modifier)
  //   }
  // })
  //
  // it('shows call button when canCall is true', () => {
  //   const wrapper = mountForm({ canCall: true })
  //   expect(wrapper.find('[title="calls.call_button_title"]').exists()).toBe(true)
  // })
  //
  // it('hides call button when canCall is false', () => {
  //   const wrapper = mountForm({ canCall: false })
  //   expect(wrapper.find('[title="calls.call_button_title"]').exists()).toBe(false)
  // })
  //
  // it('hides call button while recording voice message', async () => {
  //   const wrapper = mountForm({ canCall: true })
  //   expect(wrapper.find('[title="calls.call_button_title"]').exists()).toBe(true)
  //
  //   // Simulate recording started
  //   const voiceRecorder = wrapper.findComponent({ name: 'VoiceRecorder' })
  //   await voiceRecorder.vm.$emit('recording:started')
  //   await wrapper.vm.$nextTick()
  //
  //   expect(wrapper.find('[title="calls.call_button_title"]').exists()).toBe(false)
  // })

  it('hides send controls while voice recording is active', async () => {
    const wrapper = mountForm()

    // Send controls should be visible initially
    expect(wrapper.find('[data-testid="send-controls"]').exists()).toBe(true)

    // Simulate recording started
    const voiceRecorder = wrapper.findComponent({ name: 'VoiceRecorder' })
    await voiceRecorder.vm.$emit('recording:started')
    await wrapper.vm.$nextTick()

    // Send controls should be hidden during recording
    expect(wrapper.find('[data-testid="send-controls"]').exists()).toBe(false)

    // Simulate recording cancelled
    await voiceRecorder.vm.$emit('recording:cancelled')
    await wrapper.vm.$nextTick()

    // Send controls should be visible again
    expect(wrapper.find('[data-testid="send-controls"]').exists()).toBe(true)
  })

  it('locks the composer while the partner has not replied to the first message', () => {
    const wrapper = mountForm({ canReply: false })

    const textarea = wrapper.find('b-form-textarea-stub')
    expect(textarea.attributes('disabled')).toBe('true')
    expect(textarea.attributes('placeholder')).toBe('messaging.already_sent_waiting')
    expect(wrapper.findComponent({ name: 'VoiceRecorder' }).exists()).toBe(false)
    expect(wrapper.findComponent(ImageUploadStub).exists()).toBe(false)
    expect(wrapper.find('[data-testid="send-controls"]').exists()).toBe(false)
  })

  it('leaves the composer open by default', () => {
    const textarea = mountForm().find('b-form-textarea-stub')
    expect(textarea.attributes('disabled')).toBe('false')
    expect(textarea.attributes('placeholder')).toBe('messaging.message_input_placeholder')
  })

  it('passes VOICE_MESSAGE_MAX_DURATION config to VoiceRecorder', () => {
    const wrapper = mountForm()
    const voiceRecorder = wrapper.findComponent({ name: 'VoiceRecorder' })
    expect(voiceRecorder.props('maxDuration')).toBe(120)
  })

  it('shows confirmation modal on recording:maxed event', async () => {
    const wrapper = mountForm()

    // Modal should not be shown initially
    const modal = wrapper.findComponent({ name: 'BModal' })
    expect(modal.props('show')).toBeFalsy()

    // Simulate max duration reached (auto-stop)
    const voiceRecorder = wrapper.findComponent({ name: 'VoiceRecorder' })
    const fakeBlob = new Blob(['audio'], { type: 'audio/wav' })
    await voiceRecorder.vm.$emit('recording:maxed', fakeBlob, 120)
    await wrapper.vm.$nextTick()

    // Modal should be shown
    expect(modal.props('show')).toBe(true)
  })

  it('cleans up when confirm modal is cancelled', async () => {
    const wrapper = mountForm()

    // Simulate max duration reached
    const voiceRecorder = wrapper.findComponent({ name: 'VoiceRecorder' })
    const fakeBlob = new Blob(['audio'], { type: 'audio/wav' })
    await voiceRecorder.vm.$emit('recording:maxed', fakeBlob, 120)
    await wrapper.vm.$nextTick()

    const modal = wrapper.findComponent({ name: 'BModal' })
    expect(modal.props('show')).toBe(true)

    // Emit cancel from modal
    await modal.vm.$emit('cancel')
    await wrapper.vm.$nextTick()

    // Modal should be dismissed and controls restored
    expect(modal.props('show')).toBe(false)
    expect(wrapper.find('[data-testid="send-controls"]').exists()).toBe(true)
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
          VoiceRecorder: true,
          IconMenuDotsVert: true,
          Mic2Icon: true,
          ImageUpload: ImageUploadStub,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    // Find radio button inputs
    const radioButtons = wrapper.findAll('input[type="radio"]')
    expect(radioButtons.length).toBe(2)

    // Second radio should be checked (click mode is default)
    expect(radioButtons[0]!.attributes('checked')).toBeUndefined()
    expect(radioButtons[1]!.attributes('checked')).toBeDefined()

    // Change mode and verify radio states
    localStore.setSendMode('enter')
    await wrapper.vm.$nextTick()

    expect(radioButtons[0]!.attributes('checked')).toBeDefined()
    expect(radioButtons[1]!.attributes('checked')).toBeUndefined()
  })

  describe('pasting images', () => {
    const TextareaStub = {
      name: 'BFormTextarea',
      template: '<textarea />',
    }

    const uploadedImage = {
      id: 'ck2j6z1x30000a1b2c3d4e5f6',
      mimeType: 'image/jpeg',
      altText: '',
      blurhash: null,
      variants: [],
      position: 0,
    }

    function mountPasteForm() {
      const wrapper = mount(SendMessageForm, {
        props: { recipientProfile: mockRecipient, conversationId: 'conv-1' },
        global: {
          stubs: {
            BFormTextarea: TextareaStub,
            BButton: true,
            BModal: true,
            TagList: true,
            LanguageList: true,
            VoiceRecorder: VoiceRecorderStub,
            VoiceMessage: true,
            SendModeSelector: true,
            ImageUpload: ImageUploadStub,
          },
          mocks: { $t: (key: string) => key },
        },
      })
      const sendMessage = vi
        .spyOn(useMessageStore(), 'sendMessage')
        .mockResolvedValue({ success: true, data: { id: 'msg-1' } } as never)
      return { wrapper, sendMessage }
    }

    async function paste(wrapper: ReturnType<typeof mount>, files: File[]) {
      const event = new Event('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', { value: { files } })
      wrapper.find('textarea').element.dispatchEvent(event)
      await flushPromises()
      return event
    }

    beforeEach(() => {
      apiPost.mockReset()
      toastError.mockReset()
    })

    it('uploads a pasted image and sends it as an attachment', async () => {
      apiPost.mockResolvedValue({ data: { success: true, image: uploadedImage } })
      const { wrapper, sendMessage } = mountPasteForm()
      const file = new File(['x'], 'shot.png', { type: 'image/png' })

      const event = await paste(wrapper, [file])

      expect(event.defaultPrevented).toBe(true)
      expect(apiPost).toHaveBeenCalledTimes(1)
      expect(apiPost.mock.calls[0]![0]).toBe('/image')
      expect((apiPost.mock.calls[0]![1] as FormData).get('file')).toBe(file)
      expect(sendMessage).toHaveBeenCalledWith(mockRecipient.id, '', ['ck2j6z1x30000a1b2c3d4e5f6'])
      expect(wrapper.emitted('message:sent')).toHaveLength(1)
    })

    it('leaves a text-only paste to the browser', async () => {
      const { wrapper, sendMessage } = mountPasteForm()

      const event = await paste(wrapper, [])

      expect(event.defaultPrevented).toBe(false)
      expect(apiPost).not.toHaveBeenCalled()
      expect(sendMessage).not.toHaveBeenCalled()
    })

    it('ignores pasted files that are not supported images', async () => {
      const { wrapper, sendMessage } = mountPasteForm()

      const event = await paste(wrapper, [new File(['x'], 'doc.pdf', { type: 'application/pdf' })])

      expect(event.defaultPrevented).toBe(false)
      expect(apiPost).not.toHaveBeenCalled()
      expect(sendMessage).not.toHaveBeenCalled()
    })

    it('shows an error toast and sends nothing when the upload fails', async () => {
      apiPost.mockRejectedValue(new Error('boom'))
      const { wrapper, sendMessage } = mountPasteForm()

      await paste(wrapper, [new File(['x'], 'shot.png', { type: 'image/png' })])

      expect(toastError).toHaveBeenCalledTimes(1)
      expect(sendMessage).not.toHaveBeenCalled()
    })
  })

  function mountFormWithLanguages(recipientLanguages: string[], viewerLanguages: string[]) {
    const LanguageListStub = {
      name: 'LanguageList',
      template: '<div />',
      props: ['languages'],
    }
    return mount(SendMessageForm, {
      props: {
        recipientProfile: { ...mockRecipient, languages: recipientLanguages },
        conversationId: 'conv-1',
        showTags: true,
      },
      global: {
        provide: {
          viewerProfile: ref({ languages: viewerLanguages }),
        },
        stubs: {
          BFormGroup: true,
          BFormTextarea: true,
          BButton: true,
          BDropdown: true,
          BDropdownItem: true,
          TagList: true,
          LanguageList: LanguageListStub,
          BModal: true,
          VoiceRecorder: VoiceRecorderStub,
          VoiceMessage: true,
          IconMenuDotsVert: true,
          IconCall: true,
          Mic2Icon: true,
          ImageUpload: ImageUploadStub,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
  }

  it('passes only common languages to LanguageList when showTags is true', () => {
    const wrapper = mountFormWithLanguages(['en', 'fr', 'de'], ['en', 'fr', 'es'])
    const languageList = wrapper.findComponent({ name: 'LanguageList' })
    expect(languageList.props('languages')).toEqual(['en', 'fr'])
  })

  it('passes empty array to LanguageList when there are no common languages', () => {
    const wrapper = mountFormWithLanguages(['de', 'es'], ['en', 'fr'])
    const languageList = wrapper.findComponent({ name: 'LanguageList' })
    expect(languageList.props('languages')).toEqual([])
  })

  describe('editing the last message', () => {
    // v-model capable textarea exposing `element` like BFormTextarea does.
    const EditTextareaStub = defineComponent({
      name: 'BFormTextarea',
      props: ['modelValue'],
      emits: ['update:modelValue'],
      setup(_, { expose }) {
        const element = ref<HTMLTextAreaElement>()
        expose({ element, focus: () => element.value?.focus() })
        return { element }
      },
      template:
        '<textarea ref="element" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    })

    const ownMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'me',
      content: 'helo',
      messageType: 'text/plain',
      createdAt: new Date(),
      editedAt: null,
      sender: { id: 'me', publicName: 'Me', profileImages: [] },
      isMine: true,
      attachment: null,
      images: [],
    }

    function mountEditForm(conversationId = 'conv-1') {
      const store = useMessageStore()
      store.activeConversation = { conversationId: 'conv-1' } as any
      store.messages = [{ ...ownMessage }]
      const wrapper = mount(SendMessageForm, {
        props: { recipientProfile: mockRecipient, conversationId },
        global: {
          stubs: {
            BFormTextarea: EditTextareaStub,
            BButton: true,
            BModal: true,
            TagList: true,
            LanguageList: true,
            VoiceRecorder: VoiceRecorderStub,
            VoiceMessage: true,
            SendModeSelector: true,
            ImageUpload: ImageUploadStub,
          },
          mocks: { $t: (key: string) => key },
        },
      })
      const sendMessage = vi.spyOn(store, 'sendMessage')
      const editMessage = vi.spyOn(store, 'editMessage')
      return { wrapper, store, sendMessage, editMessage }
    }

    const textareaOf = (wrapper: ReturnType<typeof mount>) =>
      wrapper.find('textarea').element as HTMLTextAreaElement

    async function press(wrapper: ReturnType<typeof mount>, key: string) {
      await wrapper.find('textarea').trigger('keydown', { key })
      await flushPromises()
    }

    beforeEach(() => {
      toastInfo.mockReset()
    })

    it('ArrowUp in an empty composer loads the last own message for editing', async () => {
      const { wrapper } = mountEditForm()

      await press(wrapper, 'ArrowUp')

      expect(textareaOf(wrapper).value).toBe('helo')
      expect(wrapper.find('[data-testid="edit-banner"]').exists()).toBe(true)
      expect(wrapper.findComponent(ImageUploadStub).exists()).toBe(false)
    })

    it('still lets the unanswered first message be edited', async () => {
      const { wrapper } = mountEditForm()

      await press(wrapper, 'ArrowUp')
      await wrapper.setProps({ canReply: false })

      expect(textareaOf(wrapper).value).toBe('helo')
      expect(wrapper.find('[data-testid="send-controls"]').exists()).toBe(true)

      await press(wrapper, 'Escape')

      expect(wrapper.find('[data-testid="send-controls"]').exists()).toBe(false)
    })

    it('lets Escape through to the surrounding panel when not editing', async () => {
      const { wrapper } = mountEditForm()
      const outerEscape = vi.fn()
      wrapper.element.addEventListener('keydown', outerEscape)

      await press(wrapper, 'Escape')

      expect(outerEscape).toHaveBeenCalledTimes(1)
    })

    it('ArrowUp does nothing while a draft is being typed', async () => {
      const { wrapper, store } = mountEditForm()
      await wrapper.find('textarea').setValue('draft')

      await press(wrapper, 'ArrowUp')

      expect(store.editingMessageId).toBeNull()
      expect(textareaOf(wrapper).value).toBe('draft')
    })

    it('ArrowUp does nothing when the form is not for the open conversation', async () => {
      const { wrapper, store } = mountEditForm('conv-other')

      await press(wrapper, 'ArrowUp')

      expect(store.editingMessageId).toBeNull()
    })

    it('sending in edit mode saves the edit instead of sending a new message', async () => {
      useLocalStore().setSendMode('enter')
      const { wrapper, store, sendMessage, editMessage } = mountEditForm()
      // Real store action, only the HTTP call is faked.
      apiPatch.mockResolvedValue({
        data: { success: true, message: { ...ownMessage, content: 'hello', editedAt: new Date() } },
      })

      await press(wrapper, 'ArrowUp')
      await wrapper.find('textarea').setValue('hello')
      await press(wrapper, 'Enter')

      expect(editMessage).toHaveBeenCalledWith('msg-1', 'hello')
      expect(sendMessage).not.toHaveBeenCalled()
      expect(store.messages[0]!.content).toBe('hello')
      expect(store.editingMessageId).toBeNull()
      expect(textareaOf(wrapper).value).toBe('')
      // A successful save is not a conflict.
      expect(toastInfo).not.toHaveBeenCalled()
    })

    it('leaves edit mode without a request when the text is unchanged', async () => {
      useLocalStore().setSendMode('enter')
      const { wrapper, store, editMessage } = mountEditForm()

      await press(wrapper, 'ArrowUp')
      await press(wrapper, 'Enter')

      expect(editMessage).not.toHaveBeenCalled()
      expect(store.editingMessageId).toBeNull()
    })

    it('Escape cancels the edit and brings the draft back', async () => {
      const { wrapper, store } = mountEditForm()
      await wrapper.find('textarea').setValue('draft')

      // The pencil button starts editing even with a draft in the composer.
      store.startEditing()
      await flushPromises()
      expect(textareaOf(wrapper).value).toBe('helo')

      // Stands in for the panel/modal that closes on Esc bubbling to it.
      const outerEscape = vi.fn()
      wrapper.element.addEventListener('keydown', outerEscape)

      await press(wrapper, 'Escape')

      expect(outerEscape).not.toHaveBeenCalled()
      expect(store.editingMessageId).toBeNull()
      expect(textareaOf(wrapper).value).toBe('draft')
      expect(wrapper.find('[data-testid="edit-banner"]').exists()).toBe(false)
    })

    it('keeps the typed text and tells the user when a reply ends the edit', async () => {
      const { wrapper, store } = mountEditForm()
      await press(wrapper, 'ArrowUp')
      await wrapper.find('textarea').setValue('hello')

      store.appendMessageIfNew({ ...ownMessage, id: 'reply', isMine: false })
      await flushPromises()

      expect(toastInfo).toHaveBeenCalledWith('messaging.edit_no_longer_possible')
      expect(textareaOf(wrapper).value).toBe('hello')
      expect(wrapper.find('[data-testid="edit-banner"]').exists()).toBe(false)
    })

    it('drops out of edit mode when the server refuses the edit', async () => {
      useLocalStore().setSendMode('enter')
      const { wrapper, store, editMessage } = mountEditForm()
      editMessage.mockResolvedValue({ success: false, message: 'conflict', status: 409 })

      await press(wrapper, 'ArrowUp')
      await wrapper.find('textarea').setValue('hello')
      await press(wrapper, 'Enter')

      expect(store.editingMessageId).toBeNull()
      expect(toastInfo).toHaveBeenCalledWith('messaging.edit_no_longer_possible')
      expect(textareaOf(wrapper).value).toBe('hello')
    })
  })
})

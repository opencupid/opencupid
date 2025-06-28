import { mount, shallowMount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import MessageReceivedToast from '../MessageReceivedToast.vue'

vi.mock('@/features/images/components/ProfileImage.vue', () => ({ default: { template: '<div />' } }))

const mockMessage = {
  sender: {
    publicName: 'Alice',
    id: 1,
    imageUrl: 'https://example.com/alice.jpg'
  },
  content: 'Hello!',
  id: 123
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: vi.fn((key, params) => {
      if (key === 'messaging.new_message_notification') {
        return `New message from ${params.sender}`
      }
      if (key === 'messaging.unknown_sender') {
        return 'Unknown sender'
      }
      return key
    })
  })
}))

describe('MessageReceivedToast', () => {
  it('renders sender public name in notification', () => {
    const wrapper = mount(MessageReceivedToast, {
      props: {
        message: mockMessage,
        toastId: 1
      },
      global: {
        stubs: ['ProfileImage']
      }
    })
    expect(wrapper.text()).toContain('New message from Alice')
  })

  it('renders "Unknown sender" if publicName is missing', () => {
    const wrapper = mount(MessageReceivedToast, {
      props: {
        message: {
          ...mockMessage,
          sender: { ...mockMessage.sender, publicName: undefined }
        },
        toastId: 2
      },
      global: {
        stubs: ['ProfileImage']
      }
    })
    expect(wrapper.text()).toContain('New message from Unknown sender')
  })

  it('emits closeToast event', async () => {
    const wrapper = shallowMount(MessageReceivedToast, {
      props: {
        message: mockMessage,
        toastId: 3
      },
      global: {
        stubs: ['ProfileImage']
      }
    })
    await wrapper.vm.$emit('closeToast')
    expect(wrapper.emitted('closeToast')).toBeTruthy()
  })
})
import { mount, shallowMount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import MessageReceivedToast from '../MessageReceivedToast.vue'

vi.mock('@/features/images/components/ProfileImage.vue', () => ({ default: { template: '<div />' } }))

const mockMessage = {
  id: '123',
  conversationId: '456',
  senderId: '1',
  content: 'Hello!',
  createdAt: new Date(),
  sender: {
    id: '1',
    publicName: 'Alice',
    profileImages: [
      {
        position: 0,
        altText: 'Alice profile',
        url: 'https://example.com/alice.jpg',
        mimeType: 'image/jpeg'
      }
    ]
  }
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
          // @ts-expect-error invalid type to simulate missing publicName
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
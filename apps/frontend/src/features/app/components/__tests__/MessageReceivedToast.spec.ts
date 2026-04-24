import { describe, it, expect, beforeEach } from 'vitest'

beforeEach(() => {
  ;(window as any).__APP_I18N__ = {
    global: { t: (k: string) => k },
  }
})
import { mount } from '@vue/test-utils'
import MessageReceivedToast from '../MessageReceivedToast.vue'
import { type MessageDTO } from '@zod/messaging/messaging.dto'

function makeMessage(overrides: Partial<MessageDTO> = {}): MessageDTO {
  return {
    id: 'm1',
    conversationId: 'c1',
    senderId: 'p2',
    content: 'Hey there!',
    messageType: 'text/plain',
    createdAt: new Date(),
    sender: {
      id: 'p2',
      publicName: 'Alice',
      thumbnail: null,
    },
    isMine: false,
    attachment: null,
    ...overrides,
  } as MessageDTO
}

describe('MessageReceivedToast', () => {
  it('shows text message content', () => {
    const wrapper = mount(MessageReceivedToast, {
      props: {
        message: makeMessage(),
        toastId: 1,
      },
    })

    expect(wrapper.text()).toContain('Hey there!')
  })

  it('shows voice message i18n key for audio/voice messages', () => {
    const wrapper = mount(MessageReceivedToast, {
      props: {
        message: makeMessage({
          content: '',
          messageType: 'audio/voice',
        }),
        toastId: 1,
      },
    })

    expect(wrapper.text()).toContain('messaging.voice.voice_message_notification')
  })

  it('shows sender name', () => {
    const wrapper = mount(MessageReceivedToast, {
      props: {
        message: makeMessage(),
        toastId: 1,
      },
    })

    expect(wrapper.text()).toContain('Alice')
  })

  it('renders no thumbnail img when sender.thumbnail is null', () => {
    const wrapper = mount(MessageReceivedToast, {
      props: {
        message: makeMessage({
          sender: { id: 'p2', publicName: 'Alice', thumbnail: null },
        }),
        toastId: 1,
      },
    })

    expect(wrapper.find('.profile-thumbnail img').exists()).toBe(false)
  })

  it('renders the thumbnail img when sender.thumbnail is present', () => {
    const wrapper = mount(MessageReceivedToast, {
      props: {
        message: makeMessage({
          sender: {
            id: 'p2',
            publicName: 'Alice',
            thumbnail: { url: '/user-content/images/alice/xyz-thumb.webp' },
          },
        }),
        toastId: 1,
      },
    })

    const img = wrapper.find('.profile-thumbnail img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/user-content/images/alice/xyz-thumb.webp')
    expect(img.attributes('alt')).toBe('Alice')
  })
})

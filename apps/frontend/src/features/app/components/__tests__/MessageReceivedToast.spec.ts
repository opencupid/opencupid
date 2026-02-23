import { describe, it, expect, vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
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
    createdAt: new Date().toISOString(),
    sender: {
      id: 'p2',
      publicName: 'Alice',
    } as MessageDTO['sender'],
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
})

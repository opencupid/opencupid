import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import MessageList from '../MessageList.vue'

const baseMessage = {
  id: 'm1',
  conversationId: 'c1',
  senderId: 'p1',
  content: 'hello',
  messageType: 'text/html',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  isMine: true,
  sender: {
    id: 'p1',
    publicName: 'Me',
    profileImages: [],
  },
}

describe('MessageList', () => {
  it('emits load:older when user scrolls near top and more messages exist', async () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [baseMessage],
        hasMore: true,
        isLoadingOlder: false,
      },
      global: {
        stubs: {
          VoiceMessage: true,
        },
      },
    })

    const scrollContainer = wrapper.find('.hide-scrollbar').element as HTMLElement
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 20, writable: true })

    await wrapper.find('.hide-scrollbar').trigger('scroll')

    expect(wrapper.emitted('load:older')).toBeTruthy()
  })

  it('does not emit load:older while older messages are already loading', async () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [baseMessage],
        hasMore: true,
        isLoadingOlder: true,
      },
      global: {
        stubs: {
          VoiceMessage: true,
        },
      },
    })

    const scrollContainer = wrapper.find('.hide-scrollbar').element as HTMLElement
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 20, writable: true })

    await wrapper.find('.hide-scrollbar').trigger('scroll')

    expect(wrapper.emitted('load:older')).toBeFalsy()
  })
})

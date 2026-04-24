import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/renderMessage', () => ({
  renderMessage: (content: string | null) => content ?? '',
}))

vi.mock('@/features/shared/components/LocalizedTimeAgo.vue', () => ({
  default: {
    name: 'LocalizedTimeAgo',
    props: ['time'],
    template: '<span class="time-ago">{{ time.toISOString() }}</span>',
  },
}))

vi.mock('../VoiceMessage.vue', () => ({
  default: {
    name: 'VoiceMessage',
    props: ['attachment', 'isMine'],
    template: '<div class="voice-stub" />',
  },
}))

import MessageBubble from '../MessageBubble.vue'
import type { MessageDTO } from '@zod/messaging/messaging.dto'

const baseMessage = {
  id: '1',
  content: 'Hello!',
  isMine: false,
  createdAt: new Date('2026-01-15T12:00:00.000Z'),
  messageType: 'text',
  attachment: null,
  conversationId: 'c1',
  senderId: 'p1',
  sender: { id: 'p1', publicName: 'Alice', thumbnail: null },
} as MessageDTO

describe('MessageBubble', () => {
  it('renders text message content', () => {
    const wrapper = mount(MessageBubble, {
      props: { message: { ...baseMessage } },
    })
    expect(wrapper.text()).toContain('Hello!')
  })

  it('renders timestamp using LocalizedTimeAgo', () => {
    const wrapper = mount(MessageBubble, {
      props: { message: { ...baseMessage } },
    })
    const timeAgo = wrapper.find('.time-ago')
    expect(timeAgo.exists()).toBe(true)
    expect(timeAgo.text()).toContain('2026')
  })

  it('aligns timestamp to start for received messages', () => {
    const wrapper = mount(MessageBubble, {
      props: { message: { ...baseMessage, isMine: false } },
    })
    const timestamp = wrapper.find('.message-timestamp')
    expect(timestamp.classes()).toContain('text-start')
  })

  it('aligns timestamp to end for own messages', () => {
    const wrapper = mount(MessageBubble, {
      props: { message: { ...baseMessage, isMine: true } },
    })
    const timestamp = wrapper.find('.message-timestamp')
    expect(timestamp.classes()).toContain('text-end')
  })

  it('applies bg-info for received messages', () => {
    const wrapper = mount(MessageBubble, {
      props: { message: { ...baseMessage, isMine: false } },
    })
    expect(wrapper.find('.message-bubble').classes()).toContain('bg-info')
  })

  it('applies bg-secondary for own messages', () => {
    const wrapper = mount(MessageBubble, {
      props: { message: { ...baseMessage, isMine: true } },
    })
    expect(wrapper.find('.message-bubble').classes()).toContain('bg-secondary')
  })

  it('renders VoiceMessage for audio/voice type', () => {
    const wrapper = mount(MessageBubble, {
      props: {
        message: {
          ...baseMessage,
          messageType: 'audio/voice',
          attachment: {
            id: 'att-1',
            createdAt: new Date(),
            url: '/audio.webm',
            mimeType: 'audio/webm',
            fileSize: 1024,
            duration: 5,
          },
        },
      },
    })
    expect(wrapper.find('.voice-stub').exists()).toBe(true)
    expect(wrapper.find('.message-text').exists()).toBe(false)
  })
})

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

vi.mock('@/features/images/components/ImageTag.vue', () => ({
  default: {
    name: 'ImageTag',
    props: ['image', 'variant', 'loading', 'className'],
    template:
      '<img class="image-stub" :data-position="image.position" :data-variant="variant" :src="image.variants?.[0]?.url" />',
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
  images: [],
  conversationId: 'c1',
  senderId: 'p1',
  sender: { id: 'p1', publicName: 'Alice', profileImages: [], location: { country: 'HU' } },
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

  const imageFixture = (url: string, position = 0) => ({
    mimeType: 'image/jpeg',
    altText: '',
    blurhash: 'L0',
    position,
    variants: [{ size: 'card' as const, url }],
  })

  it('renders one ImageTag per attached image with variant=card', () => {
    const wrapper = mount(MessageBubble, {
      props: {
        message: {
          ...baseMessage,
          content: '',
          messageType: 'image',
          images: [imageFixture('/a.jpg', 0), imageFixture('/b.jpg', 1)],
        } as MessageDTO,
      },
    })
    const imgs = wrapper.findAll('.image-stub')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]!.attributes('data-position')).toBe('0')
    expect(imgs[0]!.attributes('data-variant')).toBe('card')
    // No text body when content is empty
    expect(wrapper.find('.message-text').exists()).toBe(false)
  })

  it('renders both image and caption when content is present alongside images', () => {
    const wrapper = mount(MessageBubble, {
      props: {
        message: {
          ...baseMessage,
          content: 'check this out',
          messageType: 'text/plain',
          images: [imageFixture('/a.jpg', 0)],
        } as MessageDTO,
      },
    })
    expect(wrapper.findAll('.image-stub')).toHaveLength(1)
    expect(wrapper.find('.message-text').exists()).toBe(true)
    expect(wrapper.text()).toContain('check this out')
  })

  it('still renders text-only message when images array is empty', () => {
    const wrapper = mount(MessageBubble, {
      props: { message: { ...baseMessage, images: [] } as MessageDTO },
    })
    expect(wrapper.findAll('.image-stub')).toHaveLength(0)
    expect(wrapper.find('.message-text').exists()).toBe(true)
    expect(wrapper.text()).toContain('Hello!')
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

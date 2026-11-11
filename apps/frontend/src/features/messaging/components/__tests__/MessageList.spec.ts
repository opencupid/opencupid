import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/shared/components/LocalizedTimeAgo.vue', () => ({
  default: {
    name: 'LocalizedTimeAgo',
    props: ['time'],
    template: '<span />',
  },
}))

vi.mock('@/features/images/components/BlurhashImage.vue', () => ({
  default: {
    name: 'BlurhashImage',
    props: ['image', 'variant', 'imgClass'],
    template: '<div class="blurhash-image-stub" />',
  },
}))

const BModal = {
  name: 'BModal',
  props: ['modelValue'],
  template: '<div v-if="modelValue" class="modal-stub"><slot /></div>',
}

import MessageList from '../MessageList.vue'
import { type MessageDTO } from '@zod/messaging/messaging.dto'

function makeMessage(overrides: Partial<MessageDTO> = {}): MessageDTO {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderProfileId: 'p1',
    content: 'Hello',
    messageType: 'text/plain',
    createdAt: new Date().toISOString(),
    isMine: false,
    sender: { id: 'p1', publicName: 'Alice' } as MessageDTO['sender'],
    attachment: null,
    ...overrides,
  } as MessageDTO
}

describe('MessageList', () => {
  it('renders XSS payloads as escaped text via DOMPurify', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [makeMessage({ content: '<img src=x onerror="alert(1)">' })],
        hasMore: false,
        isLoadingMore: false,
      },
    })

    // markdown-it escapes HTML, DOMPurify strips anything remaining
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.message-text').element.innerHTML).not.toContain('<img')
  })

  it('renders plain text messages', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [makeMessage({ content: 'line1\nline2' })],
        hasMore: false,
        isLoadingMore: false,
      },
    })

    const messageText = wrapper.find('.message-text')
    expect(messageText.text()).toContain('line1')
    expect(messageText.text()).toContain('line2')
  })

  it('renders markdown bold and italic', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [makeMessage({ content: '**bold** and *italic*' })],
        hasMore: false,
        isLoadingMore: false,
      },
    })

    const html = wrapper.find('.message-text').element.innerHTML
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('strips script tags from message content', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [makeMessage({ content: '<script>alert("xss")</script>' })],
        hasMore: false,
        isLoadingMore: false,
      },
    })

    const messageEl = wrapper.find('.message-text')
    expect(messageEl.element.innerHTML).not.toContain('<script>')
  })

  it('shows loading indicator when loading older messages', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [],
        hasMore: true,
        isLoadingMore: true,
      },
      global: {
        mocks: { $t: (k: string) => k },
      },
    })

    expect(wrapper.text()).toContain('messaging.loading_older_messages')
  })

  describe('fullscreen photo viewer', () => {
    const image = {
      mimeType: 'image/jpeg',
      altText: '',
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      position: 0,
      variants: [
        { size: 'card' as const, url: '/a-card.webp' },
        { size: 'full' as const, url: '/a-full.webp' },
      ],
    }

    const mountWithImage = () =>
      mount(MessageList, {
        props: {
          messages: [makeMessage({ content: '', images: [image] })],
          hasMore: false,
          isLoadingMore: false,
        },
        global: { stubs: { BModal } },
      })

    it('is closed until a photo is clicked', () => {
      const wrapper = mountWithImage()
      expect(wrapper.find('.modal-stub').exists()).toBe(false)
    })

    it('shows the full variant through BlurhashImage when a photo is clicked', async () => {
      const wrapper = mountWithImage()
      await wrapper.find('img.message-image').trigger('click')

      const full = wrapper.findComponent({ name: 'BlurhashImage' })
      expect(full.props('variant')).toBe('full')
      expect(full.props('image')).toEqual(image)
    })

    it('closes when the fullscreen photo is clicked', async () => {
      const wrapper = mountWithImage()
      await wrapper.find('img.message-image').trigger('click')
      await wrapper.find('.fullscreen-message-image').trigger('click')
      expect(wrapper.find('.modal-stub').exists()).toBe(false)
    })
  })
})

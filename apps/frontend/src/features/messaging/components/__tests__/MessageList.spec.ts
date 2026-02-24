import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
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
  it('renders text messages safely without v-html', () => {
    const xssPayload = '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    const wrapper = mount(MessageList, {
      props: {
        messages: [makeMessage({ content: xssPayload })],
        hasMore: false,
        isLoadingMore: false,
      },
    })

    // The XSS payload should be rendered as visible text, not as an HTML element
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror="alert(1)">')
  })

  it('converts <br> tags to line breaks in text content', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [makeMessage({ content: 'line1<br>line2' })],
        hasMore: false,
        isLoadingMore: false,
      },
    })

    const messageText = wrapper.find('.message-text')
    expect(messageText.exists()).toBe(true)
    // pre-wrap CSS renders \n as visual line breaks; check the text content has both lines
    expect(messageText.text()).toContain('line1')
    expect(messageText.text()).toContain('line2')
  })

  it('unescapes HTML entities in message content', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [makeMessage({ content: '1 &amp; 2 &lt; 3' })],
        hasMore: false,
        isLoadingMore: false,
      },
    })

    expect(wrapper.find('.message-text').text()).toBe('1 & 2 < 3')
  })

  it('does not use v-html for text messages', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [makeMessage({ content: '<script>alert("xss")</script>' })],
        hasMore: false,
        isLoadingMore: false,
      },
    })

    // The raw script tag should appear as text, not be executed/rendered as HTML
    const messageEl = wrapper.find('.message-text')
    expect(messageEl.element.innerHTML).not.toContain('<script>')
    expect(messageEl.text()).toContain('<script>alert("xss")</script>')
  })

  it('shows loading indicator when loading older messages', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [],
        hasMore: true,
        isLoadingMore: true,
      },
    })

    expect(wrapper.text()).toContain('Loading older messages')
  })
})

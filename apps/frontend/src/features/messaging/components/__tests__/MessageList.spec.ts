import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/shared/components/LocalizedTimeAgo.vue', () => ({
  default: {
    name: 'LocalizedTimeAgo',
    props: ['time'],
    template: '<span />',
  },
}))

vi.mock('@/assets/icons/interface/arrow-down.svg', () => ({
  default: { name: 'IconArrowDown', template: '<svg />' },
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

  describe('scrolling', () => {
    // jsdom has no layout: stub the geometry of the column-reverse scroller,
    // whose scrollTop is 0 at the bottom and negative above it.
    const setGeometry = (
      el: HTMLElement,
      { scrollHeight = 2000, clientHeight = 600, scrollTop }: Record<string, number>
    ) => {
      Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
      Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
      el.scrollTop = scrollTop!
    }

    const initialMessages = [makeMessage({ id: 'a' }), makeMessage({ id: 'b' })]

    const mountList = (props: Partial<InstanceType<typeof MessageList>['$props']> = {}) => {
      const wrapper = mount(MessageList, {
        props: { messages: initialMessages, hasMore: true, isLoadingMore: false, ...props },
        global: { mocks: { $t: (k: string) => k } },
      })
      const scroller = wrapper.find('.flex-column-reverse')
      const el = scroller.element as HTMLElement
      // jsdom has no Element.scrollTo: apply it to scrollTop and record the call.
      const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
        el.scrollTop = top!
      })
      el.scrollTo = scrollTo as unknown as HTMLElement['scrollTo']
      // The user scrolls to a position: the scroll handler sees it.
      const scrollUserTo = (scrollTop: number) => {
        setGeometry(el, { scrollTop })
        return scroller.trigger('scroll')
      }
      const receive = (message: MessageDTO) =>
        wrapper.setProps({ messages: [...wrapper.props('messages'), message] })
      const newMessagesButton = () => wrapper.find('.new-messages-button')
      return { wrapper, el, scrollTo, scrollUserTo, receive, newMessagesButton }
    }

    it('requests older messages when scrolled near the top', async () => {
      const { wrapper, scrollUserTo } = mountList()
      await scrollUserTo(-1350)
      expect(wrapper.emitted('load-older')).toHaveLength(1)
    })

    it('does not request older messages away from the top', async () => {
      const { wrapper, scrollUserTo } = mountList()
      await scrollUserTo(-1000)
      expect(wrapper.emitted('load-older')).toBeUndefined()
    })

    it('does not request older messages while a page is loading or none are left', async () => {
      for (const props of [{ isLoadingMore: true }, { hasMore: false }]) {
        const { wrapper, scrollUserTo } = mountList(props)
        await scrollUserTo(-1400)
        expect(wrapper.emitted('load-older')).toBeUndefined()
      }
    })

    it('follows a new message when the reader is at the bottom', async () => {
      const { el, scrollUserTo, receive, newMessagesButton } = mountList()
      await scrollUserTo(0)
      await receive(makeMessage({ id: 'c' }))
      expect(el.scrollTop).toBe(0)
      expect(newMessagesButton().exists()).toBe(false)
    })

    it('keeps the place of a reader scrolled up and offers a new messages button', async () => {
      const { el, scrollTo, scrollUserTo, receive, newMessagesButton } = mountList()
      await scrollUserTo(-500)
      await receive(makeMessage({ id: 'c' }))

      expect(scrollTo).not.toHaveBeenCalled()
      expect(el.scrollTop).toBe(-500)
      expect(newMessagesButton().text()).toContain('messaging.new_messages')
    })

    it('scrolls to the bottom and hides the button when it is clicked', async () => {
      const { scrollTo, scrollUserTo, receive, newMessagesButton } = mountList()
      await scrollUserTo(-500)
      await receive(makeMessage({ id: 'c' }))
      await newMessagesButton().trigger('click')

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      await scrollUserTo(0)
      expect(newMessagesButton().exists()).toBe(false)
    })

    it('hides the button when the reader scrolls down to the bottom', async () => {
      const { scrollUserTo, receive, newMessagesButton } = mountList()
      await scrollUserTo(-500)
      await receive(makeMessage({ id: 'c' }))
      expect(newMessagesButton().exists()).toBe(true)

      await scrollUserTo(-20)
      expect(newMessagesButton().exists()).toBe(false)
    })

    it('takes the reader to the bottom when they send a message', async () => {
      const { el, scrollUserTo, receive, newMessagesButton } = mountList()
      await scrollUserTo(-500)
      await receive(makeMessage({ id: 'c', isMine: true }))
      expect(el.scrollTop).toBe(0)
      expect(newMessagesButton().exists()).toBe(false)
    })

    it('keeps the position without a button when older messages load or a message is edited', async () => {
      const { wrapper, el, scrollUserTo, newMessagesButton } = mountList()
      await scrollUserTo(-500)
      await wrapper.setProps({
        messages: [
          makeMessage({ id: 'older' }),
          makeMessage({ id: 'a' }),
          makeMessage({ id: 'b', content: 'edited' }),
        ],
      })
      expect(el.scrollTop).toBe(-500)
      expect(newMessagesButton().exists()).toBe(false)
    })

    it('opens another conversation at the bottom without a button', async () => {
      const { wrapper, el, scrollUserTo, newMessagesButton } = mountList()
      await scrollUserTo(-500)
      await wrapper.setProps({ messages: [] })
      await wrapper.setProps({ messages: [makeMessage({ id: 'x' }), makeMessage({ id: 'y' })] })
      expect(el.scrollTop).toBe(0)
      expect(newMessagesButton().exists()).toBe(false)
    })
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
        global: { stubs: { BModal }, mocks: { $t: (k: string) => k } },
      })

    it('is closed until a photo is clicked', () => {
      const wrapper = mountWithImage()
      expect(wrapper.find('.modal-stub').exists()).toBe(false)
    })

    it('shows the full variant through BlurhashImage when a photo is clicked', async () => {
      const wrapper = mountWithImage()
      await wrapper.find('button.message-image-button').trigger('click')

      const full = wrapper.findComponent({ name: 'BlurhashImage' })
      expect(full.props('variant')).toBe('full')
      expect(full.props('image')).toEqual(image)
    })

    it('closes when the fullscreen photo is clicked', async () => {
      const wrapper = mountWithImage()
      await wrapper.find('button.message-image-button').trigger('click')
      await wrapper.find('.fullscreen-message-image').trigger('click')
      expect(wrapper.find('.modal-stub').exists()).toBe(false)
    })
  })

  it('offers editing only on the message it is told is editable, and relays the edit', async () => {
    const BubbleStub = {
      name: 'MessageBubble',
      props: ['message', 'editable'],
      emits: ['edit'],
      template: '<div class="bubble-stub" />',
    }
    const wrapper = mount(MessageList, {
      props: {
        messages: [makeMessage({ id: 'a' }), makeMessage({ id: 'b', isMine: true })],
        hasMore: false,
        isLoadingMore: false,
        editableMessageId: 'b',
      },
      global: { stubs: { MessageBubble: BubbleStub }, mocks: { $t: (k: string) => k } },
    })

    const bubbles = wrapper.findAllComponents(BubbleStub)
    expect(bubbles.map((b) => b.props('editable'))).toEqual([false, true])

    await bubbles[1]!.vm.$emit('edit')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })
})

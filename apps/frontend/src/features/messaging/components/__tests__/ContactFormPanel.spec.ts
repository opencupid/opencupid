import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import type { MessageRecipient } from '@zod/profile/profile.dto'

// Stub SendMessageForm so its transitive import of media-encoder-host (which
// uses `new Worker(...)` at module scope) doesn't explode in jsdom. The stub
// exposes a `fire-sent` button the tests use to synthesise a `message:sent`.
vi.mock('@/features/messaging/components/SendMessageForm.vue', () => ({
  default: {
    name: 'SendMessageForm',
    template: `
      <div class="send-message-form-stub">
        <button
          class="fire-sent"
          type="button"
          @click="$emit('message:sent', { id: 'msg-1' })"
        >
          fire
        </button>
      </div>
    `,
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('@/assets/icons/interface/message.svg', () => ({
  default: { template: '<span class="icon-message-stub" />' },
}))

vi.mock('@/features/messaging/components/MessageBubble.vue', () => ({
  default: {
    name: 'MessageBubble',
    props: ['message'],
    template: '<div class="message-bubble-stub">{{ message.content }}</div>',
  },
}))

import ContactFormPanel from '../ContactFormPanel.vue'
import { useMessageStore } from '../../stores/messageStore'

const recipient = {
  id: 'recipient-1',
  publicName: 'Recipient',
} as unknown as MessageRecipient

const waitingRecipient = {
  id: 'recipient-1',
  publicName: 'Recipient',
  initiated: true,
  canMessage: false,
  conversationId: 'conv-1',
  haveConversation: false,
} as unknown as MessageRecipient

const globalConfig = {
  mocks: {
    $t: (k: string) => k,
  },
}

describe('ContactFormPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the send message form initially', () => {
    const wrapper = mount(ContactFormPanel, {
      props: { recipientProfile: recipient },
      global: globalConfig,
    })

    expect(wrapper.find('.send-message-form-stub').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('messaging.message_sent_success')
  })

  it('switches to the success state when the form emits message:sent', async () => {
    const wrapper = mount(ContactFormPanel, {
      props: { recipientProfile: recipient },
      global: globalConfig,
    })

    await wrapper.find('button.fire-sent').trigger('click')

    expect(wrapper.find('.send-message-form-stub').exists()).toBe(false)
    expect(wrapper.text()).toContain('messaging.message_sent_success')
  })

  it('renders waiting-for-reply state when initiated && !canMessage', async () => {
    const store = useMessageStore()
    vi.spyOn(store, 'fetchMessages').mockResolvedValue({
      success: true,
      data: {
        messages: [
          {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'me',
            content: 'Hello!',
            messageType: 'text/plain',
            createdAt: new Date(),
            sender: { id: 'me', publicName: 'Me', profileImages: [] },
            isMine: true,
          },
        ],
      },
    } as any)

    const wrapper = mount(ContactFormPanel, {
      props: { recipientProfile: waitingRecipient },
      global: globalConfig,
    })

    await flushPromises()

    expect(wrapper.find('.send-message-form-stub').exists()).toBe(false)
    expect(wrapper.text()).toContain('messaging.already_sent_waiting')
    expect(wrapper.find('.message-bubble-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('Hello!')
    expect(wrapper.emitted('sent')).toBeUndefined()
  })

  it('emits `sent` after the 3s success window elapses', async () => {
    const wrapper = mount(ContactFormPanel, {
      props: { recipientProfile: recipient },
      global: globalConfig,
    })

    await wrapper.find('button.fire-sent').trigger('click')
    expect(wrapper.emitted('sent')).toBeUndefined()

    vi.advanceTimersByTime(3000)
    await flushPromises()

    expect(wrapper.emitted('sent')).toHaveLength(1)
  })
})

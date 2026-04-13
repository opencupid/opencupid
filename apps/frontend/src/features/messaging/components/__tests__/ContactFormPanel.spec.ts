import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

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

import ContactFormPanel from '../ContactFormPanel.vue'

const recipient = {
  id: 'recipient-1',
  publicName: 'Recipient',
} as unknown as MessageRecipient

const globalConfig = {
  mocks: {
    $t: (k: string) => k,
  },
}

describe('ContactFormPanel', () => {
  beforeEach(() => {
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

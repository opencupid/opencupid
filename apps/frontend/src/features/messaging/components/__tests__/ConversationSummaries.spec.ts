import { describe, it, expect, vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
import { mount } from '@vue/test-utils'
import ConversationSummaries from '../ConversationSummaries.vue'
import { type ConversationSummary } from '@zod/messaging/messaging.dto'

function makeConvo(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: '1',
    profileId: 'p1',
    conversationId: 'c1',
    lastReadAt: new Date().toISOString(),
    isMuted: false,
    canReply: true,
    isCallable: true,
    myIsCallable: true,
    partnerProfile: {
      id: 'p2',
      publicName: 'Alice',
    } as ConversationSummary['partnerProfile'],
    lastMessage: {
      content: 'Hello there',
      messageType: 'text/plain',
      createdAt: new Date().toISOString(),
      isMine: false,
    },
    ...overrides,
  } as ConversationSummary
}

describe('ConversationSummaries', () => {
  it('shows text message content as preview', () => {
    const wrapper = mount(ConversationSummaries, {
      props: {
        conversations: [makeConvo()],
        activeConversation: null,
        loading: false,
      },
    })

    expect(wrapper.find('.last-message').text()).toBe('Hello there')
  })

  it('shows voice message i18n key as preview for audio/voice messages', () => {
    const wrapper = mount(ConversationSummaries, {
      props: {
        conversations: [
          makeConvo({
            lastMessage: {
              content: '',
              messageType: 'audio/voice',
              createdAt: new Date(),
              isMine: false,
            },
          }),
        ],
        activeConversation: null,
        loading: false,
      },
    })

    expect(wrapper.find('.last-message').text()).toBe('messaging.voice.voice_message_preview')
  })

  it('strips HTML tags from text message preview', () => {
    const wrapper = mount(ConversationSummaries, {
      props: {
        conversations: [
          makeConvo({
            lastMessage: {
              content: '<b>Bold</b> and <i>italic</i>',
              messageType: 'text/html',
              createdAt: new Date(),
              isMine: false,
            },
          }),
        ],
        activeConversation: null,
        loading: false,
      },
    })

    expect(wrapper.find('.last-message').text()).toBe('Bold and italic')
  })
})

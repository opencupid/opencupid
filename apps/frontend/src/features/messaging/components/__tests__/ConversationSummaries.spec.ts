import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
})
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
      profileImages: [],
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
  const globalMocks = { global: { mocks: { $t: (k: string) => k } } }

  describe('partner account deleted', () => {
    const tombstone = () =>
      mount(ConversationSummaries, {
        props: {
          conversations: [
            makeConvo({
              canReply: false,
              partnerProfile: { id: '', publicName: '', profileImages: [] },
            }),
          ],
          activeConversation: null,
          loading: false,
        },
        ...globalMocks,
      })

    it('shows the deleted-account name and no turn badge', () => {
      const wrapper = tombstone()

      expect(wrapper.text()).toContain('messaging.deleted_account')
      expect(wrapper.find('.badge').exists()).toBe(false)
    })

    it('stays selectable so the history can be read', () => {
      const wrapper = tombstone()

      expect(wrapper.find('.disabled').exists()).toBe(false)
    })
  })

  it('shows text message content as preview', () => {
    const wrapper = mount(ConversationSummaries, {
      props: {
        conversations: [makeConvo()],
        activeConversation: null,
        loading: false,
      },
      ...globalMocks,
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
      ...globalMocks,
    })

    expect(wrapper.find('.last-message').text()).toBe('messaging.voice.voice_message_preview')
  })

  it('shows the "my turn" badge by default for non-admin-initiated conversations', () => {
    const wrapper = mount(ConversationSummaries, {
      props: {
        conversations: [makeConvo({ isAdminInitiator: false })],
        activeConversation: null,
        loading: false,
      },
      ...globalMocks,
    })

    expect(wrapper.html()).toContain('messaging.my_turn')
  })

  it('hides the turn badges for admin-initiated conversations', () => {
    const wrapper = mount(ConversationSummaries, {
      props: {
        conversations: [makeConvo({ isAdminInitiator: true })],
        activeConversation: null,
        loading: false,
      },
      ...globalMocks,
    })

    const html = wrapper.html()
    expect(html).not.toContain('messaging.my_turn')
    expect(html).not.toContain('messaging.their_turn')
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
      ...globalMocks,
    })

    expect(wrapper.find('.last-message').text()).toBe('Bold and italic')
  })
})

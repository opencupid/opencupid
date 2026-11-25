import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/cross.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/unhide.svg', () => ({ default: { template: '<div />' } }))
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
    isArchived: false,
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

  it('shows a loading indicator only while the next page is loading', async () => {
    const wrapper = mount(ConversationSummaries, {
      props: { conversations: [makeConvo()], activeConversation: null, loading: false },
      ...globalMocks,
    })
    expect(wrapper.find('[data-testid="conversations-loading-more"]').exists()).toBe(false)

    await wrapper.setProps({ loadingMore: true })
    expect(wrapper.find('[data-testid="conversations-loading-more"]').exists()).toBe(true)
  })

  const mountWith = (overrides: Partial<ConversationSummary>) =>
    mount(ConversationSummaries, {
      props: { conversations: [makeConvo(overrides)], activeConversation: null, loading: false },
      ...globalMocks,
    })

  it('offers to hide whatever the turn status, without opening the conversation', async () => {
    for (const overrides of [{}, { canReply: false }, { lastMessage: null }]) {
      const wrapper = mountWith(overrides)
      const button = wrapper.find('.archive-button')
      expect(button.attributes('aria-label')).toBe('messaging.hide_hint')
      await button.trigger('click')
      expect(wrapper.emitted('convo:archive')![0]).toEqual([
        expect.objectContaining({ conversationId: 'c1' }),
        true,
      ])
      expect(wrapper.emitted('convo:select')).toBeUndefined()
    }
  })

  it('offers to unhide a hidden conversation, faded and without turn badge', async () => {
    const wrapper = mountWith({ isArchived: true })
    expect(wrapper.find('.faded').exists()).toBe(true)
    expect(wrapper.find('.turn-badge').exists()).toBe(false)
    await wrapper.find('.archive-button').trigger('click')
    expect(wrapper.emitted('convo:archive')![0]![1]).toBe(false)
  })

  it('does not offer to hide admin-initiated conversations', () => {
    expect(mountWith({ isAdminInitiator: true }).find('.archive-button').exists()).toBe(false)
  })

  it('opens hidden conversations, but not those that cannot be replied to', async () => {
    const hidden = mountWith({ isArchived: true })
    await hidden.find('.convo-item').trigger('click')
    expect(hidden.emitted('convo:select')).toHaveLength(1)

    const theirs = mountWith({ canReply: false })
    await theirs.find('.convo-item').trigger('click')
    expect(theirs.emitted('convo:select')).toBeUndefined()
  })
})

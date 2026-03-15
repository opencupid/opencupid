import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inject, defineComponent, type Ref } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
}))

const mockProfile = {
  id: 'owner-1',
  publicName: 'Owner',
}

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({ profile: mockProfile }),
}))

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn().mockResolvedValue(undefined) }),
}))

const mockConversation = {
  conversationId: 'conv-123',
  partnerProfile: { id: 'partner-1', publicName: 'Partner' },
  lastMessage: null,
  canReply: true,
}

const mockMessageStore = {
  conversations: [mockConversation],
  activeConversation: mockConversation,
  isLoading: false,
  suppressMessageNotifications: false,
  fetchConversations: vi.fn().mockResolvedValue([]),
  setActiveConversationById: vi.fn().mockResolvedValue(undefined),
  resetActiveConversation: vi.fn(),
}

vi.mock('../../stores/messageStore', () => ({
  useMessageStore: () => mockMessageStore,
}))

vi.mock('../../components/ConversationDetail.vue', () => ({
  default: defineComponent({
    name: 'ConversationDetailStub',
    props: ['conversation', 'loading'],
    emits: ['deselect:convo', 'profile:select', 'updated'],
    setup(props) {
      const viewerProfile = inject<Ref<any>>('viewerProfile')
      return { viewerProfile, props }
    },
    template:
      '<div class="convo-detail-stub" :data-convo-id="conversation?.conversationId" :data-viewer-id="viewerProfile?.id" />',
  }),
}))

vi.mock('@/features/shared/ui/MiddleColumn.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))

import ConversationView from '../ConversationView.vue'

describe('ConversationView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMessageStore.suppressMessageNotifications = false
  })

  it('provides viewerProfile and passes conversation to ConversationDetail', async () => {
    const wrapper = mount(ConversationView, {
      props: { conversationId: 'conv-123' },
    })
    await flushPromises()

    const stub = wrapper.find('.convo-detail-stub')
    expect(stub.exists()).toBe(true)
    expect(stub.attributes('data-convo-id')).toBe('conv-123')
    expect(stub.attributes('data-viewer-id')).toBe('owner-1')
  })

  it('sets active conversation on mount', async () => {
    mount(ConversationView, {
      props: { conversationId: 'conv-123' },
    })
    await flushPromises()

    expect(mockMessageStore.setActiveConversationById).toHaveBeenCalledWith('conv-123')
    expect(mockMessageStore.suppressMessageNotifications).toBe(true)
  })

  it('resets state on unmount', async () => {
    const wrapper = mount(ConversationView, {
      props: { conversationId: 'conv-123' },
    })
    await flushPromises()

    wrapper.unmount()

    expect(mockMessageStore.suppressMessageNotifications).toBe(false)
    expect(mockMessageStore.resetActiveConversation).toHaveBeenCalled()
  })

  it('navigates to Messaging on deselect', async () => {
    const wrapper = mount(ConversationView, {
      props: { conversationId: 'conv-123' },
    })
    await flushPromises()

    const stub = wrapper.findComponent({ name: 'ConversationDetailStub' })
    stub.vm.$emit('deselect:convo')

    expect(mockPush).toHaveBeenCalledWith({ name: 'Messaging' })
  })

  it('navigates to PublicProfile on profile select', async () => {
    const wrapper = mount(ConversationView, {
      props: { conversationId: 'conv-123' },
    })
    await flushPromises()

    const stub = wrapper.findComponent({ name: 'ConversationDetailStub' })
    stub.vm.$emit('profile:select', { id: 'partner-1' })

    expect(mockPush).toHaveBeenCalledWith({
      name: 'PublicProfile',
      params: { profileId: 'partner-1' },
    })
  })

  it('re-fetches conversations on updated event', async () => {
    const wrapper = mount(ConversationView, {
      props: { conversationId: 'conv-123' },
    })
    await flushPromises()
    mockMessageStore.fetchConversations.mockClear()

    const stub = wrapper.findComponent({ name: 'ConversationDetailStub' })
    stub.vm.$emit('updated')

    expect(mockMessageStore.fetchConversations).toHaveBeenCalled()
  })
})

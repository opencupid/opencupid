import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'

const mockRouterReplace = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: mockRouterReplace }) }))
vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => ({ messages: [], hasMoreMessages: false, isLoadingMoreMessages: false }),
}))
vi.mock('@/features/app/composables/useDetailPanel', () => ({
  useDetailPanel: () => ({ show: vi.fn() }),
}))
vi.mock('@/features/publicprofile/components/ProfileContentPanel.vue', () => ({
  default: { template: '<div />' },
}))

// Child components are replaced at the module level: their real imports pull
// in the voice recorder, which needs browser APIs jsdom lacks.
vi.mock('../SendMessageForm.vue', () => ({
  default: { name: 'SendMessageForm', props: ['canReply'], template: '<div />' },
}))
vi.mock('../ConversationLoadError.vue', () => ({
  default: {
    name: 'ConversationLoadError',
    props: ['reason'],
    emits: ['back', 'close'],
    template: '<div data-testid="load-error" />',
  },
}))
vi.mock('../MessageList.vue', () => ({
  default: { name: 'MessageList', template: '<div />' },
}))
vi.mock('../ConversationStarter.vue', () => ({
  default: {
    name: 'ConversationStarter',
    props: ['partner', 'viewer', 'context'],
    template: '<div />',
  },
}))
vi.mock('../MessagingNav.vue', () => ({
  default: { name: 'MessagingNav', props: ['recipient', 'highlighted'], template: '<div />' },
}))
vi.mock('@/features/publicprofile/components/BlockProfileDialog.vue', () => ({
  default: { template: '<div />' },
}))

const vm = {
  loadError: ref<'not_found' | 'failed' | null>(null),
  partner: ref<{ id: string } | null>(null),
  partnerContext: ref<{ canDate: boolean } | undefined>(undefined),
  viewer: ref<{ id: string } | null>(null),
  conversation: ref<{ canReply: boolean } | null>(null),
  persistedConversation: computed(() => null),
  isDraft: ref(false),
  canCall: computed(() => false),
  myIsCallable: computed(() => true),
  profileStoreLoading: computed(() => false),
  deselect: vi.fn(),
  onMessageSent: vi.fn(),
  startCall: vi.fn(),
  toggleCallable: vi.fn(),
  blockProfile: vi.fn(),
}
vi.mock('../../composables/useConversationDetailViewModel', () => ({
  useConversationDetailViewModel: () => vm,
}))

import ConversationDetail from '../ConversationDetail.vue'

const SendMessageStub = { name: 'SendMessageForm' }
const LoadErrorStub = { name: 'ConversationLoadError' }
const StarterStub = { name: 'ConversationStarter' }
const MessageListStub = { name: 'MessageList' }
const NavStub = { name: 'MessagingNav' }

function mountDetail() {
  return mount(ConversationDetail)
}

describe('ConversationDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vm.loadError.value = null
    vm.partner.value = { id: 'p1' }
    vm.conversation.value = { canReply: true }
    vm.partnerContext.value = undefined
    vm.viewer.value = { id: 'me' }
    vm.isDraft.value = false
  })

  it('shows the load error instead of the conversation, with its reason', () => {
    vm.loadError.value = 'not_found'
    const wrapper = mountDetail()

    const error = wrapper.findComponent(LoadErrorStub)
    expect(error.props('reason')).toBe('not_found')
    expect(wrapper.findComponent(SendMessageStub).exists()).toBe(false)
  })

  it('goes back to the inbox or closes from the load error', async () => {
    vm.loadError.value = 'failed'
    const wrapper = mountDetail()

    const error = wrapper.findComponent(LoadErrorStub)
    error.vm.$emit('back')
    error.vm.$emit('close')

    expect(vm.deselect).toHaveBeenCalled()
    expect(mockRouterReplace).toHaveBeenCalledWith({ name: 'Browse' })
  })

  it('passes canReply on to the message form', () => {
    vm.conversation.value = { canReply: false }
    const wrapper = mountDetail()

    expect(wrapper.findComponent(LoadErrorStub).exists()).toBe(false)
    expect(wrapper.findComponent(SendMessageStub).props('canReply')).toBe(false)
  })

  it('shows the conversation starter instead of the message list in a draft', () => {
    vm.isDraft.value = true
    vm.partnerContext.value = { canDate: true }
    const wrapper = mountDetail()

    const starter = wrapper.findComponent(StarterStub)
    expect(starter.props()).toEqual({
      partner: { id: 'p1' },
      viewer: { id: 'me' },
      context: { canDate: true },
    })
    expect(wrapper.findComponent(MessageListStub).exists()).toBe(false)
  })

  it('shows the message list in a persisted conversation', () => {
    const wrapper = mountDetail()

    expect(wrapper.findComponent(MessageListStub).exists()).toBe(true)
    expect(wrapper.findComponent(StarterStub).exists()).toBe(false)
  })

  it("highlights the partner's avatar when the pair is dating-eligible", async () => {
    const wrapper = mountDetail()
    const nav = wrapper.findComponent(NavStub)
    expect(nav.props('highlighted')).toBeUndefined()

    vm.partnerContext.value = { canDate: true }
    await wrapper.vm.$nextTick()
    expect(nav.props('highlighted')).toBe(true)
  })
})

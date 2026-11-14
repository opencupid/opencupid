import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'

const mockUseInfiniteScroll = vi.hoisted(() => vi.fn())
vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useInfiniteScroll: mockUseInfiniteScroll,
}))

// Child components pull in heavy, browser-only dependencies; only the list matters here.
vi.mock('../ConversationSummaries.vue', () => ({
  default: {
    props: ['loadingMore'],
    template: '<div class="summaries" :data-loading-more="loadingMore" />',
  },
}))
vi.mock('../EmptyView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/interaction/components/MatchesList.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/interaction/components/ReceivedLikesTeaser.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/publicprofile/components/PublicProfileView.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }))

vi.mock('@/features/app/composables/useNotificationState', () => ({
  useNotificationState: () => ({
    hasUnreadMessages: ref(false),
    hasMatchNotifications: ref(false),
  }),
}))

vi.mock('@/features/app/composables/useDetailPanel', () => ({
  useDetailPanel: () => ({ show: vi.fn() }),
}))

const vm = vi.hoisted(() => ({
  canLoadMore: { value: false },
  fetchMoreConversations: vi.fn(),
  fetchConversations: vi.fn(),
  initialize: vi.fn(),
}))

vi.mock('../../composables/useMessagingViewModel', () => ({
  useMessagingViewModel: () => ({
    conversations: ref([{ conversationId: 'c1' }]),
    activeConversation: ref(null),
    isLoading: ref(false),
    isLoadingMoreConversations: ref(true),
    canLoadMoreConversations: vm.canLoadMore,
    haveConversations: ref(true),
    isInitialized: ref(true),
    showEmptyState: ref(false),
    initialize: vm.initialize,
    fetchConversations: vm.fetchConversations,
    fetchMoreConversations: vm.fetchMoreConversations,
    handleMatchSelect: vi.fn(),
    handleProfileSelect: vi.fn(),
    matches: ref([]),
    haveMatches: ref(false),
  }),
}))

import Messaging from '../Messaging.vue'

function mountMessaging() {
  return mount(Messaging, {
    global: { mocks: { $t: (k: string) => k } },
  })
}

describe('Messaging – conversation list infinite scroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vm.canLoadMore.value = false
  })

  it('pages conversations in from the element that scrolls the list', () => {
    const wrapper = mountMessaging()

    const [target, onLoadMore, options] = mockUseInfiniteScroll.mock.calls[0]!
    const scrollEl = wrapper.find('.overflow-auto').element
    expect(target.value).toBe(scrollEl)
    expect(scrollEl.contains(wrapper.find('.summaries').element)).toBe(true)

    onLoadMore()
    expect(vm.fetchMoreConversations).toHaveBeenCalledTimes(1)

    expect(options.canLoadMore()).toBe(false)
    vm.canLoadMore.value = true
    expect(options.canLoadMore()).toBe(true)
  })

  it('passes the loading-more state down to the list', () => {
    const wrapper = mountMessaging()
    expect(wrapper.find('.summaries').attributes('data-loading-more')).toBe('true')
  })
})

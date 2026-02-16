import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('@vueuse/core', () => ({
  useInfiniteScroll: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('@/features/messaging/components/SendMessageForm.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/publicprofile/composables/useMessageSentState', () => ({
  useMessageSentState: () => ({
    messageSent: { value: false },
    handleMessageSent: () => {},
    resetMessageSent: () => {},
  }),
}))

vi.mock('../../composables/usePostListViewModel', () => ({
  usePostListViewModel: () => ({
    postStore: { isLoading: false, error: null },
    posts: ref([{ id: 'post-1' }]),
    selectedType: ref(''),
    isLoadingMore: ref(false),
    hasMorePosts: ref(false),
    isInitialized: ref(true),
    handleTypeFilter: vi.fn(),
    handleLoadMore: vi.fn(),
    handleRetry: vi.fn(),
  }),
}))

import PostList from '../PostList.vue'

const stubs = {
  BCol: { template: '<div><slot /></div>' },
  PostCard: {
    template: `
      <div>
        <button class="hide" @click="$emit('hide')">hide</button>
        <button class="delete" @click="$emit('delete')">delete</button>
      </div>
    `,
  },
}

describe('PostList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emits hide intent when post card emits hide', async () => {
    const wrapper = mount(PostList, {
      props: { showFilters: false },
      global: { stubs },
    })

    await wrapper.find('button.hide').trigger('click')

    expect(wrapper.emitted('intent:hide')).toBeTruthy()
    expect(wrapper.emitted('intent:hide')?.[0]?.[0]).toEqual({ id: 'post-1' })
  })

  it('emits delete intent when post card emits delete', async () => {
    const wrapper = mount(PostList, {
      props: { showFilters: false },
      global: { stubs },
    })

    await wrapper.find('button.delete').trigger('click')

    expect(wrapper.emitted('intent:delete')).toBeTruthy()
    expect(wrapper.emitted('intent:delete')?.[0]?.[0]).toEqual({ id: 'post-1' })
  })
})

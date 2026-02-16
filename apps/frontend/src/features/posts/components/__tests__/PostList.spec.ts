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

const mockVm = {
  postStore: { isLoading: false, error: null },
  posts: ref([{ id: 'post-1' }]),
  selectedType: ref(''),
  isLoadingMore: ref(false),
  hasMorePosts: ref(false),
  isInitialized: ref(true),
  handleTypeFilter: vi.fn(),
  handleLoadMore: vi.fn(),
  handleRetry: vi.fn(),
}

vi.mock('../../composables/usePostListViewModel', () => ({
  usePostListViewModel: () => mockVm,
}))

import PostList from '../PostList.vue'
import { useInfiniteScroll } from '@vueuse/core'

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

const globalOpts = (extraStubs = {}) => ({
  stubs: { ...stubs, ...extraStubs },
  mocks: { $t: (k: string) => k },
})

describe('PostList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVm.postStore = { isLoading: false, error: null }
    mockVm.posts = ref([{ id: 'post-1' }])
    mockVm.isLoadingMore = ref(false)
    mockVm.hasMorePosts = ref(false)
    mockVm.isInitialized = ref(true)
  })

  it('emits hide intent when post card emits hide', async () => {
    const wrapper = mount(PostList, {
      props: { showFilters: false },
      global: globalOpts(),
    })

    await wrapper.find('button.hide').trigger('click')

    expect(wrapper.emitted('intent:hide')).toBeTruthy()
    expect(wrapper.emitted('intent:hide')?.[0]?.[0]).toEqual({ id: 'post-1' })
  })

  it('emits delete intent when post card emits delete', async () => {
    const wrapper = mount(PostList, {
      props: { showFilters: false },
      global: globalOpts(),
    })

    await wrapper.find('button.delete').trigger('click')

    expect(wrapper.emitted('intent:delete')).toBeTruthy()
    expect(wrapper.emitted('intent:delete')?.[0]?.[0]).toEqual({ id: 'post-1' })
  })

  it('scroll container has overflow-auto and hide-scrollbar classes', () => {
    const wrapper = mount(PostList, {
      props: { showFilters: false },
      global: globalOpts(),
    })

    const scrollContainer = wrapper.find('[class*="overflow-auto"]')
    expect(scrollContainer.exists()).toBe(true)
    expect(scrollContainer.classes()).toContain('hide-scrollbar')
  })

  it('shows loading spinner when isLoadingMore is true', () => {
    mockVm.isLoadingMore = ref(true)

    const wrapper = mount(PostList, {
      props: { showFilters: false },
      global: globalOpts({ BSpinner: { template: '<div class="spinner" />' } }),
    })

    expect(wrapper.find('.spinner').exists()).toBe(true)
  })

  it('hides loading spinner when isLoadingMore is false', () => {
    mockVm.isLoadingMore = ref(false)

    const wrapper = mount(PostList, {
      props: { showFilters: false },
      global: globalOpts({ BSpinner: { template: '<div class="spinner" />' } }),
    })

    expect(wrapper.find('.spinner').exists()).toBe(false)
  })

  it('registers infinite scroll on mount', () => {
    mount(PostList, {
      props: { showFilters: false },
      global: globalOpts(),
    })

    expect(useInfiniteScroll).toHaveBeenCalled()
  })

  it('outer container has flex-column layout for scrolling', () => {
    const wrapper = mount(PostList, {
      props: { showFilters: false },
      global: globalOpts(),
    })

    const outer = wrapper.find('.post-list')
    expect(outer.classes()).toContain('d-flex')
    expect(outer.classes()).toContain('flex-column')
  })
})

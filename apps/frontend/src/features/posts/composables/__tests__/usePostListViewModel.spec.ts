import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

const mockLoadPosts = vi.fn()

vi.mock('../../stores/postStore', () => ({
  usePostStore: () => ({
    posts: [],
    myPosts: [],
    isLoading: false,
    error: null,
    loadPosts: mockLoadPosts,
    clearError: vi.fn(),
  }),
}))

import { usePostListViewModel } from '../usePostListViewModel'

describe('usePostListViewModel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockLoadPosts.mockResolvedValue([])
  })

  it('initializes with page 0 and hasMorePosts true', () => {
    const vm = usePostListViewModel({ scope: 'all', isActive: false })
    expect(vm.hasMorePosts.value).toBe(true)
    expect(vm.isLoadingMore.value).toBe(false)
    expect(vm.isInitialized.value).toBe(false)
  })

  it('handleLoadMore increments page and calls loadPosts with append', async () => {
    const vm = usePostListViewModel({ scope: 'all', isActive: false })

    mockLoadPosts.mockResolvedValueOnce(new Array(20).fill({}))
    await vm.handleLoadMore()

    expect(mockLoadPosts).toHaveBeenCalledWith(
      'all',
      expect.objectContaining({ page: 1, pageSize: 20 })
    )
  })

  it('sets hasMorePosts to false when fewer than pageSize items returned', async () => {
    const vm = usePostListViewModel({ scope: 'all', isActive: false })

    mockLoadPosts.mockResolvedValueOnce(new Array(5).fill({}))
    await vm.handleLoadMore()

    expect(vm.hasMorePosts.value).toBe(false)
  })

  it('keeps hasMorePosts true when a full page is returned', async () => {
    const vm = usePostListViewModel({ scope: 'all', isActive: false })

    mockLoadPosts.mockResolvedValueOnce(new Array(20).fill({}))
    await vm.handleLoadMore()

    expect(vm.hasMorePosts.value).toBe(true)
  })

  it('sets isLoadingMore true during handleLoadMore and resets after', async () => {
    const vm = usePostListViewModel({ scope: 'all', isActive: false })

    let loadingDuringFetch = false
    mockLoadPosts.mockImplementationOnce(async () => {
      loadingDuringFetch = vm.isLoadingMore.value
      return []
    })

    await vm.handleLoadMore()

    expect(loadingDuringFetch).toBe(true)
    expect(vm.isLoadingMore.value).toBe(false)
  })

  it('handleTypeFilter resets pagination and reloads from page 0', async () => {
    const vm = usePostListViewModel({ scope: 'all', isActive: false })

    // Load a page first
    mockLoadPosts.mockResolvedValueOnce(new Array(20).fill({}))
    await vm.handleLoadMore()
    expect(mockLoadPosts).toHaveBeenLastCalledWith('all', expect.objectContaining({ page: 1 }))

    // Type filter should reset to page 0
    mockLoadPosts.mockResolvedValueOnce([])
    vm.handleTypeFilter()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockLoadPosts).toHaveBeenLastCalledWith('all', expect.objectContaining({ page: 0 }))
  })
})

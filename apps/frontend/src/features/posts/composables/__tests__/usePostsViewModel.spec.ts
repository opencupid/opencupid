import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

const bootstrapMock = vi.fn()

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: bootstrapMock }),
}))

const mockPostStore = {
  posts: [],
  myPosts: [],
  deletePost: vi.fn(),
  hidePost: vi.fn(),
  showPost: vi.fn(),
}

vi.mock('../../stores/postStore', () => ({
  usePostStore: () => mockPostStore,
}))

const mockOwnerStore: { profile: any } = {
  profile: { id: 'owner-1' },
}

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => mockOwnerStore,
}))

import { usePostsViewModel } from '../usePostsViewModel'

describe('usePostsViewModel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockOwnerStore.profile = { id: 'owner-1' }
    bootstrapMock.mockResolvedValue(undefined)
  })

  it('sets isLoading during initialize and resets after completion', async () => {
    const vm = usePostsViewModel()

    bootstrapMock.mockImplementation(async () => {
      expect(vm.isLoading.value).toBe(true)
    })

    expect(vm.isLoading.value).toBe(false)
    await vm.initialize()

    expect(vm.isLoading.value).toBe(false)
    expect(vm.isInitialized.value).toBe(true)
  })

  it('resets isLoading when owner profile is missing', async () => {
    mockOwnerStore.profile = null
    const vm = usePostsViewModel()

    await vm.initialize()

    expect(vm.isLoading.value).toBe(false)
    expect(vm.isInitialized.value).toBe(false)
  })
})

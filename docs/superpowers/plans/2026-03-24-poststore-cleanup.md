# postStore Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `postStore` to use Zod response parsing, `StoreResponse` return pattern, and Axios params — matching the conventions used by every other store in the codebase.

**Architecture:** Replace type-cast generics with Zod `.parse()` on every API response. Replace raw try/catch returns with `storeSuccess`/`storeError` helpers. Replace manual `URLSearchParams` with Axios `params` objects. Update all callers and tests.

**Tech Stack:** Vue 3, Pinia, Zod, Axios, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-poststore-cleanup-design.md`

---

### Task 1: Rewrite `postStore.ts` — Zod parsing, StoreResponse, Axios params

**Files:**
- Modify: `apps/frontend/src/features/posts/stores/postStore.ts`

This is the core change. The store is rewritten to:
1. Import and use Zod schemas (`PublicPostWithProfileSchema`, `OwnerPostSchema`) for response parsing
2. Import and return `storeSuccess`/`storeError` from `@/store/helpers`
3. Remove `error`, `isLoading`, `clearError` from state/actions
4. Pass query params as Axios `params` objects instead of manual `URLSearchParams`

- [ ] **Step 1: Rewrite the store**

Replace the full contents of `postStore.ts` with:

```ts
import { defineStore } from 'pinia'
import { api, safeApiCall } from '@/lib/api'
import {
  PublicPostWithProfileSchema,
  OwnerPostSchema,
  type PublicPostWithProfile,
  type OwnerPost,
  type CreatePostPayload,
  type UpdatePostPayload,
  type PostQueryInput,
  type NearbyPostQueryInput,
} from '@zod/post/post.dto'
import type {
  PostsResponse,
  MyPostsResponse,
  PostResponse,
  CreatePostResponse,
  UpdatePostResponse,
  DeletePostResponse,
} from '@zod/apiResponse.dto'
import { type PostTypeType } from '@zod/generated'
import {
  storeSuccess,
  storeError,
  type StoreResponse,
} from '@/store/helpers'

const PublicPostWithProfileArraySchema = PublicPostWithProfileSchema.array()
const OwnerPostArraySchema = OwnerPostSchema.array()

export const usePostStore = defineStore('posts', {
  state: () => ({
    posts: [] as PublicPostWithProfile[],
    myPosts: [] as OwnerPost[],
    currentPost: null as PublicPostWithProfile | OwnerPost | null,
  }),

  getters: {
    getPostsByType: (state) => (type: PostTypeType) => {
      return state.posts.filter((post) => post.type === type)
    },
    getOffers: (state) => state.posts.filter((post) => post.type === 'OFFER'),
    getRequests: (state) => state.posts.filter((post) => post.type === 'REQUEST'),
  },

  actions: {
    async createPost(payload: CreatePostPayload): Promise<StoreResponse<{ post: OwnerPost }>> {
      try {
        const res = await safeApiCall(() => api.post<CreatePostResponse>('/posts', payload))
        const post = OwnerPostSchema.parse(res.data.post)
        this.myPosts.unshift(post)
        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to create post')
      }
    },

    async updatePost(
      id: string,
      payload: UpdatePostPayload
    ): Promise<StoreResponse<{ post: OwnerPost }>> {
      try {
        const res = await safeApiCall(() =>
          api.patch<UpdatePostResponse>(`/posts/${id}`, payload)
        )
        const post = OwnerPostSchema.parse(res.data.post)

        const index = this.myPosts.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.myPosts[index] = post
        }
        if (this.currentPost?.id === id) {
          this.currentPost = post
        }

        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to update post')
      }
    },

    async deletePost(id: string): Promise<StoreResponse<void>> {
      try {
        await safeApiCall(() => api.delete<DeletePostResponse>(`/posts/${id}`))

        this.myPosts = this.myPosts.filter((post) => post.id !== id)
        this.posts = this.posts.filter((post) => post.id !== id)
        if (this.currentPost?.id === id) {
          this.currentPost = null
        }

        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to delete post')
      }
    },

    async setPostVisibility(
      id: string,
      isVisible: boolean
    ): Promise<StoreResponse<{ post: OwnerPost }>> {
      try {
        const res = await safeApiCall(() =>
          api.patch<UpdatePostResponse>(`/posts/${id}`, { isVisible })
        )
        const post = OwnerPostSchema.parse(res.data.post)

        const index = this.myPosts.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.myPosts[index] = post
        }

        if (!post.isVisible) {
          this.posts = this.posts.filter((p) => p.id !== id)
        }

        if (this.currentPost?.id === id) {
          this.currentPost = post
        }

        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to update post visibility')
      }
    },

    async hidePost(id: string) {
      return this.setPostVisibility(id, false)
    },

    async showPost(id: string) {
      return this.setPostVisibility(id, true)
    },

    async loadPosts(
      scope: 'all' | 'nearby' | 'recent' | 'my',
      options: {
        type?: PostTypeType
        page?: number
        pageSize?: number
        nearbyParams?: { lat: number; lon: number; radius?: number }
      } = {}
    ) {
      const { type, page = 0, pageSize = 20, nearbyParams } = options
      const baseQuery: PostQueryInput = {
        type,
        limit: pageSize,
        offset: page * pageSize,
      }
      switch (scope) {
        case 'nearby':
          if (nearbyParams) {
            return await this.fetchNearbyPosts({
              ...baseQuery,
              lat: nearbyParams.lat,
              lon: nearbyParams.lon,
              radius: nearbyParams.radius ?? 50,
            })
          }
          return storeSuccess({ posts: [] as PublicPostWithProfile[] })
        case 'recent':
          return await this.fetchRecentPosts(baseQuery)
        case 'my':
          return await this.fetchMyPosts(baseQuery)
        default:
          return await this.fetchPosts(baseQuery)
      }
    },

    async fetchPost(id: string): Promise<StoreResponse<{ post: OwnerPost }>> {
      try {
        const res = await safeApiCall(() => api.get<PostResponse>(`/posts/${id}`))
        const post = OwnerPostSchema.parse(res.data.post)
        this.currentPost = post
        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch post')
      }
    },

    async fetchPosts(
      query: PostQueryInput = {}
    ): Promise<StoreResponse<{ posts: PublicPostWithProfile[] }>> {
      try {
        const res = await safeApiCall(() =>
          api.get<PostsResponse>('/posts', { params: query })
        )
        const posts = PublicPostWithProfileArraySchema.parse(res.data.posts)

        if (query.offset === 0 || query.offset === undefined) {
          this.posts = posts
        } else {
          this.posts.push(...posts)
        }
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch posts')
      }
    },

    async fetchNearbyPosts(
      query: NearbyPostQueryInput
    ): Promise<StoreResponse<{ posts: PublicPostWithProfile[] }>> {
      try {
        const res = await safeApiCall(() =>
          api.get<PostsResponse>('/posts/nearby', { params: query })
        )
        const posts = PublicPostWithProfileArraySchema.parse(res.data.posts)

        if (query.offset === 0 || query.offset === undefined) {
          this.posts = posts
        } else {
          this.posts.push(...posts)
        }
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch nearby posts')
      }
    },

    async fetchRecentPosts(
      query: PostQueryInput = {}
    ): Promise<StoreResponse<{ posts: PublicPostWithProfile[] }>> {
      try {
        const res = await safeApiCall(() =>
          api.get<PostsResponse>('/posts/recent', { params: query })
        )
        const posts = PublicPostWithProfileArraySchema.parse(res.data.posts)

        if (query.offset === 0 || query.offset === undefined) {
          this.posts = posts
        } else {
          this.posts.push(...posts)
        }
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch recent posts')
      }
    },

    async fetchMyPosts(
      query: PostQueryInput = {}
    ): Promise<StoreResponse<{ posts: OwnerPost[] }>> {
      try {
        const res = await safeApiCall(() =>
          api.get<MyPostsResponse>('/posts/profile/me', { params: query })
        )
        const posts = OwnerPostArraySchema.parse(res.data.posts)

        if (query.offset === 0 || query.offset === undefined) {
          this.myPosts = posts
        } else {
          this.myPosts.push(...posts)
        }
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch my posts')
      }
    },

    async fetchPostsInBounds(bounds: {
      south: number
      north: number
      west: number
      east: number
    }): Promise<StoreResponse<{ posts: PublicPostWithProfile[] }>> {
      try {
        const res = await safeApiCall(() =>
          api.get<PostsResponse>('/posts/bounds', { params: bounds })
        )
        const posts = PublicPostWithProfileArraySchema.parse(res.data.posts)
        this.posts = posts
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch posts in bounds')
      }
    },

    upsertPost(post: PublicPostWithProfile | OwnerPost) {
      const isOwn = 'isVisible' in post

      if (isOwn) {
        const idx = this.myPosts.findIndex((p) => p.id === post.id)
        if (idx === -1) {
          this.myPosts.unshift(post as OwnerPost)
        } else {
          this.myPosts[idx] = post as OwnerPost
        }
      }

      const idx = this.posts.findIndex((p) => p.id === post.id)
      if (idx === -1) {
        this.posts.unshift({ ...post, isOwn: true } as PublicPostWithProfile)
      } else {
        this.posts[idx] = { ...post, isOwn: true } as PublicPostWithProfile
      }
    },

    clearPosts() {
      this.posts = []
    },

    clearMyPosts() {
      this.myPosts = []
    },

    setCurrentPost(post: PublicPostWithProfile | OwnerPost | null) {
      this.currentPost = post
    },
  },
})
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm --filter frontend exec vue-tsc --noEmit 2>&1 | head -30`
Expected: Type errors in the 4 caller files (not in postStore itself). The store should compile cleanly — callers will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/posts/stores/postStore.ts
git commit -m "refactor(postStore): add Zod parsing, StoreResponse returns, Axios params (#1216)"
```

---

### Task 2: Update `postStore.spec.ts` tests

**Files:**
- Modify: `apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts`

Update tests to account for: StoreResponse return shape, Zod parsing, Axios `params` objects (not URL strings).

- [ ] **Step 1: Rewrite the test file**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockApi = vi.hoisted(() => ({
  post: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  get: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: async <T>(fn: () => Promise<T>) => fn(),
}))

import { usePostStore } from '../postStore'

// Minimal valid post objects that satisfy Zod schemas.
// PublicPostWithProfileSchema requires: id, content, type, createdAt, updatedAt,
//   postedById, country, cityName, lat, lon, postedBy (ProfileSummary), isOwn
// OwnerPostSchema adds: isDeleted, isVisible
const basePost = {
  content: 'test',
  type: 'OFFER',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  postedById: 'user-1',
  country: null,
  cityName: null,
  lat: null,
  lon: null,
}

const profileSummary = {
  id: 'profile-1',
  publicName: 'Test',
  profileImages: [],
}

function makePublicPost(id: string) {
  return {
    ...basePost,
    id,
    postedBy: profileSummary,
    isOwn: false,
  }
}

function makeOwnerPost(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...basePost,
    id,
    postedBy: profileSummary,
    isDeleted: false,
    isVisible: true,
    isOwn: true,
    ...overrides,
  }
}

describe('postStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Zod parsing', () => {
    it('coerces ISO string dates to Date objects on fetchPosts', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({
        data: { success: true, posts: [makePublicPost('post-1')] },
      })

      const result = await store.fetchPosts({ limit: 20, offset: 0 })

      expect(result.success).toBe(true)
      expect(store.posts[0]!.createdAt).toBeInstanceOf(Date)
      expect(store.posts[0]!.updatedAt).toBeInstanceOf(Date)
    })

    it('coerces ISO string dates to Date objects on fetchMyPosts', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({
        data: { success: true, posts: [makeOwnerPost('post-1')] },
      })

      const result = await store.fetchMyPosts({ limit: 20, offset: 0 })

      expect(result.success).toBe(true)
      expect(store.myPosts[0]!.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('deletePost', () => {
    it('removes post from store state and returns StoreResponse', async () => {
      const store = usePostStore()
      store.myPosts = [{ id: 'post-1' } as any]
      store.posts = [{ id: 'post-1' } as any]
      store.currentPost = { id: 'post-1' } as any
      mockApi.delete.mockResolvedValue({ data: { success: true } })

      const result = await store.deletePost('post-1')

      expect(result.success).toBe(true)
      expect(mockApi.delete).toHaveBeenCalledWith('/posts/post-1')
      expect(store.myPosts).toEqual([])
      expect(store.posts).toEqual([])
      expect(store.currentPost).toBeNull()
    })

    it('returns storeError on failure', async () => {
      const store = usePostStore()
      mockApi.delete.mockRejectedValue(new Error('network error'))

      const result = await store.deletePost('post-1')

      expect(result.success).toBe(false)
    })
  })

  describe('hidePost / showPost', () => {
    it('hidePost updates myPosts and removes hidden post from public list', async () => {
      const store = usePostStore()
      const hiddenPost = makeOwnerPost('post-1', { isVisible: false })
      store.myPosts = [{ id: 'post-1', isVisible: true } as any]
      store.posts = [{ id: 'post-1' } as any, { id: 'post-2' } as any]
      store.currentPost = { id: 'post-1', isVisible: true } as any
      mockApi.patch.mockResolvedValue({ data: { success: true, post: hiddenPost } })

      const result = await store.hidePost('post-1')

      expect(result.success).toBe(true)
      expect(mockApi.patch).toHaveBeenCalledWith('/posts/post-1', { isVisible: false })
      expect(store.myPosts[0]!.isVisible).toBe(false)
      expect(store.posts.map((p) => p.id)).toEqual(['post-2'])
    })

    it('showPost updates visibility to true', async () => {
      const store = usePostStore()
      const visiblePost = makeOwnerPost('post-1', { isVisible: true })
      store.myPosts = [{ id: 'post-1', isVisible: false } as any]
      store.posts = [{ id: 'post-2' } as any]
      store.currentPost = { id: 'post-1', isVisible: false } as any
      mockApi.patch.mockResolvedValue({ data: { success: true, post: visiblePost } })

      const result = await store.showPost('post-1')

      expect(result.success).toBe(true)
      expect(store.myPosts[0]!.isVisible).toBe(true)
    })
  })

  describe('pagination — fetchPosts', () => {
    it('replaces posts on initial load (offset 0)', async () => {
      const store = usePostStore()
      store.posts = [{ id: 'old-1' } as any]
      mockApi.get.mockResolvedValue({
        data: { success: true, posts: [makePublicPost('new-1'), makePublicPost('new-2')] },
      })

      await store.fetchPosts({ limit: 20, offset: 0 })

      expect(store.posts.map((p) => p.id)).toEqual(['new-1', 'new-2'])
    })

    it('appends posts when offset > 0 (load more)', async () => {
      const store = usePostStore()
      store.posts = [{ id: 'existing-1' } as any]
      mockApi.get.mockResolvedValue({
        data: { success: true, posts: [makePublicPost('new-1')] },
      })

      await store.fetchPosts({ limit: 20, offset: 20 })

      expect(store.posts.map((p) => p.id)).toEqual(['existing-1', 'new-1'])
    })

    it('passes query as Axios params object', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({ data: { success: true, posts: [] } })

      await store.fetchPosts({ limit: 20, offset: 40 })

      expect(mockApi.get).toHaveBeenCalledWith('/posts', {
        params: { limit: 20, offset: 40 },
      })
    })
  })

  describe('pagination — loadPosts', () => {
    it('calculates offset from page * pageSize', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({ data: { success: true, posts: [] } })

      await store.loadPosts('all', { page: 2, pageSize: 20 })

      expect(mockApi.get).toHaveBeenCalledWith('/posts', {
        params: { limit: 20, offset: 40 },
      })
    })
  })

  describe('createPost', () => {
    it('parses response and prepends to myPosts', async () => {
      const store = usePostStore()
      const newPost = makeOwnerPost('post-new')
      mockApi.post.mockResolvedValue({ data: { success: true, post: newPost } })

      const result = await store.createPost({
        content: 'hello',
        type: 'OFFER',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data!.post.id).toBe('post-new')
        expect(result.data!.post.createdAt).toBeInstanceOf(Date)
      }
      expect(store.myPosts[0]!.id).toBe('post-new')
    })
  })
})
```

- [ ] **Step 2: Run the tests**

Run: `pnpm --filter frontend exec vitest run apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts
git commit -m "test(postStore): update tests for StoreResponse and Zod parsing (#1216)"
```

---

### Task 3: Update caller — `usePostListViewModel.ts`

**Files:**
- Modify: `apps/frontend/src/features/posts/composables/usePostListViewModel.ts`

Changes: `loadPosts` return is now `StoreResponse` — check `.success` and extract `.data.posts` for the length check. `deletePost` — check `.success`. Remove `postStore.clearError()` call.

- [ ] **Step 1: Update the composable**

In `usePostListViewModel.ts`, update `loadPosts`:

```ts
// old (line 43-51):
const fetched = await postStore.loadPosts(options.scope || 'all', { ... })
if (fetched.length < pageSize) {
  hasMorePosts.value = false
}

// new:
const result = await postStore.loadPosts(options.scope || 'all', { ... })
if (result.success) {
  const fetched = result.data?.posts ?? []
  if (fetched.length < pageSize) {
    hasMorePosts.value = false
  }
}
```

Update `handlePostDelete`:

```ts
// old (line 87-88):
const success = await postStore.deletePost(post.id)
if (success) {

// new:
const result = await postStore.deletePost(post.id)
if (result.success) {
```

Update `handleRetry`:

```ts
// old (line 70-72):
const handleRetry = () => {
  postStore.clearError()
  loadPosts()
}

// new:
const handleRetry = () => {
  loadPosts()
}
```

- [ ] **Step 2: Run type-check**

Run: `pnpm --filter frontend exec vue-tsc --noEmit 2>&1 | grep -i "usePostListViewModel" | head -10`
Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/posts/composables/usePostListViewModel.ts
git commit -m "refactor(usePostListViewModel): adapt to StoreResponse returns (#1216)"
```

---

### Task 4: Update caller — `usePostsViewModel.ts`

**Files:**
- Modify: `apps/frontend/src/features/posts/composables/usePostsViewModel.ts`

Changes: `deletePost`, `hidePost`/`showPost` — check `.success` instead of truthy return.

- [ ] **Step 1: Update the composable**

In `usePostsViewModel.ts`, update `handleDelete`:

```ts
// old (line 73-74):
const success = await postStore.deletePost(post.id)
if (success) {

// new:
const result = await postStore.deletePost(post.id)
if (result.success) {
```

Update `handleHide`:

```ts
// old (line 86-92):
const isVisible = 'isVisible' in post ? post.isVisible !== false : true
const updatedPost = isVisible
  ? await postStore.hidePost(post.id)
  : await postStore.showPost(post.id)

if (updatedPost) {
  closePostOverlays()
}

// new:
const isVisible = 'isVisible' in post ? post.isVisible !== false : true
const result = isVisible
  ? await postStore.hidePost(post.id)
  : await postStore.showPost(post.id)

if (result.success) {
  closePostOverlays()
}
```

- [ ] **Step 2: Run type-check**

Run: `pnpm --filter frontend exec vue-tsc --noEmit 2>&1 | grep -i "usePostsViewModel" | head -10`
Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/posts/composables/usePostsViewModel.ts
git commit -m "refactor(usePostsViewModel): adapt to StoreResponse returns (#1216)"
```

---

### Task 5: Update caller — `EditPostDialog.vue`

**Files:**
- Modify: `apps/frontend/src/features/posts/components/EditPostDialog.vue`

Changes: `createPost`/`updatePost` now return `StoreResponse` — extract `.data.post` from success.

- [ ] **Step 1: Update handleSubmit**

In `EditPostDialog.vue`, update `handleSubmit`:

```ts
// old (line 64-78):
const { content, type, isVisible, location } = form.value
let savedPost: OwnerPost | null = null

if (props.isEdit && post) {
  savedPost = await postStore.updatePost(post.id, { content, type, isVisible, ...location })
} else {
  savedPost = await postStore.createPost({ content, type, ...location })
  if (savedPost) {
    form.value = PostFormSchema.parse({ location: props.defaultLocation })
  }
}

if (savedPost) emit('saved', savedPost)

// new:
const { content, type, isVisible, location } = form.value

const result = props.isEdit && post
  ? await postStore.updatePost(post.id, { content, type, isVisible, ...location })
  : await postStore.createPost({ content, type, ...location })

if (result.success && result.data) {
  if (!props.isEdit) {
    form.value = PostFormSchema.parse({ location: props.defaultLocation })
  }
  emit('saved', result.data.post)
}
```

- [ ] **Step 2: Run type-check**

Run: `pnpm --filter frontend exec vue-tsc --noEmit 2>&1 | grep -i "EditPostDialog" | head -10`
Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/posts/components/EditPostDialog.vue
git commit -m "refactor(EditPostDialog): adapt to StoreResponse returns (#1216)"
```

---

### Task 6: Update caller — `EditPost.vue`

**Files:**
- Modify: `apps/frontend/src/features/posts/views/EditPost.vue`

Changes: `fetchPost` now returns `StoreResponse` — extract `.data.post` from success.

- [ ] **Step 1: Update onMounted**

In `EditPost.vue`, update the `fetchPost` call:

```ts
// old (line 38-41):
const fetched = await postStore.fetchPost(postId.value)
if (fetched) {
  post.value = fetched as OwnerPost
}

// new:
const result = await postStore.fetchPost(postId.value)
if (result.success && result.data) {
  post.value = result.data.post
}
```

- [ ] **Step 2: Run type-check on all modified files**

Run: `pnpm --filter frontend exec vue-tsc --noEmit`
Expected: Clean — no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/posts/views/EditPost.vue
git commit -m "refactor(EditPost): adapt to StoreResponse returns (#1216)"
```

---

### Task 7: Update caller tests — `usePostListViewModel.spec.ts` and `usePostsViewModel.spec.ts`

**Files:**
- Modify: `apps/frontend/src/features/posts/composables/__tests__/usePostListViewModel.spec.ts`
- Modify: `apps/frontend/src/features/posts/composables/__tests__/usePostsViewModel.spec.ts`

Changes: Mock store methods return `StoreResponse` objects. Remove `error`/`clearError` from mock.

- [ ] **Step 1: Update `usePostListViewModel.spec.ts`**

Update the mock store and mock return values:

```ts
// old mock (line 10-18):
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

// new mock:
vi.mock('../../stores/postStore', () => ({
  usePostStore: () => ({
    posts: [],
    myPosts: [],
    loadPosts: mockLoadPosts,
  }),
}))
```

Update `beforeEach` mock return (line 27):

```ts
// old:
mockLoadPosts.mockResolvedValue([])

// new:
mockLoadPosts.mockResolvedValue({ success: true, data: { posts: [] } })
```

Update `handleLoadMore` test (line 40):

```ts
// old:
mockLoadPosts.mockResolvedValueOnce(new Array(20).fill({}))

// new:
mockLoadPosts.mockResolvedValueOnce({ success: true, data: { posts: new Array(20).fill({}) } })
```

Apply the same pattern to **all** other `mockLoadPosts` mock return calls — including `mockResolvedValue`, `mockResolvedValueOnce`, and `mockImplementationOnce` (which must return the `StoreResponse` object instead of a raw array). Wrap every returned array in `{ success: true, data: { posts: [...] } }`.

- [ ] **Step 2: Update `usePostsViewModel.spec.ts`**

No changes needed to the mock store for the current tests — `deletePost`, `hidePost`, `showPost` are mocked but not called in the existing tests (they only test `initialize`). The mocks just need to exist as `vi.fn()`.

- [ ] **Step 3: Run all post-related tests**

Run: `pnpm --filter frontend exec vitest run apps/frontend/src/features/posts/`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/posts/composables/__tests__/usePostListViewModel.spec.ts
git add apps/frontend/src/features/posts/composables/__tests__/usePostsViewModel.spec.ts
git commit -m "test: update composable tests for StoreResponse pattern (#1216)"
```

---

### Task 8: Revert `LocalizedTimeAgo.vue` and update its test

**Files:**
- Modify: `apps/frontend/src/features/shared/components/LocalizedTimeAgo.vue`
- Modify: `apps/frontend/src/features/shared/components/__tests__/LocalizedTimeAgo.spec.ts`

Changes: Revert prop type from `Date | string` to `Date`. Remove the `instanceof Date` ternary.

- [ ] **Step 1: Update `LocalizedTimeAgo.vue`**

Replace the full `<script setup>` block:

```ts
<script setup lang="ts">
import { useTimeAgoIntl } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ time: Date }>()

const { locale } = useI18n()
const timeAgo = useTimeAgoIntl(() => props.time, { locale: locale.value })
</script>
```

- [ ] **Step 2: Verify `LocalizedTimeAgo.spec.ts` still passes**

The existing tests already pass `Date` objects — no changes needed.

Run: `pnpm --filter frontend exec vitest run apps/frontend/src/features/shared/components/__tests__/LocalizedTimeAgo.spec.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/shared/components/LocalizedTimeAgo.vue
git commit -m "refactor(LocalizedTimeAgo): revert prop to Date-only now that posts are Zod-parsed (#1216)"
```

---

### Task 9: Full test suite and formatting

- [ ] **Step 1: Run the full frontend test suite**

Run: `pnpm --filter frontend test`
Expected: All tests pass.

- [ ] **Step 2: Format changed files**

Run:
```bash
pnpm exec prettier --write \
  apps/frontend/src/features/posts/stores/postStore.ts \
  apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts \
  apps/frontend/src/features/posts/composables/usePostListViewModel.ts \
  apps/frontend/src/features/posts/composables/usePostsViewModel.ts \
  apps/frontend/src/features/posts/composables/__tests__/usePostListViewModel.spec.ts \
  apps/frontend/src/features/posts/composables/__tests__/usePostsViewModel.spec.ts \
  apps/frontend/src/features/posts/components/EditPostDialog.vue \
  apps/frontend/src/features/posts/views/EditPost.vue \
  apps/frontend/src/features/shared/components/LocalizedTimeAgo.vue
```

- [ ] **Step 3: Run type-check**

Run: `pnpm type-check`
Expected: Clean.

- [ ] **Step 4: Commit formatting if needed**

```bash
git add -u
git commit -m "style: format changed files (#1216)"
```

- [ ] **Step 5: Run full CI suite**

Run: `pnpm run ci:test`
Expected: All checks pass.

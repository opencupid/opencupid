# postStore Cleanup: Zod Parsing, StoreResponse, Query Param Dedup

**Issue:** #1216
**Date:** 2026-03-24

## Problem

`postStore.ts` is the only Pinia store that skips Zod response parsing. It type-casts via generics (`safeApiCall<{ data: PostsResponse }>`), so `createdAt`/`updatedAt` arrive as ISO strings instead of `Date` objects. It also duplicates `URLSearchParams` building across 4 methods, and uses a raw `try/catch` + string error pattern instead of the `storeSuccess`/`storeError` helpers used by every other store.

## Changes

### 1. Zod Response Parsing

Parse every API response through the appropriate Zod schema:

| Endpoint group | Schema |
|---|---|
| `fetchPosts`, `fetchNearbyPosts`, `fetchRecentPosts`, `fetchPostsInBounds` | `PublicPostWithProfileSchema.array()` |
| `fetchMyPosts` | `OwnerPostSchema.array()` |
| `fetchPost`, `createPost`, `updatePost`, `setPostVisibility` | `OwnerPostSchema` |
| `deletePost` | No parsing needed (no post in response) |

The schemas already use `z.coerce.date()` for date fields, so ISO strings will be coerced to `Date`.

### 2. StoreResponse Return Pattern

Replace raw returns with `storeSuccess`/`storeError` from `@/store/helpers`:

| Action | Current return | New return |
|---|---|---|
| `createPost` | `OwnerPost \| null` | `StoreResponse<{ post: OwnerPost }>` |
| `updatePost` | `OwnerPost \| null` | `StoreResponse<{ post: OwnerPost }>` |
| `deletePost` | `boolean` | `StoreResponse<void>` |
| `setPostVisibility` | `OwnerPost \| null` | `StoreResponse<{ post: OwnerPost }>` |
| `hidePost` | `OwnerPost \| null` | `StoreResponse<{ post: OwnerPost }>` (delegates to `setPostVisibility`) |
| `showPost` | `OwnerPost \| null` | `StoreResponse<{ post: OwnerPost }>` (delegates to `setPostVisibility`) |
| `fetchPost` | `OwnerPost \| null` | `StoreResponse<{ post: OwnerPost }>` |
| `fetchPosts` | `PublicPostWithProfile[]` | `StoreResponse<{ posts: PublicPostWithProfile[] }>` |
| `fetchNearbyPosts` | `PublicPostWithProfile[]` | `StoreResponse<{ posts: PublicPostWithProfile[] }>` |
| `fetchRecentPosts` | `PublicPostWithProfile[]` | `StoreResponse<{ posts: PublicPostWithProfile[] }>` |
| `fetchMyPosts` | `OwnerPost[]` | `StoreResponse<{ posts: OwnerPost[] }>` |
| `fetchPostsInBounds` | `PublicPostWithProfile[]` | `StoreResponse<{ posts: PublicPostWithProfile[] }>` |
| `loadPosts` | `any[]` | `StoreResponse<{ posts: (PublicPostWithProfile \| OwnerPost)[] }>` |

**Remove from state:** `error` and `clearError()` (errors returned via `StoreError`), `isLoading` (callers manage their own).

**Note on `clearError` removal:** `usePostListViewModel.handleRetry` currently calls `postStore.clearError()` — this call is simply removed since errors are no longer stored in state.

### 3. Axios Params Object

Replace manual `URLSearchParams` construction with Axios `params` object. Before:

```ts
const params = new URLSearchParams()
if (query.type) params.set('type', query.type)
if (query.limit) params.set('limit', query.limit.toString())
if (query.offset) params.set('offset', query.offset.toString())
const r = await safeApiCall(() => api.get(`/posts?${params.toString()}`))
```

After:

```ts
const r = await safeApiCall(() => api.get('/posts', { params: query }))
```

Axios serializes the object automatically (omitting `undefined` values). This applies to `fetchPosts`, `fetchNearbyPosts`, `fetchRecentPosts`, `fetchMyPosts`, and `fetchPostsInBounds`.

**Behavior change:** The old code used `if (query.offset)` which is falsy for `0`, so `offset=0` was never sent. With Axios params, `{ offset: 0 }` will be serialized correctly. This is a bug fix — the backend defaults offset to `0` anyway, so there is no functional change.

### 4. LocalizedTimeAgo Cleanup

Revert `LocalizedTimeAgo.vue` prop type from `Date | string` back to `Date`. Remove the `instanceof Date` ternary — pass `props.time` directly to `useTimeAgoIntl`.

### 5. Caller Migration

Files that consume store action returns need updating:

- **`usePostListViewModel.ts`**: `loadPosts` — check `.success`, extract `.data.posts` for length check; `deletePost` — check `.success`; remove `postStore.clearError()` call in `handleRetry`
- **`usePostsViewModel.ts`**: `deletePost`/`hidePost`/`showPost` — check `.success`; `fetchPostsInBounds` — check `.success`
- **`EditPostDialog.vue`**: `createPost`/`updatePost` — extract `.data.post` from success response
- **`EditPost.vue`**: `fetchPost` — extract `.data.post` from success response

### 6. Tests

Update all 3 test files to match new return types:

- `postStore.spec.ts` — mock API responses, assert Zod parsing occurs, verify `StoreResponse` shape
- `usePostListViewModel.spec.ts` — mock store methods to return `StoreResponse`
- `usePostsViewModel.spec.ts` — mock store methods to return `StoreResponse`

## Files Modified

| File | Change |
|---|---|
| `apps/frontend/src/features/posts/stores/postStore.ts` | Zod parsing, StoreResponse, Axios params |
| `apps/frontend/src/features/shared/components/LocalizedTimeAgo.vue` | Revert prop to `Date` only |
| `apps/frontend/src/features/posts/composables/usePostListViewModel.ts` | Adapt to StoreResponse |
| `apps/frontend/src/features/posts/composables/usePostsViewModel.ts` | Adapt to StoreResponse |
| `apps/frontend/src/features/posts/components/EditPostDialog.vue` | Adapt to StoreResponse |
| `apps/frontend/src/features/posts/views/EditPost.vue` | Adapt to StoreResponse |
| `apps/frontend/src/features/shared/components/__tests__/LocalizedTimeAgo.spec.ts` | Update prop type in tests |
| `apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts` | Update for new returns + parsing |
| `apps/frontend/src/features/posts/composables/__tests__/usePostListViewModel.spec.ts` | Update mocks |
| `apps/frontend/src/features/posts/composables/__tests__/usePostsViewModel.spec.ts` | Update mocks |

## Out of Scope

- Changing the backend API response shape
- Adding new endpoints
- Refactoring other stores

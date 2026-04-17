# NearbyFeatures Component — Design Spec

## Summary

A horizontal, single-row strip at the bottom of the browse map showing nearby posts derived from the already-loaded cluster data. Tapping a card navigates to the post detail view via the existing route mechanism.

## Motivation

The browse map shows post markers but offers no at-a-glance way to scan nearby post content without clicking each marker. A lightweight strip surfaces this content passively while the user pans the map.

## Changes

### 1. Rename `PostList.vue` → `MyPostList.vue`

**Why:** `PostList` is tightly coupled to `usePostListViewModel` (API-driven, paginated, owner-scoped). The name suggests general-purpose reuse, but its responsibility is "my posts" management. Renaming clarifies intent.

**Files affected:**

| File | Change |
|------|--------|
| `apps/frontend/src/features/posts/components/PostList.vue` | Rename to `MyPostList.vue` |
| `apps/frontend/src/features/posts/components/PostsOrchestrator.vue` | Update import path |
| `apps/frontend/src/features/posts/components/__tests__/PostList.spec.ts` | Rename to `MyPostList.spec.ts`, update import |
| `apps/frontend/src/features/myprofile/components/__tests__/ProfilePanel.spec.ts` | Update stub name |

No logic changes — pure rename.

### 2. Create `NearbyFeatures.vue`

**Location:** `apps/frontend/src/features/browse/components/NearbyFeatures.vue`

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `posts` | `MapPoi[]` | Post POIs from `useBrowseViewModel.postPois` |

**Emits:**

| Event | Payload | Description |
|-------|---------|-------------|
| `post:select` | `PostSummary` | User tapped a post card; forwarded from `PointFeature.source` |

**Template structure:**

- Outer wrapper: horizontal scrollable container, single row
- Each post: lightweight post-it card showing truncated `postContent` (max ~120 chars), styled with `--postit-bg` background and `Patrick Hand` font (matching `PostMapPopup`)
- Hidden when `posts` is empty (no empty-state message)

**Styling adapted from `PostMapPopup.vue`:**

- `background: var(--postit-bg)`
- `font-family: 'Patrick Hand', cursive`
- Fixed-width cards for consistent horizontal layout
- Horizontal overflow scroll with hidden scrollbar

### 3. Wire into `BrowseProfiles.vue`

**In `<script setup>`:**

- Import `NearbyFeatures` from `../components/NearbyFeatures.vue`
- Pass `postPois` (already exposed by `useBrowseViewModel`) as `:posts` prop

**In `<template>`:**

- Replace the TODO placeholder div at line 247-250 with:
  ```vue
  <NearbyFeatures
    :posts="postPois"
    @post:select="handlePostSelect"
  />
  ```
- Remove `bg-warning` debug class
- Keep `position-absolute bottom-0` positioning on the wrapper

**In `useBrowseViewModel`:** `postPois` is already returned — no changes needed. `BrowseProfiles.vue` already destructures `allPois` but not `postPois` — add it to the destructure.

## Data flow

```
findProfileStore.clusterFeatures (MapFeature[])
  → useBrowseViewModel.postPois (MapPoi[]) — filters kind === 'post'
    → NearbyFeatures :posts prop
      → renders horizontal post-it cards
        → user taps card
          → emits post:select with poi.source (PointFeature cast as PostSummary)
            → handlePostSelect(post) in BrowseProfiles.vue
              → router.push({ name: 'PublicPost', params: { postId } })
```

## What this does NOT include

- No new API calls — purely presentational over existing cluster data
- No infinite scroll or pagination — bounded by current viewport
- No `PostCard` or `PostIt` component reuse — inline styling adapted from `PostMapPopup`
- No new Pinia store or composable
- No backend changes

## Test plan

- **NearbyFeatures.spec.ts**: Renders post cards from props, emits `post:select` on click, hidden when empty
- **MyPostList rename**: Existing `PostList.spec.ts` tests pass after rename
- **BrowseProfiles.spec.ts**: Verify `NearbyFeatures` receives `postPois` and `post:select` triggers navigation

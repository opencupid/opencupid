# NearbyFeatures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a horizontal strip of nearby posts at the bottom of the browse map, sourced from existing cluster data.

**Architecture:** `NearbyFeatures` is a purely presentational component receiving `MapPoi[]` via props from `useBrowseViewModel.postPois`. It emits `post:select` which the parent `BrowseProfiles.vue` routes through the existing `handlePostSelect` handler. Separately, `PostList.vue` is renamed to `MyPostList.vue` to clarify its responsibility.

**Tech Stack:** Vue 3 Composition API + TypeScript, Bootstrap 5 utilities, Vitest + Vue Test Utils

**Spec:** `docs/superpowers/specs/2026-04-17-nearby-features-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/frontend/src/features/browse/components/NearbyFeatures.vue` | Horizontal post strip at bottom of map |
| Create | `apps/frontend/src/features/browse/components/__tests__/NearbyFeatures.spec.ts` | Tests for NearbyFeatures |
| Rename | `apps/frontend/src/features/posts/components/PostList.vue` → `MyPostList.vue` | Clarify naming |
| Rename | `apps/frontend/src/features/posts/components/__tests__/PostList.spec.ts` → `MyPostList.spec.ts` | Match component rename |
| Modify | `apps/frontend/src/features/posts/components/PostsOrchestrator.vue:9` | Update import path |
| Modify | `apps/frontend/src/features/browse/views/BrowseProfiles.vue:247-250` | Wire NearbyFeatures into map view |
| Modify | `apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts` | Add NearbyFeatures stub + test |

---

### Task 1: Rename PostList → MyPostList

**Files:**
- Rename: `apps/frontend/src/features/posts/components/PostList.vue` → `MyPostList.vue`
- Rename: `apps/frontend/src/features/posts/components/__tests__/PostList.spec.ts` → `MyPostList.spec.ts`
- Modify: `apps/frontend/src/features/posts/components/PostsOrchestrator.vue:9`
- Modify: `apps/frontend/src/features/posts/components/__tests__/MyPostList.spec.ts:38`

- [ ] **Step 1: Rename the component file**

```bash
cd apps/frontend/src/features/posts/components
git mv PostList.vue MyPostList.vue
```

- [ ] **Step 2: Rename the test file**

```bash
git mv __tests__/PostList.spec.ts __tests__/MyPostList.spec.ts
```

- [ ] **Step 3: Update the import in PostsOrchestrator.vue**

In `apps/frontend/src/features/posts/components/PostsOrchestrator.vue`, change line 9:

```diff
-import PostList from './PostList.vue'
+import MyPostList from './MyPostList.vue'
```

And in the template (line 77-82):

```diff
-    <PostList
+    <MyPostList
       scope="my"
       @intent:edit="openEditPost"
       @intent:delete="handleDelete"
       @intent:hide="handleHide"
     />
```

- [ ] **Step 4: Update the import in MyPostList.spec.ts**

In `apps/frontend/src/features/posts/components/__tests__/MyPostList.spec.ts`, change line 38:

```diff
-import PostList from '../PostList.vue'
+import MyPostList from '../MyPostList.vue'
```

Then update all references in the test from `PostList` to `MyPostList`:

- Line 58: `describe('MyPostList', () => {`
- Lines 69, 81, 93, 106, 117, 126, 135, 146: `mount(MyPostList, {`

- [ ] **Step 5: Run tests to verify nothing broke**

```bash
pnpm --filter frontend exec vitest run -t "MyPostList"
pnpm --filter frontend exec vitest run -t "PostsOrchestrator"
```

Expected: All tests pass.

- [ ] **Step 6: Run lint to catch stale imports**

```bash
pnpm lint
```

Expected: No new errors.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/features/posts/components/MyPostList.vue \
       apps/frontend/src/features/posts/components/__tests__/MyPostList.spec.ts \
       apps/frontend/src/features/posts/components/PostsOrchestrator.vue
git commit -m "refactor: rename PostList to MyPostList to clarify responsibility"
```

---

### Task 2: Create NearbyFeatures component

**Files:**
- Create: `apps/frontend/src/features/browse/components/NearbyFeatures.vue`

- [ ] **Step 1: Create the component**

Create `apps/frontend/src/features/browse/components/NearbyFeatures.vue`:

```vue
<script setup lang="ts">
import type { MapPoi } from '@/features/map/types/map.types'
import type { PostSummary } from '@zod/post/post.dto'

defineProps<{
  posts: MapPoi[]
}>()

const emit = defineEmits<{
  (e: 'post:select', post: PostSummary): void
}>()

function handleClick(poi: MapPoi) {
  emit('post:select', poi.source as PostSummary)
}
</script>

<template>
  <div
    v-if="posts.length > 0"
    class="nearby-posts d-flex gap-2 p-2 overflow-auto hide-scrollbar"
  >
    <div
      v-for="poi in posts"
      :key="poi.id"
      class="nearby-post-card flex-shrink-0 p-2 cursor-pointer user-select-none"
      @click="handleClick(poi)"
    >
      {{ (poi.title ?? '').substring(0, 120) }}
    </div>
  </div>
</template>

<style scoped>
.nearby-posts {
  scroll-snap-type: x mandatory;
}

.nearby-post-card {
  background: var(--postit-bg);
  font-family: 'Patrick Hand', cursive;
  font-size: 0.85rem;
  word-break: break-word;
  border-radius: var(--radius-md, 0.5rem);
  width: 10rem;
  max-height: 5rem;
  overflow: hidden;
  scroll-snap-align: start;
}
</style>
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm --filter frontend exec vue-tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/browse/components/NearbyFeatures.vue
git commit -m "feat: add NearbyFeatures component for nearby posts strip"
```

---

### Task 3: Write NearbyFeatures tests

**Files:**
- Create: `apps/frontend/src/features/browse/components/__tests__/NearbyFeatures.spec.ts`

- [ ] **Step 1: Create the test file**

Create `apps/frontend/src/features/browse/components/__tests__/NearbyFeatures.spec.ts`:

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import NearbyFeatures from '../NearbyFeatures.vue'
import type { MapPoi } from '@/features/map/types/map.types'

function makePoi(id: string, title: string): MapPoi {
  return {
    id,
    title,
    location: { lat: 47.5, lon: 19.0 },
    type: 'post',
    source: { id, type: 'OFFER', content: title, location: {}, postedBy: {} },
  }
}

describe('NearbyFeatures', () => {
  it('renders nothing when posts array is empty', () => {
    const wrapper = mount(NearbyFeatures, {
      props: { posts: [] },
    })
    expect(wrapper.find('.nearby-posts').exists()).toBe(false)
  })

  it('renders a card for each post', () => {
    const posts = [makePoi('p1', 'First post'), makePoi('p2', 'Second post')]
    const wrapper = mount(NearbyFeatures, {
      props: { posts },
    })
    const cards = wrapper.findAll('.nearby-post-card')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('First post')
    expect(cards[1].text()).toContain('Second post')
  })

  it('truncates long content to 120 characters', () => {
    const longContent = 'A'.repeat(200)
    const wrapper = mount(NearbyFeatures, {
      props: { posts: [makePoi('p1', longContent)] },
    })
    expect(wrapper.find('.nearby-post-card').text()).toHaveLength(120)
  })

  it('emits post:select with source on card click', async () => {
    const poi = makePoi('p1', 'Click me')
    const wrapper = mount(NearbyFeatures, {
      props: { posts: [poi] },
    })
    await wrapper.find('.nearby-post-card').trigger('click')
    expect(wrapper.emitted('post:select')).toBeTruthy()
    expect(wrapper.emitted('post:select')![0][0]).toEqual(poi.source)
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
pnpm --filter frontend exec vitest run -t "NearbyFeatures"
```

Expected: All 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/browse/components/__tests__/NearbyFeatures.spec.ts
git commit -m "test: add NearbyFeatures component tests"
```

---

### Task 4: Wire NearbyFeatures into BrowseProfiles

**Files:**
- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue`

- [ ] **Step 1: Add import**

In `apps/frontend/src/features/browse/views/BrowseProfiles.vue`, add after line 28 (after `OwnerDrawerControls` import):

```typescript
import NearbyFeatures from '../components/NearbyFeatures.vue'
```

- [ ] **Step 2: Destructure postPois from the view model**

Change the destructure at lines 39-49 to include `postPois`:

```diff
 const {
   viewerProfile,
   isNoOneAround,
   clusters,
   allPois,
+  postPois,
   availableTags,
   activePoi,
   onSelectionClear,
   onBoundsChanged,
   fetchPopupData,
 } = useBrowseViewModel()
```

- [ ] **Step 3: Replace the TODO placeholder in the template**

Replace lines 247-250:

```html
        <div class="nearby-features position-absolute bottom-0 z-100 col-12 bg-warning" >
          <!-- TODO nearby posts - list posts within the current bounds -->
          <NeabyFeatures/>
        </div>
```

With:

```html
        <NearbyFeatures
          class="position-absolute bottom-0 w-100"
          :posts="postPois"
          @post:select="handlePostSelect"
        />
```

- [ ] **Step 4: Remove the now-unused `.nearby-features` CSS rule**

Delete from the `<style scoped>` block (lines 260-262):

```css
.nearby-features {
  z-index: 10000;
}
```

- [ ] **Step 5: Format changed file**

```bash
pnpm exec prettier --write apps/frontend/src/features/browse/views/BrowseProfiles.vue
```

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/browse/views/BrowseProfiles.vue
git commit -m "feat: wire NearbyFeatures into browse map view"
```

---

### Task 5: Update BrowseProfiles tests

**Files:**
- Modify: `apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts`

- [ ] **Step 1: Add NearbyFeatures mock**

After the existing mock for `OwnerDrawerControls` (after line 48), add:

```typescript
vi.mock('../../components/NearbyFeatures.vue', () => ({
  default: {
    name: 'NearbyFeatures',
    template: '<div class="nearby-features-stub" />',
    props: ['posts'],
    emits: ['post:select'],
  },
}))
```

- [ ] **Step 2: Add test for NearbyFeatures receiving postPois**

Add at the end of the `describe` block (before the closing `})`):

```typescript
  it('passes postPois to NearbyFeatures', () => {
    vmState.postPois.value = [
      {
        id: 'post-1',
        title: 'Test post',
        location: { lat: 47.5, lon: 19.0 },
        type: 'post',
        source: { id: 'post-1', type: 'OFFER', content: 'Test post' },
      },
    ]
    const wrapper = mountComponent()
    const nearby = wrapper.findComponent({ name: 'NearbyFeatures' })
    expect(nearby.exists()).toBe(true)
    expect(nearby.props('posts')).toHaveLength(1)
    expect(nearby.props('posts')[0].id).toBe('post-1')
  })

  it('navigates to post route when NearbyFeatures emits post:select', async () => {
    const wrapper = mountComponent()
    const nearby = wrapper.findComponent({ name: 'NearbyFeatures' })
    nearby.vm.$emit('post:select', { id: 'post-42' })
    await nextTick()
    expect(mockPush).toHaveBeenCalledWith({
      name: 'PublicPost',
      params: { postId: 'post-42' },
    })
  })
```

- [ ] **Step 3: Run the tests**

```bash
pnpm --filter frontend exec vitest run -t "BrowseProfiles"
```

Expected: All tests pass (existing + 2 new).

- [ ] **Step 4: Format changed file**

```bash
pnpm exec prettier --write apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts
git commit -m "test: add BrowseProfiles tests for NearbyFeatures integration"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full frontend test suite**

```bash
pnpm --filter frontend test
```

Expected: All tests pass.

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: No errors.

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: No new errors.

- [ ] **Step 4: Visual check in browser**

Start dev server (`pnpm dev`), open `https://localhost:5173/home`, and verify:
- The post strip appears at the bottom of the map when posts are in the viewport
- Clicking a post card navigates to the post detail view
- Panning the map updates the strip
- When no posts are in the viewport, the strip is hidden

# Browse Refactor — Plan 2: Unified Map + Filter Bar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `BrowsePosts` and `BrowseProfiles` into a single unified map view with two POI types (profile avatar circles, post post-it markers), a unified floating filter pill replacing the two existing filter bars, and bounds-reactive tag filtering.

**Architecture:** `BrowseProfiles.vue` becomes the unified view shell. A new `useBrowseViewModel` composable replaces `useSocialMatchViewModel` + `usePostsViewModel`, calling the new `GET /browse/bounds` endpoint. `BrowseFilterBar` is redesigned as a floating pill. `BrowsePosts.vue` route is retired. `MapView` receives a typed mixed-POI array with a per-item icon component resolver.

**Tech Stack:** Vue 3 Composition API, Pinia, Leaflet (via existing MapView), VueUse, Bootstrap 5.

**Prerequisite:** Plan 1 (backend `GET /browse/bounds`) must be deployed/available.

**Spec reference:** `docs/superpowers/specs/2026-04-03-browse-gui-refactor-design.md` §§ 1, 2

---

## File Map

| Action | Path |
|--------|------|
| Create | `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts` |
| Create | `apps/frontend/src/features/browse/api/browseApi.ts` |
| Create | `apps/frontend/src/features/browse/components/PostMarkerIcon.vue` |
| Modify | `apps/frontend/src/features/browse/views/BrowseProfiles.vue` — unified view shell |
| Modify | `apps/frontend/src/features/browse/components/BrowseFilterBar.vue` — redesign as pill |
| Modify | `apps/frontend/src/features/shared/components/MapView.vue` — per-item icon resolver |
| Modify | `apps/frontend/src/router/index.ts` — retire `/posts` route, redirect `/posts` → `/browse` |
| Retire | `apps/frontend/src/features/posts/views/BrowsePosts.vue` (route only; keep file for now) |

---

### Task 1: Add browse API client

**Files:**
- Create: `apps/frontend/src/features/browse/api/browseApi.ts`

- [ ] **Step 1: Write the API module**

Look at an existing API module (e.g. `apps/frontend/src/features/posts/api/`) for the fetch/axios pattern used.

```ts
// apps/frontend/src/features/browse/api/browseApi.ts
import { apiFetch } from '@/lib/api'
import type { BrowseBoundsResponse } from '@zod/apiResponse.dto'
import type { Bounds } from '@shared/zod/dto/bounds.dto'

export async function fetchBrowseBounds(bounds: Bounds): Promise<BrowseBoundsResponse> {
  const params = new URLSearchParams({
    south: String(bounds.south),
    north: String(bounds.north),
    west: String(bounds.west),
    east: String(bounds.east),
  })
  return apiFetch<BrowseBoundsResponse>(`/browse/bounds?${params}`)
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/browse/api/browseApi.ts
git commit -m "feat(browse): add browseApi client for /browse/bounds"
```

---

### Task 2: Create `useBrowseViewModel` composable

**Files:**
- Create: `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts`
- Create: `apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.test.ts`

This composable replaces both `useSocialMatchViewModel` and `usePostsViewModel` for the unified view. It fetches on bounds change, debounced.

- [ ] **Step 1: Write the failing test**

```ts
// apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBrowseViewModel } from '../useBrowseViewModel'
import * as browseApi from '../../api/browseApi'
import type { Bounds } from '@shared/zod/dto/bounds.dto'

vi.mock('../../api/browseApi')

const mockBounds: Bounds = { south: 46.5, north: 47.5, west: 18.0, east: 19.0 }

describe('useBrowseViewModel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches browse data when bounds change', async () => {
    vi.mocked(browseApi.fetchBrowseBounds).mockResolvedValue({
      success: true,
      profiles: [],
      posts: [],
      tags: [],
    })

    const vm = useBrowseViewModel()
    await vm.onBoundsChanged(mockBounds)

    expect(browseApi.fetchBrowseBounds).toHaveBeenCalledWith(mockBounds)
  })

  it('exposes profiles and posts as MapPoi arrays', async () => {
    vi.mocked(browseApi.fetchBrowseBounds).mockResolvedValue({
      success: true,
      profiles: [{ id: 'p1', publicName: 'Mónika', lat: 47.0, lon: 18.5, image: null, tags: [] }],
      posts: [{ id: 'post1', title: 'Cherry', lat: 47.1, lon: 18.6, image: null }],
      tags: [{ id: 't1', name: 'Biokert' }],
    })

    const vm = useBrowseViewModel()
    await vm.onBoundsChanged(mockBounds)

    expect(vm.profilePois.value).toHaveLength(1)
    expect(vm.postPois.value).toHaveLength(1)
    expect(vm.availableTags.value).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm --filter frontend exec vitest run src/features/browse/composables/__tests__/useBrowseViewModel.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the composable**

```ts
// apps/frontend/src/features/browse/composables/useBrowseViewModel.ts
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { fetchBrowseBounds } from '../api/browseApi'
import type { Bounds } from '@shared/zod/dto/bounds.dto'
import type { MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'
import type { PublicTag } from '@zod/tag/tag.dto'

const BOUNDS_DEBOUNCE_MS = 400

export function useBrowseViewModel() {
  const profilePois = ref<MapPoi[]>([])
  const postPois = ref<MapPoi[]>([])
  const availableTags = ref<PublicTag[]>([])
  const selectedTagIds = ref<string[]>([])
  const isLoading = ref(false)

  async function fetchBounds(bounds: Bounds) {
    isLoading.value = true
    try {
      const result = await fetchBrowseBounds(bounds)
      if (!result.success) return

      profilePois.value = result.profiles.map((p) => ({
        id: p.id,
        title: p.publicName,
        location: { lat: p.lat, lon: p.lon },
        image: p.image ?? undefined,
        type: 'profile' as const,
        source: p,
      }))

      postPois.value = result.posts.map((p) => ({
        id: p.id,
        title: p.title ?? '',
        location: { lat: p.lat, lon: p.lon },
        image: p.image ?? undefined,
        type: 'post' as const,
        source: p,
      }))

      availableTags.value = result.tags
    } finally {
      isLoading.value = false
    }
  }

  const onBoundsChanged = useDebounceFn(fetchBounds, BOUNDS_DEBOUNCE_MS)

  const filteredPostPois = computed(() => {
    if (selectedTagIds.value.length === 0) return postPois.value
    return postPois.value // posts have no tags — filter is profile-only
  })

  const filteredProfilePois = computed(() => {
    if (selectedTagIds.value.length === 0) return profilePois.value
    return profilePois.value.filter((poi) =>
      (poi.source?.tags ?? []).some((t: { id: string }) => selectedTagIds.value.includes(t.id))
    )
  })

  return {
    profilePois,
    postPois,
    filteredProfilePois,
    filteredPostPois,
    availableTags,
    selectedTagIds,
    isLoading,
    onBoundsChanged,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter frontend exec vitest run src/features/browse/composables/__tests__/useBrowseViewModel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/browse/composables/useBrowseViewModel.ts \
        apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.test.ts
git commit -m "feat(browse): add useBrowseViewModel composable"
```

---

### Task 3: Create `PostMarkerIcon.vue` (post-it marker shape)

**Files:**
- Create: `apps/frontend/src/features/browse/components/PostMarkerIcon.vue`

This is the post-it note SVG marker: rectangle with folded top-right corner, anchor stem pointing down.

- [ ] **Step 1: Write the component**

```vue
<!-- apps/frontend/src/features/browse/components/PostMarkerIcon.vue -->
<script setup lang="ts">
defineOptions({ name: 'PostMarkerIcon' })
</script>

<template>
  <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
    <!-- Post-it body with folded corner -->
    <polygon points="0,0 22,0 32,10 32,32 0,32" fill="var(--bs-white)" stroke="var(--bs-gray-400)" stroke-width="1.5"/>
    <!-- Folded corner triangle -->
    <polygon points="22,0 32,10 22,10" fill="var(--bs-gray-300)" stroke="var(--bs-gray-400)" stroke-width="1"/>
    <!-- Text lines (decorative) -->
    <line x1="5" y1="16" x2="27" y2="16" stroke="var(--bs-gray-400)" stroke-width="1.5"/>
    <line x1="5" y1="22" x2="27" y2="22" stroke="var(--bs-gray-400)" stroke-width="1.5"/>
    <line x1="5" y1="28" x2="18" y2="28" stroke="var(--bs-gray-400)" stroke-width="1.5"/>
    <!-- Anchor stem -->
    <polygon points="12,32 16,40 20,32" fill="var(--bs-white)" stroke="var(--bs-gray-400)" stroke-width="1.5"/>
  </svg>
</template>
```

- [ ] **Step 2: Verify it renders in isolation**

Open the dev server (`pnpm dev`) and add `<PostMarkerIcon />` temporarily to a visible page to confirm it renders correctly.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/browse/components/PostMarkerIcon.vue
git commit -m "feat(browse): add PostMarkerIcon post-it SVG marker"
```

---

### Task 4: Update `MapView.vue` for per-item icon component resolution

**Files:**
- Modify: `apps/frontend/src/features/shared/components/MapView.vue`

Currently `MapView` accepts a single `icon-component` prop applied to all POIs. It needs to support a per-item resolver so profile POIs use `MapIcon` (avatar circle) and post POIs use `PostMarkerIcon`.

- [ ] **Step 1: Read the current MapView API**

```bash
head -80 apps/frontend/src/features/shared/components/MapView.vue
```

Identify the current `iconComponent` prop type and how it's used to render each marker.

- [ ] **Step 2: Add `iconResolver` prop (backwards compatible)**

Add an optional `iconResolver` prop of type `(poi: MapPoi) => Component`. When provided it takes precedence over `iconComponent`. Existing callers pass `iconComponent` and are unaffected.

The change is in the props definition and in the marker-rendering logic:

```ts
// In MapView.vue <script setup>
const props = defineProps<{
  items: MapPoi[]
  iconComponent?: Component        // existing — kept for compatibility
  iconResolver?: (poi: MapPoi) => Component  // new
  // ... other existing props unchanged
}>()

function resolveIcon(poi: MapPoi): Component {
  if (props.iconResolver) return props.iconResolver(poi)
  return props.iconComponent!
}
```

Replace all direct references to `props.iconComponent` in the marker loop with `resolveIcon(poi)`.

- [ ] **Step 3: Write a component test**

```ts
// apps/frontend/src/features/shared/components/__tests__/MapView.test.ts
// Add this test to the existing test file (or create it):
it('uses iconResolver when provided to select icon per poi', () => {
  const ProfileIcon = defineComponent({ template: '<div class="profile-icon"/>' })
  const PostIcon = defineComponent({ template: '<div class="post-icon"/>' })

  const resolver = (poi: MapPoi) => poi.type === 'post' ? PostIcon : ProfileIcon

  // Assert resolver is called with each poi — mock and verify
  const spy = vi.fn(resolver)
  mount(MapView, {
    props: {
      items: [
        { id: '1', type: 'profile', location: { lat: 47, lon: 18 }, title: 'P' },
        { id: '2', type: 'post', location: { lat: 47, lon: 19 }, title: 'Q' },
      ],
      iconResolver: spy,
    },
  })
  expect(spy).toHaveBeenCalledTimes(2)
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'profile' }))
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'post' }))
})
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter frontend test
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/shared/components/MapView.vue \
        apps/frontend/src/features/shared/components/__tests__/MapView.test.ts
git commit -m "feat(map): add iconResolver prop to MapView for per-item icon selection"
```

---

### Task 5: Update `BrowseProfiles.vue` as unified view

**Files:**
- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue`

Replace `useSocialMatchViewModel` + per-profile data with `useBrowseViewModel`. Pass mixed POI array with `iconResolver`.

- [ ] **Step 1: Replace the composable and data wiring**

Key changes (read the full file before editing):

```vue
<script setup lang="ts">
import { computed, onMounted, provide, toRef } from 'vue'
import { useBrowseViewModel } from '../composables/useBrowseViewModel'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import BrowseLayout from '@/features/shared/components/BrowseLayout.vue'
import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ProfileMapIcon from '@/features/publicprofile/components/MapIcon.vue'
import PostMarkerIcon from '../components/PostMarkerIcon.vue'
import type { MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'

defineOptions({ name: 'BrowseProfiles' })

const {
  filteredProfilePois,
  filteredPostPois,
  availableTags,
  selectedTagIds,
  isLoading,
  onBoundsChanged,
} = useBrowseViewModel()

const ownerStore = useOwnerProfileStore()
provide('viewerProfile', toRef(ownerStore, 'profile'))

onMounted(() => { /* initial load handled by first bounds event from MapView */ })

const allPois = computed<MapPoi[]>(() => [
  ...filteredProfilePois.value,
  ...filteredPostPois.value,
])

function iconResolver(poi: MapPoi) {
  return poi.type === 'post' ? PostMarkerIcon : ProfileMapIcon
}
</script>

<template>
  <BrowseLayout>
    <template #filter-bar>
      <BrowseFilterBar
        v-model:selected-tag-ids="selectedTagIds"
        :available-tags="availableTags"
      />
    </template>
    <template #results>
      <MapView
        :items="allPois"
        :icon-resolver="iconResolver"
        :is-loading="isLoading"
        @bounds-changed="onBoundsChanged"
      />
    </template>
  </BrowseLayout>
</template>
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Fix any type mismatches before proceeding.

- [ ] **Step 3: Smoke test in browser**

Open `https://localhost:5173/browse`. Both profile avatar circles and post-it markers should appear on the map. Open devtools network tab and confirm `GET /browse/bounds` is called on pan/zoom.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/browse/views/BrowseProfiles.vue
git commit -m "feat(browse): unify profile and post POIs in BrowseProfiles view"
```

---

### Task 6: Redesign `BrowseFilterBar.vue` as unified floating pill

**Files:**
- Modify: `apps/frontend/src/features/browse/components/BrowseFilterBar.vue`

The pill contains: location text (from existing `LocationFilterInput`) · selected tag pills with ✕ · `▾` chevron. The `▾` opens a dropdown with two sections: LOCATION (current + change link) and TAGS IN AREA (chips from `availableTags`). On sm: selected pills replaced by count badge.

- [ ] **Step 1: Rewrite the template and props**

New props replacing the old `SocialMatchFilterDTO` v-model:

```ts
// Props
const props = defineProps<{
  availableTags: PublicTag[]
}>()
const selectedTagIds = defineModel<string[]>('selectedTagIds', { default: () => [] })

// Local state
const isOpen = ref(false)
function toggleTag(id: string) {
  const idx = selectedTagIds.value.indexOf(id)
  if (idx === -1) selectedTagIds.value = [...selectedTagIds.value, id]
  else selectedTagIds.value = selectedTagIds.value.filter((t) => t !== id)
}
function clearAll() { selectedTagIds.value = [] }
```

Template structure (Bootstrap classes for layout, no custom CSS needed):

```html
<template>
  <!-- Floating pill wrapper -->
  <div class="browse-filter-pill rounded-pill bg-white shadow-sm px-3 py-2 d-flex align-items-center gap-2"
       @click.stop>
    <!-- Location -->
    <LocationFilterInput v-model="locationModel" compact />
    <!-- Dot separator + tag pills (hidden on sm) -->
    <template v-if="selectedTagIds.length">
      <span class="text-muted d-none d-md-inline">·</span>
      <span v-for="id in selectedTagIds" :key="id"
            class="badge rounded-pill bg-secondary d-none d-md-inline-flex gap-1">
        {{ tagLabel(id) }}
        <button class="btn-close btn-close-white btn-sm" @click="toggleTag(id)" />
      </span>
      <!-- sm: count badge -->
      <span class="badge rounded-pill bg-secondary d-md-none">{{ selectedTagIds.length }}</span>
    </template>
    <!-- Chevron -->
    <button class="btn btn-link btn-sm p-0 ms-auto text-muted" @click="isOpen = !isOpen">▾</button>
  </div>

  <!-- Dropdown panel -->
  <div v-if="isOpen" class="browse-filter-dropdown bg-white rounded shadow p-3 mt-1">
    <div class="text-uppercase text-muted small fw-bold mb-2">Location</div>
    <!-- Location row handled by LocationFilterInput above — show summary here -->
    <div class="mb-3 small">{{ currentLocationLabel }} <button class="btn btn-link btn-sm p-0">change ›</button></div>
    <div class="text-uppercase text-muted small fw-bold mb-2">Tags in area</div>
    <div class="d-flex flex-wrap gap-2">
      <button v-for="tag in availableTags" :key="tag.id"
              class="badge rounded-pill border"
              :class="selectedTagIds.includes(tag.id) ? 'bg-secondary text-white' : 'bg-white text-dark'"
              @click="toggleTag(tag.id)">
        #{{ tag.name }}
      </button>
    </div>
    <div v-if="selectedTagIds.length" class="mt-2 text-end">
      <button class="btn btn-link btn-sm text-muted p-0" @click="clearAll">Clear all</button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Write a component test for tag toggle behaviour**

```ts
// apps/frontend/src/features/browse/components/__tests__/BrowseFilterBar.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BrowseFilterBar from '../BrowseFilterBar.vue'

const tags = [{ id: 't1', name: 'Biokert' }, { id: 't2', name: 'Főzés' }]

describe('BrowseFilterBar', () => {
  it('emits updated selectedTagIds when a tag chip is clicked', async () => {
    const wrapper = mount(BrowseFilterBar, {
      props: { availableTags: tags, selectedTagIds: [] },
    })
    // open dropdown
    await wrapper.find('button[class*="chevron"], button:last-child').trigger('click')
    // click first tag
    const tagButtons = wrapper.findAll('.browse-filter-dropdown button')
    await tagButtons[0].trigger('click')
    expect(wrapper.emitted('update:selectedTagIds')?.[0]).toEqual([['t1']])
  })

  it('removes a tag when its ✕ is clicked', async () => {
    const wrapper = mount(BrowseFilterBar, {
      props: { availableTags: tags, selectedTagIds: ['t1'] },
    })
    const closeBtn = wrapper.find('.btn-close')
    await closeBtn.trigger('click')
    expect(wrapper.emitted('update:selectedTagIds')?.[0]).toEqual([[]])
  })
})
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter frontend exec vitest run src/features/browse/components/__tests__/BrowseFilterBar.test.ts
```

Expected: PASS.

- [ ] **Step 4: Position the pill as a floating overlay**

In `BrowseLayout.vue`, change the `filter-bar` slot to render as a floating overlay above the map:

```scss
// In BrowseLayout.vue <style>
.filter-bar-overlay {
  position: absolute;
  top: 12px;
  left: calc(80px + 16px); // clears the posts sidebar width
  right: 16px;
  z-index: 1030;
  pointer-events: none;
  > * { pointer-events: auto; }
}
```

```html
<!-- In BrowseLayout.vue template -->
<main class="position-relative">
  <div class="filter-bar-overlay">
    <slot name="filter-bar" />
  </div>
  <slot name="results" />
</main>
```

- [ ] **Step 5: Smoke test floating pill in browser**

The pill should float above the map top-centre (right of sidebar). Opening the dropdown should show location + tags in area.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/browse/components/BrowseFilterBar.vue \
        apps/frontend/src/features/browse/components/__tests__/BrowseFilterBar.test.ts \
        apps/frontend/src/features/shared/components/BrowseLayout.vue
git commit -m "feat(browse): redesign BrowseFilterBar as unified floating filter pill"
```

---

### Task 7: Retire `/posts` route, add redirect

**Files:**
- Modify: `apps/frontend/src/router/index.ts`

- [ ] **Step 1: Replace the `/posts` route with a redirect**

Find the `/posts` route registration in `router/index.ts` and replace with:

```ts
{
  path: '/posts',
  redirect: '/browse',
},
```

Keep `BrowsePostsView` imported until Plan 3 confirms all post functionality is covered, then the import can be removed.

- [ ] **Step 2: Run full test suite**

```bash
pnpm --filter frontend test
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/router/index.ts
git commit -m "feat(router): redirect /posts to /browse"
```

---

## Verification

```bash
pnpm --filter frontend test    # all passing
pnpm type-check                # no errors
pnpm lint                      # no warnings
```

Open `https://localhost:5173/browse`:
- Profile avatar markers visible on map
- Post-it markers visible on map
- Floating pill visible top of map
- Tag dropdown opens, shows tags from current bounds
- Selecting a tag filters profile markers
- Navigating to `/posts` redirects to `/browse`

# Full-size Map with Floating Controls — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** In both `BrowseProfiles` and `Posts`, make `OsmPoiMap` fill the entire `.list-view` when in map mode, with toolbar/filter controls floating on top.

**Architecture:** Extract `OsmPoiMap` to be a direct child of `.list-view` with `position: absolute; inset: 0`. Wrap toolbar/filter controls in a `.controls-overlay` div that switches from normal flow to `position: absolute; top: 0` when `.map-mode` class is present. Add `isMapMode` computed in BrowseProfiles; for Posts consolidate the 4 per-tab map instances into one shared map using the existing `currentTabPosts` computed.

**Tech Stack:** Vue 3 SFC, SCSS (Bootstrap 5 mixins), `@vue/test-utils` + Vitest

---

### Task 1: BrowseProfiles — add failing tests

**Files:**
- Modify: `apps/frontend/src/features/browse/views/__tests__/BrowseProfilesView.spec.ts`

**Step 1: Add two new tests at the end of the `describe('BrowseProfiles view')` block (before the closing `}`).**

Find the line:
```typescript
  // OsmPoiMap Tests
  describe('OsmPoiMap Component', () => {
```

Insert above it:

```typescript
  describe('map mode layout', () => {
    it('adds map-mode class to list-view when in map mode with results', () => {
      vmState.viewModeModel.value = 'map'
      vmState.isInitialized.value = true
      vmState.haveResults.value = true
      const wrapper = mount(BrowseProfiles, {
        global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton, BContainer, BSpinner } },
      })
      expect(wrapper.find('.list-view').classes()).toContain('map-mode')
    })

    it('does not add map-mode class in grid mode', () => {
      vmState.viewModeModel.value = 'grid'
      const wrapper = mountComponent()
      expect(wrapper.find('.list-view').classes()).not.toContain('map-mode')
    })

    it('renders OsmPoiMap as direct child of list-view in map mode', () => {
      vmState.viewModeModel.value = 'map'
      vmState.isInitialized.value = true
      vmState.haveResults.value = true
      const wrapper = mount(BrowseProfiles, {
        global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton, BContainer, BSpinner } },
      })
      const listView = wrapper.find('.list-view')
      // OsmPoiMap should be a direct child with map-fullscreen class
      expect(listView.find('.map-fullscreen').exists()).toBe(true)
    })

    it('hides BPlaceholderWrapper in map mode', () => {
      vmState.viewModeModel.value = 'map'
      vmState.isInitialized.value = true
      vmState.haveResults.value = true
      const wrapper = mount(BrowseProfiles, {
        global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton, BContainer, BSpinner } },
      })
      // grid and placeholders should not be present
      expect(wrapper.find('.profile-grid').exists()).toBe(false)
      expect(wrapper.find('.placeholders-grid').exists()).toBe(false)
    })
  })
```

**Step 2: Run the new tests to confirm they fail.**

```bash
pnpm --filter frontend vitest run -t "map mode layout"
```

Expected: FAIL — `map-mode` class not found, `.map-fullscreen` not found.

**Step 3: Commit the failing tests.**

```bash
git add apps/frontend/src/features/browse/views/__tests__/BrowseProfilesView.spec.ts
git commit -m "test(browse): add failing tests for fullsize map layout"
```

---

### Task 2: BrowseProfiles — implement template + script changes

**Files:**
- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue`

**Step 1: Add `isMapMode` computed to the `<script setup>` block.**

After this existing line:
```typescript
const isDetailView = computed(() => !!selectedProfileId.value)
```

Add:
```typescript
const isMapMode = computed(
  () => viewModeModel.value === 'map' && isInitialized.value && haveResults.value
)
```

**Step 2: Restructure the `<template>` — `.list-view` div.**

Replace the opening tag of the list-view div:
```html
    <div
      class="list-view d-flex flex-column justify-content-start"
      :class="[currentScope, { inactive: isDetailView }]"
    >
```
With:
```html
    <div
      class="list-view d-flex flex-column justify-content-start"
      :class="[currentScope, { inactive: isDetailView, 'map-mode': isMapMode }]"
    >
```

**Step 3: Wrap the controls `MiddleColumn` in `div.controls-overlay`.**

Replace:
```html
      <MiddleColumn class="my-2">
        <div class="container d-flex flex-column">
          <SecondaryNav>
```
With:
```html
      <div class="controls-overlay">
        <MiddleColumn class="my-2">
          <div class="container d-flex flex-column">
            <SecondaryNav>
```

And close it — replace:
```html
          </div>
        </div>
      </MiddleColumn>
      <BPlaceholderWrapper
```
With:
```html
          </div>
          </div>
        </MiddleColumn>
      </div>
      <BPlaceholderWrapper
```

(The indentation of the inner divs shifts by two spaces since we added one wrapper level.)

**Step 4: Add `v-if="!isMapMode"` to `BPlaceholderWrapper`.**

Replace:
```html
      <BPlaceholderWrapper :loading="isLoading">
```
With:
```html
      <BPlaceholderWrapper
        v-if="!isMapMode"
        :loading="isLoading"
      >
```

**Step 5: Remove the `OsmPoiMap` from inside the scroll container.**

Inside the `<template v-else-if="isInitialized && haveResults">` block, delete this entire element:
```html
            <OsmPoiMap
              v-if="viewModeModel === 'map'"
              :items="profileList"
              :get-location="(profile: PublicProfile) => profile.location"
              :get-title="(profile: PublicProfile) => profile.publicName"
              :popup-component="ProfileMapCard"
              class="map-view h-100"
              @item:select="(id: string | number) => handleCardClick(String(id))"
            />
```

Also remove the wrapping `MiddleColumn`'s `v-if` condition — the scroll container now only contains grid content. Change:
```html
            <MiddleColumn
              v-if="viewModeModel === 'grid'"
              class="grid-view"
            >
```
To:
```html
            <MiddleColumn class="grid-view">
```

**Step 6: Add the full-screen `OsmPoiMap` as a direct child of `.list-view`, right before `<BModal`.**

Insert before `<BModal`:
```html
      <OsmPoiMap
        v-if="isMapMode"
        :items="profileList"
        :get-location="(profile: PublicProfile) => profile.location"
        :get-title="(profile: PublicProfile) => profile.publicName"
        :popup-component="ProfileMapCard"
        class="map-fullscreen"
        @item:select="(id: string | number) => handleCardClick(String(id))"
      />
```

**Step 7: Run the browse tests to confirm they now pass.**

```bash
pnpm --filter frontend vitest run -t "map mode layout"
```

Expected: PASS

Also run the full browse spec to make sure nothing broke:
```bash
pnpm --filter frontend vitest run BrowseProfilesView
```

Expected: all existing tests PASS.

**Step 8: Commit.**

```bash
git add apps/frontend/src/features/browse/views/BrowseProfiles.vue
git commit -m "feat(browse): extract OsmPoiMap to list-view level, add isMapMode"
```

---

### Task 3: BrowseProfiles — update CSS

**Files:**
- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue` (`<style>` block)

**Step 1: Update the `<style scoped lang="scss">` block.**

Replace the entire `.list-view` rule:
```scss
.list-view {
  height: calc(100vh - $navbar-height);
}
```
With:
```scss
.list-view {
  position: relative;
  height: calc(100vh - $navbar-height);
}

.controls-overlay {
  position: relative;
  z-index: 10;
}

.map-mode .controls-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(var(--bs-body-bg-rgb), 0.85);
  backdrop-filter: blur(4px);
}

.map-fullscreen {
  position: absolute;
  inset: 0;
  z-index: 1;
}
```

Also remove the now-unused `.filter-controls` rule:
```scss
.filter-controls {
  font-size: 0.75rem;
}
```

Wait — `.filter-controls` is still used inside `.controls-overlay`. Keep it. Only remove if confirmed unused after visual testing.

**Step 2: Run tests again to make sure the CSS change didn't break anything.**

```bash
pnpm --filter frontend vitest run BrowseProfilesView
```

Expected: all PASS.

**Step 3: Commit.**

```bash
git add apps/frontend/src/features/browse/views/BrowseProfiles.vue
git commit -m "feat(browse): fullsize map CSS — controls float, map fills list-view"
```

---

### Task 4: Posts — add failing tests

**Files:**
- Create: `apps/frontend/src/features/posts/views/__tests__/PostsView.spec.ts`

**Step 1: Create the test file.**

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/features/shared/components/OsmPoiMap.vue', () => ({
  default: { template: '<div class="osm-poi-map" />', props: ['items'] },
}))
vi.mock('../components/PostList.vue', () => ({
  default: { template: '<div class="post-list" />', props: ['scope', 'isActive', 'type', 'nearbyParams', 'showFilters', 'emptyMessage'] },
}))
vi.mock('../components/PostEdit.vue', () => ({
  default: { template: '<div class="post-edit" />', props: ['post', 'isEdit'] },
}))
vi.mock('../components/PostFullView.vue', () => ({
  default: { template: '<div class="post-full-view" />', props: ['post'] },
}))
vi.mock('../components/PostMapCard.vue', () => ({
  default: { template: '<div class="post-map-card" />' },
}))
vi.mock('@/features/shared/ui/ViewModeToggler.vue', () => ({
  default: { template: '<div class="view-mode-toggler" />', props: ['modelValue'] },
}))
vi.mock('../stores/postStore', () => ({
  usePostStore: () => ({ posts: ref([]), myPosts: ref([]) }),
}))

const vmState = {
  activeTab: ref<'all' | 'nearby' | 'recent' | 'my'>('all'),
  viewMode: ref<'grid' | 'map'>('grid'),
  showCreateModal: ref(false),
  locationPermission: ref(true),
  nearbyParams: ref(null),
  isDetailView: ref(false),
  showFullView: ref(false),
  editingPost: ref(null),
  selectedPost: ref(null),
  ownerProfile: ref(null),
  initialize: vi.fn(),
  requestLocation: vi.fn(),
  handlePostListIntent: vi.fn(),
}

vi.mock('../composables/usePostsViewModel', () => ({
  usePostsViewModel: () => vmState,
}))

const BModal = { template: '<div class="b-modal"><slot /></div>', props: ['show', 'title'] }
const BButton = { template: '<button><slot /></button>' }
const BFormSelect = { template: '<select><slot /></select>', props: ['modelValue', 'size'] }
const FontAwesomeIcon = { template: '<i />', props: ['icon'] }

import PostsView from '../Posts.vue'

describe('Posts view', () => {
  beforeEach(() => {
    vmState.activeTab.value = 'all'
    vmState.viewMode.value = 'grid'
    vmState.showFullView.value = false
    vmState.editingPost.value = null
    vmState.selectedPost.value = null
    vmState.locationPermission.value = true
  })

  const mountComponent = () =>
    mount(PostsView, {
      global: { stubs: { BModal, BButton, BFormSelect, FontAwesomeIcon } },
    })

  it('renders the posts toolbar', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.posts-toolbar').exists()).toBe(true)
  })

  it('shows PostList in grid mode', () => {
    vmState.viewMode.value = 'grid'
    const wrapper = mountComponent()
    expect(wrapper.find('.post-list').exists()).toBe(true)
    expect(wrapper.find('.osm-poi-map').exists()).toBe(false)
  })

  it('shows OsmPoiMap in map mode', () => {
    vmState.viewMode.value = 'map'
    const wrapper = mountComponent()
    expect(wrapper.find('.osm-poi-map').exists()).toBe(true)
    expect(wrapper.find('.post-list').exists()).toBe(false)
  })

  describe('map mode layout', () => {
    it('adds map-mode class to list-view in map mode', () => {
      vmState.viewMode.value = 'map'
      const wrapper = mountComponent()
      expect(wrapper.find('.list-view').classes()).toContain('map-mode')
    })

    it('does not add map-mode class in grid mode', () => {
      vmState.viewMode.value = 'grid'
      const wrapper = mountComponent()
      expect(wrapper.find('.list-view').classes()).not.toContain('map-mode')
    })

    it('renders single OsmPoiMap as direct child of list-view in map mode', () => {
      vmState.viewMode.value = 'map'
      const wrapper = mountComponent()
      // There should be exactly one map instance
      expect(wrapper.findAll('.osm-poi-map').length).toBe(1)
      // And it should have the map-fullscreen class
      expect(wrapper.find('.map-fullscreen').exists()).toBe(true)
    })

    it('hides tab-content in map mode', () => {
      vmState.viewMode.value = 'map'
      const wrapper = mountComponent()
      expect(wrapper.find('.tab-content').exists()).toBe(false)
    })

    it('toolbar is present in map mode', () => {
      vmState.viewMode.value = 'map'
      const wrapper = mountComponent()
      expect(wrapper.find('.posts-toolbar').exists()).toBe(true)
    })
  })
})
```

**Step 2: Run to confirm failure.**

```bash
pnpm --filter frontend vitest run PostsView
```

Expected: FAIL — `map-mode` class not found, `.map-fullscreen` not found, multiple map instances found.

**Step 3: Commit the failing tests.**

```bash
git add apps/frontend/src/features/posts/views/__tests__/PostsView.spec.ts
git commit -m "test(posts): add failing tests for fullsize map layout"
```

---

### Task 5: Posts — implement template changes

**Files:**
- Modify: `apps/frontend/src/features/posts/views/Posts.vue`

**Step 1: Add `map-mode` class to `.list-view`.**

Replace:
```html
    <div class="list-view d-flex flex-column">
```
With:
```html
    <div class="list-view d-flex flex-column" :class="{ 'map-mode': viewMode === 'map' }">
```

**Step 2: Wrap `.posts-toolbar` in `div.controls-overlay`.**

Replace:
```html
      <!-- Unified toolbar: scope pills + type filter + view toggle -->
      <div class="posts-toolbar d-flex align-items-center gap-2 px-3 py-2 flex-shrink-0">
```
With:
```html
      <!-- Unified toolbar: scope pills + type filter + view toggle -->
      <div class="controls-overlay">
      <div class="posts-toolbar d-flex align-items-center gap-2 px-3 py-2 flex-shrink-0">
```

And close it — after the closing `</div>` of `.posts-toolbar`, add:
```html
      </div>
```

**Step 3: Add a single shared `OsmPoiMap` as a direct child of `.list-view`, right after the `controls-overlay` closing tag and before `.tab-content`.**

```html
      <!-- Full-size map — shown for all tabs when in map mode -->
      <OsmPoiMap
        v-if="viewMode === 'map'"
        :items="currentTabPosts"
        :get-location="getPostLocation"
        :get-title="getPostTitle"
        :popup-component="PostMapCard"
        class="map-fullscreen"
        @item:select="
          (id) =>
            handlePostListIntent(
              'fullview',
              currentTabPosts.find((p) => p.id === id)
            )
        "
      />
```

**Step 4: Add `v-if="viewMode !== 'map'"` to `.tab-content`.**

Replace:
```html
      <!-- Tab content -->
      <div class="tab-content flex-grow-1 overflow-hidden position-relative">
```
With:
```html
      <!-- Tab content -->
      <div v-if="viewMode !== 'map'" class="tab-content flex-grow-1 overflow-hidden position-relative">
```

**Step 5: Remove the per-tab `OsmPoiMap` instances.**

In each of the 4 scope panes (`all`, `nearby`, `recent`, `my`), delete the `<OsmPoiMap v-else-if="viewMode === 'map'" .../>` block. For example, in the `all` pane remove:

```html
          <OsmPoiMap
            v-else-if="viewMode === 'map'"
            :items="currentTabPosts"
            :get-location="getPostLocation"
            :get-title="getPostTitle"
            :popup-component="PostMapCard"
            class="map-view h-100"
            @item:select="
              (id) =>
                handlePostListIntent(
                  'fullview',
                  currentTabPosts.find((p) => p.id === id)
                )
            "
          />
```

Repeat for the `nearby`, `recent`, and `my` panes (same pattern, 4 total removals).

Also change the `PostList v-if` conditions from `v-if="viewMode === 'grid'"` to plain `v-if="true"` or just remove the `v-if` — since the entire `.tab-content` is already hidden in map mode, the `v-if="viewMode === 'grid'"` guard on `PostList` is no longer needed. Replace each:
```html
            <PostList
              v-if="viewMode === 'grid'"
              scope="all"
```
With:
```html
            <PostList
              scope="all"
```
(Do this for all 4 scopes — `all`, `nearby`, `recent`, `my`.)

**Step 6: Run tests.**

```bash
pnpm --filter frontend vitest run PostsView
```

Expected: all PASS.

**Step 7: Commit.**

```bash
git add apps/frontend/src/features/posts/views/Posts.vue
git commit -m "feat(posts): extract OsmPoiMap to list-view level, remove per-tab map instances"
```

---

### Task 6: Posts — update CSS

**Files:**
- Modify: `apps/frontend/src/features/posts/views/Posts.vue` (`<style>` block)

**Step 1: Add position: relative to `.list-view` and add new rules.**

Replace:
```scss
.list-view {
  height: calc(100vh - $navbar-height);
}
```
With:
```scss
.list-view {
  position: relative;
  height: calc(100vh - $navbar-height);
}

.controls-overlay {
  position: relative;
  z-index: 10;
}

.map-mode .controls-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(var(--bs-body-bg-rgb), 0.85);
  backdrop-filter: blur(4px);
}

.map-fullscreen {
  position: absolute;
  inset: 0;
  z-index: 1;
}
```

**Step 2: Remove the now-unused `.map-view` rule.**

Delete:
```scss
.map-view {
  min-height: 500px;
}
```

**Step 3: Run tests.**

```bash
pnpm --filter frontend vitest run PostsView
```

Expected: all PASS.

**Step 4: Commit.**

```bash
git add apps/frontend/src/features/posts/views/Posts.vue
git commit -m "feat(posts): fullsize map CSS — controls float, map fills list-view"
```

---

### Task 7: Full test suite + PR

**Step 1: Run the full frontend test suite.**

```bash
pnpm --filter frontend test
```

Expected: all PASS.

**Step 2: Push and open PR.**

```bash
git push -u origin feat/478-fullsize-map
gh pr create \
  --title "feat: blow up member map to full size (#478)" \
  --body "$(cat <<'EOF'
## Summary
- `BrowseProfiles`: `OsmPoiMap` now fills the entire `.list-view` when in map mode; filter/nav controls float on top via `.controls-overlay`
- `Posts`: same treatment; 4 per-tab `OsmPoiMap` instances consolidated into one shared instance using `currentTabPosts`
- Pure layout/CSS change — no logic or data changes

## Test plan
- [ ] Run `pnpm --filter frontend test` — all tests green
- [ ] Open Browse at `/browse`, switch to map mode → map fills viewport, filter bar floats over it
- [ ] Open Posts at `/posts`, switch to map mode → map fills viewport, toolbar floats over it
- [ ] Switch between tabs in Posts map mode → map updates to show correct tab data
- [ ] Return to grid mode in both views → normal layout restored, no regressions
- [ ] Check dark mode — backdrop is appropriately tinted

Closes #478

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

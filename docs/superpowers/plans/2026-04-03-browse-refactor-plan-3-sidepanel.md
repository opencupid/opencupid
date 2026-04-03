# Browse Refactor — Plan 3: Posts Sidebar + Browse Offcanvas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the fixed posts-in-view thumbnail sidebar (desktop only) and the browse offcanvas detail panel (profile or post detail, slides in from right on click/touch).

**Architecture:** New `PostsSidebar.vue` reads `postPois` from a shared Pinia store (or prop from `BrowseProfiles`). `BrowseOffcanvas.vue` is a shell that renders either `ProfileMapCard` or `PostMapPopup` content. `MapView` gains `flyTo` and marker-highlight event support. Only one offcanvas (browse detail or user) may be open at a time — a shared `useOffcanvasState` composable enforces this.

**Tech Stack:** Vue 3, Bootstrap offcanvas (via `useNativeOffcanvas` pattern from `BrowsePosts.vue`), Leaflet `flyTo`.

**Prerequisite:** Plan 2 (unified map view) must be complete.

**Spec reference:** `docs/superpowers/specs/2026-04-03-browse-gui-refactor-design.md` §§ 3, 4

---

## File Map

| Action | Path |
|--------|------|
| Create | `apps/frontend/src/features/browse/components/PostsSidebar.vue` |
| Create | `apps/frontend/src/features/browse/components/BrowseOffcanvas.vue` |
| Create | `apps/frontend/src/features/shared/composables/useOffcanvasState.ts` |
| Modify | `apps/frontend/src/features/shared/components/MapView.vue` — flyTo + highlight events |
| Modify | `apps/frontend/src/features/browse/views/BrowseProfiles.vue` — wire sidebar + offcanvas |

---

### Task 1: Create `useOffcanvasState` — single-open-at-a-time guard

**Files:**
- Create: `apps/frontend/src/features/shared/composables/useOffcanvasState.ts`
- Create: `apps/frontend/src/features/shared/composables/__tests__/useOffcanvasState.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/frontend/src/features/shared/composables/__tests__/useOffcanvasState.test.ts
import { describe, it, expect } from 'vitest'
import { useOffcanvasState } from '../useOffcanvasState'

describe('useOffcanvasState', () => {
  it('allows only one panel open at a time', () => {
    const state = useOffcanvasState()
    state.open('browse')
    expect(state.activePanel.value).toBe('browse')
    state.open('user')
    expect(state.activePanel.value).toBe('user')
  })

  it('closes when close() is called', () => {
    const state = useOffcanvasState()
    state.open('browse')
    state.close()
    expect(state.activePanel.value).toBeNull()
  })

  it('isOpen returns true only for the active panel', () => {
    const state = useOffcanvasState()
    state.open('user')
    expect(state.isOpen('user')).toBe(true)
    expect(state.isOpen('browse')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm --filter frontend exec vitest run src/features/shared/composables/__tests__/useOffcanvasState.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// apps/frontend/src/features/shared/composables/useOffcanvasState.ts
import { ref } from 'vue'

type PanelId = 'browse' | 'user'

const activePanel = ref<PanelId | null>(null)

export function useOffcanvasState() {
  function open(panel: PanelId) {
    activePanel.value = panel
  }

  function close() {
    activePanel.value = null
  }

  function isOpen(panel: PanelId) {
    return activePanel.value === panel
  }

  return { activePanel, open, close, isOpen }
}
```

- [ ] **Step 4: Run test**

```bash
pnpm --filter frontend exec vitest run src/features/shared/composables/__tests__/useOffcanvasState.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/shared/composables/useOffcanvasState.ts \
        apps/frontend/src/features/shared/composables/__tests__/useOffcanvasState.test.ts
git commit -m "feat(shared): add useOffcanvasState single-open guard"
```

---

### Task 2: Add `flyTo` and marker highlight events to `MapView`

**Files:**
- Modify: `apps/frontend/src/features/shared/components/MapView.vue`

- [ ] **Step 1: Read current MapView to find the Leaflet map instance reference**

```bash
grep -n "leaflet\|L\.\|mapRef\|mapInstance" apps/frontend/src/features/shared/components/MapView.vue | head -20
```

Identify how the Leaflet map instance is stored (likely a `ref` or provided via composable).

- [ ] **Step 2: Expose `flyToMarker` method and `highlightedId` prop**

Add to `MapView.vue`:

```ts
// Props addition
const props = defineProps<{
  // ... existing props ...
  highlightedPoiId?: string | number | null
}>()

// Emits addition
const emit = defineEmits<{
  // ... existing emits ...
  'poi-clicked': [poi: MapPoi]
}>()

// Exposed method — called by PostsSidebar via template ref
function flyToMarker(poi: MapPoi) {
  if (!mapInstance.value) return
  mapInstance.value.flyTo([poi.location.lat, poi.location.lon], Math.max(mapInstance.value.getZoom(), 13), {
    animate: true,
    duration: 0.6,
  })
}

defineExpose({ flyToMarker })
```

The `highlightedPoiId` prop is passed down to the marker layer: when a marker's id matches `highlightedPoiId`, add a dashed ring CSS class to that marker's icon.

- [ ] **Step 3: Write test for flyToMarker**

```ts
// In MapView test file — add:
it('flyToMarker calls leaflet flyTo on the map instance', () => {
  const flyToSpy = vi.fn()
  // mock the map instance
  const wrapper = mount(MapView, { props: { items: [], iconComponent: MockIcon } })
  wrapper.vm.mapInstance = { flyTo: flyToSpy, getZoom: () => 10 }

  wrapper.vm.flyToMarker({ id: '1', location: { lat: 47, lon: 18 }, title: 'X', type: 'post' })
  expect(flyToSpy).toHaveBeenCalledWith([47, 18], 13, expect.any(Object))
})
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter frontend test
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/shared/components/MapView.vue
git commit -m "feat(map): add flyToMarker method and highlightedPoiId prop"
```

---

### Task 3: Create `PostsSidebar.vue`

**Files:**
- Create: `apps/frontend/src/features/browse/components/PostsSidebar.vue`

Fixed ~80px left strip, single-column 64×64px thumbnail grid, visible on `d-none d-md-flex`. Post-it placeholder for imageless posts.

- [ ] **Step 1: Write the component**

```vue
<!-- apps/frontend/src/features/browse/components/PostsSidebar.vue -->
<script setup lang="ts">
import type { MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'

defineOptions({ name: 'PostsSidebar' })

const props = defineProps<{
  posts: MapPoi[]
  activeId?: string | number | null
}>()

const emit = defineEmits<{
  'select': [poi: MapPoi]
}>()
</script>

<template>
  <aside class="posts-sidebar d-none d-md-flex flex-column border-end bg-white">
    <div class="sidebar-header px-2 py-2 border-bottom">
      <span class="small fw-semibold text-muted">Posts</span>
    </div>
    <div class="sidebar-body overflow-y-auto flex-grow-1 p-1 d-flex flex-column gap-1">
      <button
        v-for="poi in posts"
        :key="poi.id"
        class="thumb-cell rounded border-0 p-0 overflow-hidden flex-shrink-0"
        :class="{ 'active': poi.id === activeId }"
        @click="emit('select', poi)"
      >
        <!-- Has image -->
        <img
          v-if="poi.image"
          :src="poi.image.variants[0]?.url"
          :alt="poi.title"
          class="w-100 h-100 object-fit-cover"
        />
        <!-- No image: post-it placeholder -->
        <div v-else class="no-image d-flex align-items-center justify-content-center h-100 bg-light">
          <PostItPlaceholder />
        </div>
      </button>
      <p v-if="posts.length === 0" class="text-muted small text-center p-2">No posts in view</p>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.posts-sidebar {
  width: 80px;
  min-width: 80px;
}

.thumb-cell {
  width: 64px;
  height: 64px;
  cursor: pointer;

  &.active {
    outline: 2px solid var(--bs-dark);
    outline-offset: -2px;
  }

  &:hover:not(.active) {
    outline: 1px solid var(--bs-gray-400);
    outline-offset: -1px;
  }
}
</style>
```

- [ ] **Step 2: Write component test**

```ts
// apps/frontend/src/features/browse/components/__tests__/PostsSidebar.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PostsSidebar from '../PostsSidebar.vue'

const posts = [
  { id: '1', title: 'Post A', location: { lat: 0, lon: 0 }, type: 'post', image: { variants: [{ url: '/img.jpg', size: 'thumb' }] } },
  { id: '2', title: 'Post B', location: { lat: 0, lon: 0 }, type: 'post', image: null },
]

describe('PostsSidebar', () => {
  it('renders one thumb per post', () => {
    const wrapper = mount(PostsSidebar, { props: { posts, activeId: null } })
    expect(wrapper.findAll('.thumb-cell')).toHaveLength(2)
  })

  it('emits select when a thumb is clicked', async () => {
    const wrapper = mount(PostsSidebar, { props: { posts, activeId: null } })
    await wrapper.findAll('.thumb-cell')[0].trigger('click')
    expect(wrapper.emitted('select')?.[0][0]).toMatchObject({ id: '1' })
  })

  it('marks the active post with active class', () => {
    const wrapper = mount(PostsSidebar, { props: { posts, activeId: '1' } })
    expect(wrapper.findAll('.thumb-cell')[0].classes()).toContain('active')
    expect(wrapper.findAll('.thumb-cell')[1].classes()).not.toContain('active')
  })

  it('shows empty state when no posts', () => {
    const wrapper = mount(PostsSidebar, { props: { posts: [], activeId: null } })
    expect(wrapper.text()).toContain('No posts in view')
  })
})
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter frontend exec vitest run src/features/browse/components/__tests__/PostsSidebar.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/browse/components/PostsSidebar.vue \
        apps/frontend/src/features/browse/components/__tests__/PostsSidebar.test.ts
git commit -m "feat(browse): add PostsSidebar thumbnail strip"
```

---

### Task 4: Create `BrowseOffcanvas.vue`

**Files:**
- Create: `apps/frontend/src/features/browse/components/BrowseOffcanvas.vue`

Shell that renders either profile detail or post detail content. Uses Bootstrap offcanvas (right placement on >md, bottom/full on sm). Wires `useOffcanvasState`.

- [ ] **Step 1: Read the existing `useNativeOffcanvas` composable**

```bash
cat apps/frontend/src/features/shared/composables/useNativeOffcanvas.ts
```

Understand the API (show/hide methods, ref, Bootstrap Offcanvas instance).

- [ ] **Step 2: Write the component**

```vue
<!-- apps/frontend/src/features/browse/components/BrowseOffcanvas.vue -->
<script setup lang="ts">
import { computed, watch } from 'vue'
import { useNativeOffcanvas } from '@/features/shared/composables/useNativeOffcanvas'
import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'
import ProfileMapCard from './ProfileMapCard.vue'
import PostMapPopup from '@/features/posts/components/PostMapPopup.vue'
import type { MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'

defineOptions({ name: 'BrowseOffcanvas' })

const props = defineProps<{
  activePoi: MapPoi | null
}>()

const emit = defineEmits<{
  close: []
  'view-profile': [profileId: string]
}>()

const { offcanvasRef, show, hide } = useNativeOffcanvas()
const offcanvasState = useOffcanvasState()

watch(
  () => props.activePoi,
  (poi) => {
    if (poi) {
      offcanvasState.open('browse')
      show()
    } else {
      hide()
    }
  }
)

watch(
  () => offcanvasState.activePanel.value,
  (panel) => {
    if (panel !== 'browse') hide()
  }
)

const contentComponent = computed(() =>
  props.activePoi?.type === 'post' ? PostMapPopup : ProfileMapCard
)
</script>

<template>
  <div
    ref="offcanvasRef"
    class="offcanvas offcanvas-end offcanvas-md-end offcanvas-sm-bottom"
    tabindex="-1"
    @hide.bs.offcanvas="emit('close')"
  >
    <div class="offcanvas-header border-bottom">
      <h6 class="offcanvas-title">{{ activePoi?.type === 'post' ? 'Post' : 'Profile' }}</h6>
      <button type="button" class="btn-close" @click="hide" />
    </div>
    <div class="offcanvas-body p-0">
      <component
        :is="contentComponent"
        v-if="activePoi"
        :poi="activePoi"
        @view-profile="emit('view-profile', $event)"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 3: Run full test suite**

```bash
pnpm --filter frontend test
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/browse/components/BrowseOffcanvas.vue
git commit -m "feat(browse): add BrowseOffcanvas shell for profile/post detail"
```

---

### Task 5: Wire sidebar + offcanvas into `BrowseProfiles.vue`

**Files:**
- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue`

- [ ] **Step 1: Add sidebar and offcanvas to the template**

Key additions to the existing unified view from Plan 2:

```vue
<script setup>
// Add:
import PostsSidebar from '../components/PostsSidebar.vue'
import BrowseOffcanvas from '../components/BrowseOffcanvas.vue'

const mapRef = ref<InstanceType<typeof MapView> | null>(null)
const activePoi = ref<MapPoi | null>(null)
const activePostId = ref<string | number | null>(null)

function onMarkerClick(poi: MapPoi) {
  activePoi.value = poi
  if (poi.type === 'post') activePostId.value = poi.id
}

function onSidebarSelect(poi: MapPoi) {
  activePostId.value = poi.id
  mapRef.value?.flyToMarker(poi)
  activePoi.value = poi
}

function onOffcanvasClose() {
  activePoi.value = null
  activePostId.value = null
}
</script>

<template>
  <!-- Three-column layout: sidebar | map+offcanvas -->
  <div class="browse-shell d-flex vh-100 overflow-hidden">
    <PostsSidebar
      :posts="filteredPostPois"
      :active-id="activePostId"
      @select="onSidebarSelect"
    />
    <div class="map-region flex-grow-1 position-relative overflow-hidden">
      <BrowseLayout>
        <template #filter-bar> ... </template>
        <template #results>
          <MapView
            ref="mapRef"
            :items="allPois"
            :icon-resolver="iconResolver"
            :highlighted-poi-id="activePostId"
            :is-loading="isLoading"
            @bounds-changed="onBoundsChanged"
            @poi-clicked="onMarkerClick"
          />
        </template>
      </BrowseLayout>
    </div>
    <BrowseOffcanvas
      :active-poi="activePoi"
      @close="onOffcanvasClose"
    />
  </div>
</template>
```

- [ ] **Step 2: Smoke test in browser**

- Sidebar visible on left (desktop)
- Clicking a post thumbnail → map flies to marker + marker gets highlight ring + offcanvas opens with post detail
- Clicking a profile marker → offcanvas opens with profile detail
- Clicking ✕ on offcanvas → closes, clears active state

- [ ] **Step 3: Run test suite**

```bash
pnpm --filter frontend test && pnpm type-check
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/browse/views/BrowseProfiles.vue
git commit -m "feat(browse): wire PostsSidebar and BrowseOffcanvas into unified view"
```

---

## Verification

```bash
pnpm --filter frontend test    # all passing
pnpm type-check                # no errors
pnpm lint                      # no warnings
```

Browser checks:
- Posts sidebar visible on desktop, hidden on mobile
- Sidebar ↔ map marker highlight sync works bidirectionally
- Post offcanvas and profile offcanvas open on click
- Opening user offcanvas (Plan 4) closes browse offcanvas and vice versa

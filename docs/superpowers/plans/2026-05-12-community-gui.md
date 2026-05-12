# Community GUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Vue surface for the `community` user-content kind (card, full-view, edit dialog, map icon + popup, dispatch arms) on top of the API plumbing already in `feat/user-content-community`.

**Architecture:** Parallel copy of the Event GUI pattern from PR #1450 — clone EventCard / EventFullView / EditEventDialog / EventMapPopup into a new `features/community/components/` directory with surgical substitutions (drop date+venue, add yearFounded year-picker, swap calendar icon for the embracing-figures SVG, drop attend + calendar-export actions). Add new routes, extend `useMyProfileRouteState`, update six dispatch sites (`ContentCard`, `BrowseProfiles`, `MapLayerControl`, `PostsOrchestrator`, `ProfilePanel`, `useDetailRouteState`).

**Tech Stack:** Vue 3 Composition API + `<script setup>`, TypeScript, Bootstrap Vue Next, Vitest + @vue/test-utils, vite-svg-loader, Pinia (`useUserContentStore` already has community CRUD actions), `vue-i18n`.

**Branch:** `feat/user-content-community-gui` (already created off `feat/user-content-community`).

**Spec:** [docs/superpowers/specs/2026-05-12-community-gui-design.md](../specs/2026-05-12-community-gui-design.md)

---

## File structure

### New files

```text
apps/frontend/src/assets/icons/interface/community.svg

apps/frontend/src/features/community/components/
  CommunityCard.vue
  CommunityFullView.vue
  EditCommunityDialog.vue
  CommunityMapPopup.vue
  communityMapIcon.ts
  communityMapIcon.scss
  __tests__/
    CommunityCard.spec.ts
    CommunityFullView.spec.ts
    EditCommunityDialog.spec.ts

docs/superpowers/specs/2026-05-12-community-gui-design.md   (already committed)

.changeset/<random-three-words>.md
```

### Modified files

| File | Change |
| --- | --- |
| `packages/shared/i18n/en.json` | +`community.*` namespace, +`posts.actions.create_community_cta_title`, +`map.layer_control.communities` |
| `apps/frontend/src/router/index.ts` | +3 routes |
| `apps/frontend/src/features/myprofile/composables/useMyProfileRouteState.ts` | +`editcommunity` subView, +`editingCommunityId` |
| `apps/frontend/src/features/shared/composables/useDetailRouteState.ts` | +`community` arm |
| `apps/frontend/src/features/shared/composables/__tests__/useDetailRouteState.spec.ts` | +parallel test case |
| `apps/frontend/src/features/userContent/components/ContentCard.vue` | +`v-else-if kind === 'community'` arm |
| `apps/frontend/src/features/posts/components/PostsOrchestrator.vue` | +3rd speed-dial pill, switch-based dispatchers, `EditCommunityDialog` arm, `editingCommunity` state |
| `apps/frontend/src/features/myprofile/components/ProfilePanel.vue` | mount-gate adds `subView === 'editcommunity'` |
| `apps/frontend/src/features/map/components/MapLayerControl.vue` | +4th checkbox |
| `apps/frontend/src/features/map/components/__tests__/MapLayerControl.spec.ts` | +community toggle case |
| `apps/frontend/src/features/browse/views/BrowseProfiles.vue` | 4-way dispatchers + detail-watcher arm + `handleCommunitySelect` |

---

## Pre-flight: verify branch and tooling

### Task 0: Confirm branch and clean working tree

**Files:** none

- [ ] **Step 1: Confirm branch**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/user-content-community-gui`

- [ ] **Step 2: Confirm tree is clean (the design doc is the only uncommitted file)**

Run: `git status --porcelain`
Expected: `?? docs/superpowers/plans/2026-05-12-community-gui.md` (and possibly the spec doc if not yet committed).

- [ ] **Step 3: Confirm community store actions are present**

Run: `grep -n "createCommunity\|fetchPublicCommunity" apps/frontend/src/features/userContent/stores/userContentStore.ts`
Expected: matches showing `createCommunity`, `updateCommunity`, `deleteCommunity`, `fetchPublicCommunity` already defined.

---

## Task 1: Add the SVG asset

**Files:**

- Create: `apps/frontend/src/assets/icons/interface/community.svg`

The icon shows two embracing figures inside a clip-path. We strip the Inkscape/Sodipodi namespace and convert the explicit `#999999`/`#666666`/`#fff` fills to `currentColor` where appropriate so the icon adapts to button-variant text colors (the map pin uses CSS `mask` and ignores fills anyway).

- [ ] **Step 1: Write the file**

Save to `apps/frontend/src/assets/icons/interface/community.svg`:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 810 1440" width="1080" height="1920">
  <defs>
    <clipPath id="communityClip">
      <path d="M 243,619.57 H 567 V 820.56997 H 243 Z m 0,0" />
    </clipPath>
  </defs>
  <g>
    <path
      fill="currentColor"
      d="M 289.498,70.998 H 308.5 l 8.003,2.003 c 9.8,3.133 17.965,7.464 24.498,13.002 -0.736,1.795 -0.233,2.46 1.501,1.996 6.73333,6.266667 11.89867,14.09933 15.496,23.498 l 3.003,11.007 v 19.994 l -5,17.001 c -3.932,8.068 -9.102,14.897 -15.503,20.497 L 336,183.5 c -0.464,1.532 0.031,2.034 1.502,1.5 9.265,3.737 17.268,8.733 23.995,14.998 9.08958,8.6213 -1.00331,-2.91679 13.506,13.506 13.995,14.665 21.332,35.998 21.998,63.998 l -2.005,4.501 -3.498,1.996 h -6 l -5.495,-4.502 -1.006,-1.995 -0.998,-18 -5,-16.002 c -5.736,-12.933 -13.902,-23.429 -24.498,-31.496 -7.531,-6.134 -16.533,-10.806 -26.998,-14 l -17.005,-3.001 h -10.999 l -16.997,3 -20,8.996 c -8.33667,5.336 -15.50433,11.836 -21.503,19.5 L 223.002,248.504 219,265.496 v 12.005 l -4.497,5.5 -8.003,0.997 -3.499,-1.996 c -2.4,-3 -3.065,-8.168 -2.005,-15.5 L 204,249.5 l 5,-14 14.003,-23.003 c 14.45724,-14.54372 -0.91232,1.04167 13.498,-12.5 7.1111,-6.68245 15.566,-11.733 25.497,-14.997 l -3.499,-5.005 -6.502,-5.5 C 246.2,168.3 241.865,160.635 239.002,151.5 l -1.997,-9.003 v -18.996 c 2.933,-15.068 9.094,-26.902 18.499,-35.503 l 2.995,-1.996 c 4.46467,-4.871333 10.133,-8.54 17.005,-11.006 z m 1.501,17.999 c -7.32933,1.338 -13.328,4.006333 -17.996,8.005 l -12.005,12.995 -5,11.006 -1.997,9.994 L 255,143 l 6.997,15.995 c 6.00667,9.336 15.674,15.33833 29.002,18.007 h 16.998 c 6.672,-1.338 12.67,-4.007 18.003,-8.006 5.33333,-3.99733 9.668,-8.99633 13.004,-14.997 l 3.994,-11 c -0.666,-3.998 -0.333,-6.334 1.006,-6.999 -0.001,-12.67067 -3.002,-22.33667 -9.002,-28.998 -5.333,-7.34 -12.005,-12.67 -20,-16.003 -6.666,-2.666667 -14.667,-3.334333 -24.003,-2.003 z"
    />
  </g>
</svg>
```

Notes: the inner detail paths from the original SVG (the two-figure embrace) are preserved at their natural scale in the file you provided — for an icon-sized rendering the outer head-and-shoulders silhouette is what reads at 1.6rem. Use the simplified path above to keep the file small. If a later visual review insists on the full embrace, replace the single `<path>` with the three-path version from the attached SVG (without the Inkscape namespace).

- [ ] **Step 2: Smoke-test the import resolves**

Run: `pnpm --filter frontend exec tsc --noEmit src/features/community/components/communityMapIcon.ts 2>&1 | head -5`
Expected: file does not exist yet — error is `Could not find a declaration file`. That's fine; we'll create the importer in Task 5. This step is just to confirm the SVG path resolves in vite-svg-loader.

A safer verification: search for the same pattern used by `IconCalendar`:

Run: `grep -n "@/assets/icons/interface/calendar.svg" apps/frontend/src/features/events/components/EventCard.vue`
Expected: line 9 match. Confirms the import convention we'll follow.

- [ ] **Step 3: No commit yet** — we'll commit everything in a single feature commit at the end. (Per CLAUDE.md "One logical change per PR.")

---

## Task 2: Add i18n keys

**Files:**

- Modify: `packages/shared/i18n/en.json`

- [ ] **Step 1: Add the `community.*` namespace**

Locate the `events` namespace in `packages/shared/i18n/en.json`. After the closing brace of `"events": { ... }` and its trailing comma, insert:

```json
  "community": {
    "actions": {
      "cancel": "Nevermind",
      "create": "Submit",
      "save": "Save community"
    },
    "labels": {
      "content": "About this community",
      "year_founded": "Founded in",
      "founded_since": "Since {year}",
      "visibility": "Show this community"
    },
    "messages": {
      "error_load": "Failed to load community"
    },
    "placeholders": {
      "content": "Describe your community…",
      "year_unknown": "Don't know / not sure"
    },
    "share": {
      "community_text": "{publicName} runs a community — check it out"
    }
  },
```

- [ ] **Step 2: Add `posts.actions.create_community_cta_title`**

Inside `"posts": { "actions": { ... } }`, after `"create_event_cta_title"`, add:

```json
      "create_community_cta_title": "Create a community",
```

- [ ] **Step 3: Add `map.layer_control.communities`**

Inside `"map": { "layer_control": { ... } }`, after `"events": "Events"`, add:

```json
        "communities": "Communities",
```

- [ ] **Step 4: Verify JSON is valid**

Run: `jq -e . packages/shared/i18n/en.json > /dev/null && echo OK`
Expected: `OK`.

- [ ] **Step 5: Verify the new keys are reachable**

Run: `jq '.community.labels.founded_since, .posts.actions.create_community_cta_title, .map.layer_control.communities' packages/shared/i18n/en.json`
Expected: three string values, none `null`.

---

## Task 3: Add router routes

**Files:**

- Modify: `apps/frontend/src/router/index.ts:88-97`

- [ ] **Step 1: Insert three new browseRoute entries**

In `apps/frontend/src/router/index.ts`, locate the block (lines 88-97):

```ts
      browseRoute('posts/:postId', 'PublicPost'),
      browseRoute('events/:eventId', 'PublicEvent'),

      // My profile area (drives drawer → ProfilePanel sub-views)
      browseRoute('me', 'Me'),
      browseRoute('me/posts', 'MePosts'),
      browseRoute('me/posts/new', 'MeCreatePost'),
      browseRoute('me/posts/:postId/edit', 'MeEditPost'),
      browseRoute('me/events/new', 'MeCreateEvent'),
      browseRoute('me/events/:eventId/edit', 'MeEditEvent'),
```

Edit to:

```ts
      browseRoute('posts/:postId', 'PublicPost'),
      browseRoute('events/:eventId', 'PublicEvent'),
      browseRoute('communities/:communityId', 'PublicCommunity'),

      // My profile area (drives drawer → ProfilePanel sub-views)
      browseRoute('me', 'Me'),
      browseRoute('me/posts', 'MePosts'),
      browseRoute('me/posts/new', 'MeCreatePost'),
      browseRoute('me/posts/:postId/edit', 'MeEditPost'),
      browseRoute('me/events/new', 'MeCreateEvent'),
      browseRoute('me/events/:eventId/edit', 'MeEditEvent'),
      browseRoute('me/communities/new', 'MeCreateCommunity'),
      browseRoute('me/communities/:communityId/edit', 'MeEditCommunity'),
```

- [ ] **Step 2: Type-check the router**

Run: `pnpm --filter frontend exec vue-tsc --noEmit -p apps/frontend/tsconfig.json 2>&1 | grep "router/index.ts" | head -5`
Expected: no errors mentioning `router/index.ts`.

---

## Task 4: Extend `useMyProfileRouteState`

**Files:**

- Modify: `apps/frontend/src/features/myprofile/composables/useMyProfileRouteState.ts`

- [ ] **Step 1: Write the failing test (route → subView)**

Open `apps/frontend/src/features/myprofile/composables/__tests__/` and check for an existing spec:

Run: `ls apps/frontend/src/features/myprofile/composables/__tests__/ 2>/dev/null`

If `useMyProfileRouteState.spec.ts` doesn't exist, create it; otherwise append to it. Add this test:

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
}))

import { useRoute } from 'vue-router'
import { useMyProfileRouteState } from '../useMyProfileRouteState'

describe('useMyProfileRouteState — community', () => {
  it('maps MeCreateCommunity to subView "editcommunity"', () => {
    ;(useRoute as ReturnType<typeof vi.fn>).mockReturnValue({ name: 'MeCreateCommunity', params: {} })
    const { subView, isActive } = useMyProfileRouteState()
    expect(subView.value).toBe('editcommunity')
    expect(isActive.value).toBe(true)
  })

  it('maps MeEditCommunity to subView "editcommunity" and exposes editingCommunityId', () => {
    ;(useRoute as ReturnType<typeof vi.fn>).mockReturnValue({
      name: 'MeEditCommunity',
      params: { communityId: 'c-123' },
    })
    const { subView, editingCommunityId } = useMyProfileRouteState()
    expect(subView.value).toBe('editcommunity')
    expect(editingCommunityId.value).toBe('c-123')
  })
})
```

- [ ] **Step 2: Run the test — expect failure**

Run: `pnpm --filter frontend exec vitest run useMyProfileRouteState 2>&1 | tail -20`
Expected: failure either because `subView` returns `'myprofile'` (default fall-through) or because `editingCommunityId` is undefined.

- [ ] **Step 3: Modify the composable**

In `apps/frontend/src/features/myprofile/composables/useMyProfileRouteState.ts`, replace the entire file contents:

```ts
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export type ProfileSubView =
  | 'myprofile'
  | 'myposts'
  | 'editpost'
  | 'editevent'
  | 'editcommunity'
  | 'settings'
  | 'datingprefs'
  | 'datingwizard'

const MY_PROFILE_ROUTES = new Set([
  'Me',
  'MePosts',
  'MeCreatePost',
  'MeEditPost',
  'MeCreateEvent',
  'MeEditEvent',
  'MeCreateCommunity',
  'MeEditCommunity',
  'MeSettings',
  'MeDating',
  'MeDatingWizard',
])

export function useMyProfileRouteState() {
  const route = useRoute()

  const isActive = computed(() => MY_PROFILE_ROUTES.has(route.name as string))

  const subView = computed((): ProfileSubView => {
    switch (route.name) {
      case 'MePosts':
        return 'myposts'
      case 'MeCreatePost':
      case 'MeEditPost':
        return 'editpost'
      case 'MeCreateEvent':
      case 'MeEditEvent':
        return 'editevent'
      case 'MeCreateCommunity':
      case 'MeEditCommunity':
        return 'editcommunity'
      case 'MeSettings':
        return 'settings'
      case 'MeDating':
        return 'datingprefs'
      case 'MeDatingWizard':
        return 'datingwizard'
      default:
        return 'myprofile'
    }
  })

  const editingPostId = computed(() =>
    route.name === 'MeEditPost' ? (route.params.postId as string) : undefined
  )

  const editingEventId = computed(() =>
    route.name === 'MeEditEvent' ? (route.params.eventId as string) : undefined
  )

  const editingCommunityId = computed(() =>
    route.name === 'MeEditCommunity' ? (route.params.communityId as string) : undefined
  )

  return { isActive, subView, editingPostId, editingEventId, editingCommunityId }
}
```

- [ ] **Step 4: Run the test — expect pass**

Run: `pnpm --filter frontend exec vitest run useMyProfileRouteState 2>&1 | tail -10`
Expected: PASS.

---

## Task 5: Extend `useDetailRouteState`

**Files:**

- Modify: `apps/frontend/src/features/shared/composables/useDetailRouteState.ts`
- Modify: `apps/frontend/src/features/shared/composables/__tests__/useDetailRouteState.spec.ts`

- [ ] **Step 1: Add the failing test**

Open `apps/frontend/src/features/shared/composables/__tests__/useDetailRouteState.spec.ts`. Inside the existing `describe(...)` block, add:

```ts
  it('returns community type for PublicCommunity route', () => {
    ;(useRoute as ReturnType<typeof vi.fn>).mockReturnValue({
      name: 'PublicCommunity',
      params: { communityId: 'c-abc' },
    })
    const { detail } = useDetailRouteState()
    expect(detail.value).toEqual({ type: 'community', id: 'c-abc' })
  })
```

(If the existing spec uses `mockReturnValue` differently, mirror its pattern. Run `cat apps/frontend/src/features/shared/composables/__tests__/useDetailRouteState.spec.ts` first to match style.)

- [ ] **Step 2: Run the test — expect failure**

Run: `pnpm --filter frontend exec vitest run useDetailRouteState 2>&1 | tail -10`
Expected: FAIL — `detail.value` is `null` for the unhandled `PublicCommunity` route.

- [ ] **Step 3: Add the community arm**

Edit `apps/frontend/src/features/shared/composables/useDetailRouteState.ts` to:

```ts
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function useDetailRouteState() {
  const route = useRoute()

  const detail = computed(() => {
    if (route.name === 'PublicProfile')
      return { type: 'profile' as const, id: route.params.profileId as string }
    if (route.name === 'PublicPost')
      return { type: 'post' as const, id: route.params.postId as string }
    if (route.name === 'PublicEvent')
      return { type: 'event' as const, id: route.params.eventId as string }
    if (route.name === 'PublicCommunity')
      return { type: 'community' as const, id: route.params.communityId as string }
    return null
  })

  return { detail }
}
```

- [ ] **Step 4: Run the test — expect pass**

Run: `pnpm --filter frontend exec vitest run useDetailRouteState 2>&1 | tail -10`
Expected: PASS.

---

## Task 6: Add the map icon files

**Files:**

- Create: `apps/frontend/src/features/community/components/communityMapIcon.ts`
- Create: `apps/frontend/src/features/community/components/communityMapIcon.scss`

- [ ] **Step 1: Write `communityMapIcon.ts`**

```ts
import type { IconRenderer } from '@/features/map/types/map.types'
import './communityMapIcon.scss'

export const renderCommunityMapIconHtml: IconRenderer = () => '<div class="map-community"></div>'
```

- [ ] **Step 2: Write `communityMapIcon.scss`**

```scss
.map-community {
  width: 1.6rem;
  height: 1.6rem;
  background: var(--bs-primary, #0d6efd);
  border-radius: 50%;
  box-shadow: 1px 2px 5px rgba(0, 0, 0, 0.3);
  mask: url('@/assets/icons/interface/community.svg') no-repeat center / 75%;
  -webkit-mask: url('@/assets/icons/interface/community.svg') no-repeat center / 75%;
}
```

- [ ] **Step 3: Verify the imports resolve**

Run: `pnpm --filter frontend exec vue-tsc --noEmit 2>&1 | grep "communityMapIcon" | head`
Expected: no errors (the file may be unused at this point, but typing should succeed).

---

## Task 7: Create `CommunityCard.vue` (failing test first)

**Files:**

- Create: `apps/frontend/src/features/community/components/__tests__/CommunityCard.spec.ts`
- Create: `apps/frontend/src/features/community/components/CommunityCard.vue`

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/features/community/components/__tests__/CommunityCard.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), locale: { value: 'en' } }),
}))

vi.mock('@/assets/icons/interface/community.svg', () => ({
  default: { template: '<span class="icon-community" />' },
}))

vi.mock('@/features/images/components/ProfileThumbnail.vue', () => ({
  default: { template: '<div class="thumb" />' },
}))
vi.mock('@/features/posts/components/OwnerToolbar.vue', () => ({
  default: { template: '<div class="owner-toolbar" />' },
}))
vi.mock('@/features/userContent/components/ViewerToolbar.vue', () => ({
  default: { template: '<div class="viewer-toolbar"><slot /></div>' },
}))
vi.mock('@/features/shared/profiledisplay/LocationLabel.vue', () => ({
  default: { template: '<div class="location-label" />' },
}))

import CommunityCard from '../CommunityCard.vue'

const baseCommunity = {
  id: 'c-1',
  kind: 'community' as const,
  content: 'A welcoming community for hikers',
  yearFounded: 1987,
  location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
  postedBy: { id: 'p-1', publicName: 'Alice', profileImages: [] },
  isOwn: false,
}

const stubs = {
  BRow: { template: '<div><slot /></div>' },
  BCol: { template: '<div><slot /></div>' },
  BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
}

describe('CommunityCard', () => {
  it('renders content text', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    expect(wrapper.text()).toContain('A welcoming community for hikers')
  })

  it('renders "Since {year}" when yearFounded is set', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    expect(wrapper.text()).toContain('community.labels.founded_since')
    expect(wrapper.text()).toContain('1987')
  })

  it('omits the founded line when yearFounded is null', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: { ...baseCommunity, yearFounded: null }, showDetails: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    expect(wrapper.text()).not.toContain('community.labels.founded_since')
  })

  it('emits click with the community', async () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: false },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    await wrapper.find('.community-card').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')![0][0]).toMatchObject({ id: 'c-1' })
  })

  it('renders OwnerToolbar when isOwn is true', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: { ...baseCommunity, isOwn: true, isVisible: true }, showDetails: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    expect(wrapper.find('.owner-toolbar').exists()).toBe(true)
  })

  it('renders viewer profile thumbnail when not isOwn', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    expect(wrapper.find('.thumb').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test — expect failure**

Run: `pnpm --filter frontend exec vitest run CommunityCard 2>&1 | tail -10`
Expected: FAIL — module `'../CommunityCard.vue'` not found.

- [ ] **Step 3: Write `CommunityCard.vue`**

Create `apps/frontend/src/features/community/components/CommunityCard.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicCommunity, OwnerCommunity } from '@zod/community/community.dto'
import OwnerToolbar from '@/features/posts/components/OwnerToolbar.vue'
import ViewerToolbar from '@/features/userContent/components/ViewerToolbar.vue'
import type { SharePayload } from '@/features/app/components/ShareSheet.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import IconCommunity from '@/assets/icons/interface/community.svg'

const props = defineProps<{
  community: PublicCommunity | OwnerCommunity
  showDetails: boolean
}>()

defineEmits<{
  (e: 'click', community: PublicCommunity | OwnerCommunity): void
  (e: 'edit', community: PublicCommunity | OwnerCommunity): void
  (e: 'hide', community: PublicCommunity | OwnerCommunity): void
  (e: 'delete', community: PublicCommunity | OwnerCommunity): void
}>()

const { t } = useI18n()

const shareCommunityPayload = computed<SharePayload>(() => ({
  title: props.community.content.substring(0, 80),
  text: t('community.share.community_text', { publicName: props.community.postedBy.publicName }),
  url: `${window.location.origin}/communities/${props.community.id}`,
}))

const isVisible = computed(
  () => !('isVisible' in props.community) || props.community.isVisible !== false
)
const communityLocation = computed(() => props.community.location ?? null)

const GRID_TRUNCATE_LENGTH = 100
const displayContent = computed(() => {
  const content = props.community.content
  if (props.showDetails || content.length <= GRID_TRUNCATE_LENGTH) return content
  const truncated = content.substring(0, GRID_TRUNCATE_LENGTH)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '…'
})
</script>

<template>
  <div class="community-wrapper position-relative w-100 p-2">
    <div
      class="community-card p-3 rounded border shadow-sm bg-subtle"
      :class="{ 'community-card--own': community.isOwn }"
      @click="$emit('click', community)"
    >
      <BRow class="g-2 align-items-start mb-3">
        <BCol cols="12" md="8">
          <p class="lh-sm small mb-0">{{ displayContent }}</p>
        </BCol>
        <BCol
          cols="12"
          md="4"
          class="small lh-sm text-center d-flex align-items-center flex-column"
        >
          <IconCommunity class="text-primary d-block svg-icon-lg mb-1" />
          <h6 v-if="community.yearFounded != null" class="m-0">
            {{ t('community.labels.founded_since', { year: community.yearFounded }) }}
          </h6>
          <LocationLabel v-if="communityLocation" :location="communityLocation" />
        </BCol>
      </BRow>

      <div
        class="community-meta d-flex align-items-center justify-content-between gap-2 small text-muted"
      >
        <div class="d-flex align-items-center gap-2">
          <OwnerToolbar
            v-if="community.isOwn"
            :is-visible="isVisible"
            @edit="$emit('edit', community)"
            @delete="$emit('delete', community)"
            @hide="$emit('hide', community)"
          />
          <template v-else>
            <ProfileThumbnail :profile="community.postedBy" size="sm" />
            <span>{{ community.postedBy.publicName }}</span>
          </template>
        </div>
        <ViewerToolbar
          v-if="showDetails && !community.isOwn"
          :actions="['copy', 'share']"
          :copy-text="community.content"
          :share-payload="shareCommunityPayload"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-card {
  background-color: var(--bs-body-bg);
}
</style>
```

- [ ] **Step 4: Run the test — expect pass**

Run: `pnpm --filter frontend exec vitest run CommunityCard 2>&1 | tail -10`
Expected: PASS (6 tests).

---

## Task 8: Create `CommunityFullView.vue` (failing test first)

**Files:**

- Create: `apps/frontend/src/features/community/components/__tests__/CommunityFullView.spec.ts`
- Create: `apps/frontend/src/features/community/components/CommunityFullView.vue`

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/features/community/components/__tests__/CommunityFullView.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

const replaceMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/assets/icons/interface/cross.svg', () => ({
  default: { template: '<span />' },
}))

vi.mock('@/lib/responsive', () => ({
  isMdUp: { value: true },
}))

import CommunityFullView from '../CommunityFullView.vue'

const stubs = {
  CommunityCard: {
    props: ['community'],
    template: '<div class="community-card-stub">{{ community.id }}</div>',
  },
  BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
}

const community = {
  id: 'c-1',
  kind: 'community' as const,
  content: 'Test',
  yearFounded: null,
  location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
  postedBy: { id: 'p-1', publicName: 'Alice', profileImages: [] },
}

describe('CommunityFullView', () => {
  it('renders the community card', () => {
    const wrapper = mount(CommunityFullView, {
      props: { community },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    expect(wrapper.find('.community-card-stub').text()).toBe('c-1')
  })

  it('navigates back to Browse when no detailPanelClose provider', async () => {
    const wrapper = mount(CommunityFullView, {
      props: { community },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    await wrapper.find('button').trigger('click')
    expect(replaceMock).toHaveBeenCalledWith({ name: 'Browse' })
  })
})
```

- [ ] **Step 2: Run the test — expect failure**

Run: `pnpm --filter frontend exec vitest run CommunityFullView 2>&1 | tail -10`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `CommunityFullView.vue`**

Create `apps/frontend/src/features/community/components/CommunityFullView.vue`:

```vue
<script setup lang="ts">
import { inject } from 'vue'
import type { PublicCommunityDetail, OwnerCommunity } from '@zod/community/community.dto'

import CommunityCard from './CommunityCard.vue'
import IconCross from '@/assets/icons/interface/cross.svg'

import { useRouter } from 'vue-router'
import { isMdUp } from '@/lib/responsive'

const router = useRouter()

defineProps<{
  community: PublicCommunityDetail | OwnerCommunity
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', community: PublicCommunityDetail | OwnerCommunity): void
  (e: 'hide', community: PublicCommunityDetail | OwnerCommunity): void
  (e: 'delete', community: PublicCommunityDetail | OwnerCommunity): void
}>()

const closeDetailPanel = inject<(() => void) | null>('detailPanelClose', null)
const handleBack = () => {
  if (closeDetailPanel) closeDetailPanel()
  else router.replace({ name: 'Browse' })
}
</script>

<template>
  <div class="w-100">
    <div class="d-flex justify-content-end align-items-center w-100" v-if="isMdUp">
      <BButton
        variant="link-secondary"
        :title="$t('profiles.back_button_title')"
        :aria-label="$t('profiles.back_button_title')"
        @click="handleBack"
      >
        <IconCross class="svg-icon" />
      </BButton>
    </div>
    <CommunityCard
      :community="community"
      :show-details="true"
      class="pt-2 pt-md-3 pt-lg-5"
      @edit="emit('edit', community)"
      @hide="emit('hide', community)"
      @delete="emit('delete', community)"
    />
  </div>
</template>
```

- [ ] **Step 4: Run the test — expect pass**

Run: `pnpm --filter frontend exec vitest run CommunityFullView 2>&1 | tail -10`
Expected: PASS (2 tests).

---

## Task 9: Create `EditCommunityDialog.vue` (failing test first)

**Files:**

- Create: `apps/frontend/src/features/community/components/__tests__/EditCommunityDialog.spec.ts`
- Create: `apps/frontend/src/features/community/components/EditCommunityDialog.vue`

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/features/community/components/__tests__/EditCommunityDialog.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: { value: 'en' } }),
}))

vi.mock('@/features/shared/profileform/LocationSelector.vue', () => ({
  default: { template: '<div class="loc-selector" />' },
}))

const createCommunityMock = vi.fn().mockResolvedValue({
  success: true,
  data: { community: { id: 'c-new', kind: 'community', content: 'X', yearFounded: 2020 } },
})
const updateCommunityMock = vi.fn().mockResolvedValue({
  success: true,
  data: { community: { id: 'c-existing', kind: 'community', content: 'X', yearFounded: 2010 } },
})

vi.mock('@/features/userContent/stores/userContentStore', () => ({
  useUserContentStore: () => ({
    createCommunity: createCommunityMock,
    updateCommunity: updateCommunityMock,
  }),
}))

import EditCommunityDialog from '../EditCommunityDialog.vue'

const stubs = {
  BForm: { template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>' },
  BFormGroup: { template: '<div><slot /></div>' },
  BFormTextarea: {
    props: ['modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  BFormInput: {
    props: ['modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  BFormSelect: {
    props: ['modelValue', 'options'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value === \'null\' ? null : Number($event.target.value))"><option v-for="o in options" :key="o.value ?? \'null\'" :value="o.value ?? \'null\'">{{ o.text }}</option></select>',
  },
  BFormCheckbox: {
    props: ['modelValue'],
    template:
      '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
  BButton: { template: '<button type="submit" @click="$emit(\'click\')"><slot /></button>' },
}

const defaultLocation = { country: 'HU', cityName: 'Budapest', lat: null, lon: null }

describe('EditCommunityDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    createCommunityMock.mockClear()
    updateCommunityMock.mockClear()
  })

  it('disables submit when content shorter than 10 chars', async () => {
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: false, defaultLocation },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    await wrapper.find('textarea').setValue('short')
    const submitBtn = wrapper.findAll('button').at(-1)!
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('calls createCommunity in create-mode with null yearFounded when "Don\'t know" selected', async () => {
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: false, defaultLocation },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    await wrapper.find('textarea').setValue('This is a long-enough description.')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(createCommunityMock).toHaveBeenCalledTimes(1)
    expect(createCommunityMock.mock.calls[0][0]).toMatchObject({
      content: 'This is a long-enough description.',
      yearFounded: null,
    })
  })

  it('pre-populates from props.community in edit mode', () => {
    const community = {
      id: 'c-existing',
      kind: 'community',
      content: 'Existing community description longer than 10',
      yearFounded: 2015,
      isVisible: false,
      location: defaultLocation,
      postedBy: { id: 'p', publicName: 'Alice' },
    }
    const wrapper = mount(EditCommunityDialog, {
      props: { isEdit: true, community: community as any, defaultLocation },
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
      'Existing community description longer than 10'
    )
  })
})
```

- [ ] **Step 2: Run the test — expect failure**

Run: `pnpm --filter frontend exec vitest run EditCommunityDialog 2>&1 | tail -10`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `EditCommunityDialog.vue`**

Create `apps/frontend/src/features/community/components/EditCommunityDialog.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'
import { z } from 'zod'
import type { OwnerCommunity } from '@zod/community/community.dto'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'

import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'

const COMMUNITY_CONTENT_MAX_LENGTH = 300

const CommunityFormSchema = z.object({
  content: z.string().default(''),
  isVisible: z.boolean().default(true),
  yearFounded: z.number().int().nullable().default(null),
  location: LocationSchema,
})
type CommunityForm = z.infer<typeof CommunityFormSchema>

interface Emits {
  (e: 'cancel'): void
  (e: 'saved', community: OwnerCommunity): void
}

interface Props {
  community?: OwnerCommunity
  isEdit: boolean
  defaultLocation: LocationDTO
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const contentStore = useUserContentStore()

const community = props.community

const form = ref<CommunityForm>(
  CommunityFormSchema.parse({
    content: community?.content ?? '',
    isVisible: community?.isVisible ?? true,
    yearFounded: community?.yearFounded ?? null,
    location: community?.location ?? props.defaultLocation,
  })
)

const isLoading = ref(false)

const YEAR_PICKER_WINDOW = 15
const currentYear = new Date().getUTCFullYear()
const yearOptions = computed(() => [
  { value: null, text: t('community.placeholders.year_unknown') },
  ...Array.from({ length: YEAR_PICKER_WINDOW }, (_, i) => {
    const y = currentYear - i
    return { value: y, text: String(y) }
  }),
])

const isFormValid = computed(() => {
  return (
    form.value.content.trim().length > 10 &&
    form.value.content.length <= COMMUNITY_CONTENT_MAX_LENGTH
  )
})

const handleSubmit = async () => {
  if (!isFormValid.value) return

  isLoading.value = true

  try {
    const { content, isVisible, yearFounded, location } = form.value
    const result =
      props.isEdit && community
        ? await contentStore.updateCommunity(community.id, {
            content,
            isVisible,
            yearFounded,
            ...location,
          })
        : await contentStore.createCommunity({
            content,
            yearFounded,
            ...location,
          })

    if (result.success && result.data) {
      emit('saved', result.data.community)
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <BForm
    @submit.prevent="handleSubmit"
    class="w-100 p-2 p-md-4 p-lg-5 mt-2 scrollable hide-scrollbar"
  >
    <BFormGroup
      :label="$t('community.labels.content')"
      label-for="community-content"
      class="mb-2 mb-lg-3 position-relative"
    >
      <BFormTextarea
        id="community-content"
        v-model="form.content"
        :placeholder="$t('community.placeholders.content')"
        :maxlength="COMMUNITY_CONTENT_MAX_LENGTH"
        required
        rows="6"
      />
      <div class="form-hint text-muted small position-absolute bottom-0 start-50 translate-middle-x">
        {{ form.content.length }}/{{ COMMUNITY_CONTENT_MAX_LENGTH }}
      </div>
    </BFormGroup>

    <BFormGroup class="mb-3">
      <LocationSelector
        v-model="form.location"
        open-direction="top"
        :allow-empty="true"
        :close-on-select="true"
      />
    </BFormGroup>

    <BFormGroup
      :label="$t('community.labels.year_founded')"
      label-for="community-year-founded"
      class="mb-3"
    >
      <BFormSelect
        id="community-year-founded"
        v-model="form.yearFounded"
        :options="yearOptions"
      />
    </BFormGroup>

    <BFormGroup
      v-if="isEdit"
      class="d-flex align-items-center mb-3"
    >
      <BFormCheckbox v-model="form.isVisible">
        {{ $t('community.labels.visibility') }}
      </BFormCheckbox>
    </BFormGroup>

    <div class="d-flex justify-content-end mt-3">
      <BButton
        type="button"
        @click="$emit('cancel')"
        variant="link-secondary"
        class="me-2"
        :disabled="isLoading"
      >
        {{ $t('community.actions.cancel') }}
      </BButton>
      <BButton
        type="submit"
        variant="success"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading">{{ $t('uicomponents.submitbutton.working') }}</span>
        <span v-else-if="isEdit">{{ $t('community.actions.save') }}</span>
        <span v-else>{{ $t('community.actions.create') }}</span>
      </BButton>
    </div>
  </BForm>
</template>
```

- [ ] **Step 4: Run the test — expect pass**

Run: `pnpm --filter frontend exec vitest run EditCommunityDialog 2>&1 | tail -10`
Expected: PASS (3 tests).

---

## Task 10: Create `CommunityMapPopup.vue`

**Files:**

- Create: `apps/frontend/src/features/community/components/CommunityMapPopup.vue`

No dedicated spec — exercised via BrowseProfiles integration test in Task 16.

- [ ] **Step 1: Write the component**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PublicCommunityDetail } from '@zod/community/community.dto'
import IconCommunity from '@/assets/icons/interface/community.svg'

const props = defineProps<{ item: PublicCommunityDetail }>()
defineEmits<{ (e: 'click', id: string): void }>()

const { t } = useI18n()
</script>

<template>
  <div
    class="community-map-popup cursor-pointer p-3 user-select-none"
    @click="$emit('click', item.id)"
  >
    <div class="community-map-popup__icon mb-2 text-primary">
      <IconCommunity class="svg-icon" />
      <span
        v-if="item.yearFounded != null"
        class="small fw-semibold ms-2"
      >
        {{ t('community.labels.founded_since', { year: item.yearFounded }) }}
      </span>
    </div>
    <div class="community-map-popup__content">
      {{ (item.content ?? '').substring(0, 120) }}
    </div>
  </div>
</template>

<style scoped>
.community-map-popup {
  background: var(--bs-body-bg, #fff);
  font-size: 0.85rem;
  word-break: break-word;
  border-left: 3px solid var(--bs-primary, #0d6efd);
}
</style>
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter frontend exec vue-tsc --noEmit 2>&1 | grep "CommunityMapPopup" | head`
Expected: no errors.

---

## Task 11: Add the `ContentCard` dispatch arm

**Files:**

- Modify: `apps/frontend/src/features/userContent/components/ContentCard.vue`

This is the smallest critical change — without it, community items render as nothing in `MyContentList`.

- [ ] **Step 1: Edit `ContentCard.vue`**

Replace the entire file contents with:

```vue
<script setup lang="ts">
import PostCard from '@/features/posts/components/PostCard.vue'
import EventCard from '@/features/events/components/EventCard.vue'
import CommunityCard from '@/features/community/components/CommunityCard.vue'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'

defineProps<{
  item: OwnerUserContent
  showDetails: boolean
}>()

defineEmits<{
  (e: 'click', item: OwnerUserContent): void
  (e: 'edit', item: OwnerUserContent): void
  (e: 'hide', item: OwnerUserContent): void
  (e: 'delete', item: OwnerUserContent): void
}>()
</script>

<template>
  <PostCard
    v-if="item.kind === 'post'"
    :post="item"
    :show-details="showDetails"
    @click="$emit('click', item)"
    @edit="$emit('edit', item)"
    @hide="$emit('hide', item)"
    @delete="$emit('delete', item)"
  />
  <EventCard
    v-else-if="item.kind === 'event'"
    :event="item"
    :show-details="showDetails"
    @click="$emit('click', item)"
    @edit="$emit('edit', item)"
    @hide="$emit('hide', item)"
    @delete="$emit('delete', item)"
  />
  <CommunityCard
    v-else-if="item.kind === 'community'"
    :community="item"
    :show-details="showDetails"
    @click="$emit('click', item)"
    @edit="$emit('edit', item)"
    @hide="$emit('hide', item)"
    @delete="$emit('delete', item)"
  />
</template>
```

- [ ] **Step 2: Type-check the file (the discriminated union now is total)**

Run: `pnpm --filter frontend exec vue-tsc --noEmit 2>&1 | grep "ContentCard.vue" | head`
Expected: no errors.

---

## Task 12: Wire up `PostsOrchestrator.vue`

**Files:**

- Modify: `apps/frontend/src/features/posts/components/PostsOrchestrator.vue`

- [ ] **Step 1: Replace the file with the community-aware version**

Replace the entire contents of `apps/frontend/src/features/posts/components/PostsOrchestrator.vue` with:

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMyProfileRouteState } from '@/features/myprofile/composables/useMyProfileRouteState'
import { useMyProfileViewModel } from '@/features/myprofile/composables/useMyProfileViewModel'
import { LocationSchema } from '@zod/dto/location.dto'
import type { OwnerPost } from '@zod/post/post.dto'
import type { OwnerEvent } from '@zod/event/event.dto'
import type { OwnerCommunity } from '@zod/community/community.dto'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'
import FloatingButton from '@/features/shared/components/FloatingButton.vue'
import MyContentList from '@/features/userContent/components/MyContentList.vue'
import EditPostDialog from './EditPostDialog.vue'
import EditEventDialog from '@/features/events/components/EditEventDialog.vue'
import EditCommunityDialog from '@/features/community/components/EditCommunityDialog.vue'
import IconCommunity from '@/assets/icons/interface/community.svg'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPenToSquare, faCalendarPlus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from 'vue-i18n'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'

const { t } = useI18n()

defineOptions({ name: 'PostsOrchestrator' })

const router = useRouter()
const { subView, editingPostId, editingEventId, editingCommunityId } = useMyProfileRouteState()
const { formData } = useMyProfileViewModel(false)

const editingPost = ref<OwnerPost | undefined>()
const editingEvent = ref<OwnerEvent | undefined>()
const editingCommunity = ref<OwnerCommunity | undefined>()
const defaultLocation = computed(() => LocationSchema.parse(formData?.location ?? {}))

const contentStore = useUserContentStore()

watch(
  editingPostId,
  (postId) => {
    if (postId && !editingPost.value) {
      router.replace({ name: 'MePosts' })
    }
    if (!postId) {
      editingPost.value = undefined
    }
  },
  { immediate: true }
)

watch(
  editingEventId,
  (eventId) => {
    if (eventId && !editingEvent.value) {
      router.replace({ name: 'MePosts' })
    }
    if (!eventId) {
      editingEvent.value = undefined
    }
  },
  { immediate: true }
)

watch(
  editingCommunityId,
  (communityId) => {
    if (communityId && !editingCommunity.value) {
      router.replace({ name: 'MePosts' })
    }
    if (!communityId) {
      editingCommunity.value = undefined
    }
  },
  { immediate: true }
)

function openCreatePost() {
  editingPost.value = undefined
  router.push({ name: 'MeCreatePost' })
}

function openCreateEvent() {
  editingEvent.value = undefined
  router.push({ name: 'MeCreateEvent' })
}

function openCreateCommunity() {
  editingCommunity.value = undefined
  router.push({ name: 'MeCreateCommunity' })
}

function handleEdit(item: OwnerUserContent) {
  switch (item.kind) {
    case 'post':
      editingPost.value = item
      router.push({ name: 'MeEditPost', params: { postId: item.id } })
      break
    case 'event':
      editingEvent.value = item
      router.push({ name: 'MeEditEvent', params: { eventId: item.id } })
      break
    case 'community':
      editingCommunity.value = item
      router.push({ name: 'MeEditCommunity', params: { communityId: item.id } })
      break
  }
}

async function handleDelete(item: OwnerUserContent) {
  if (!confirm(t('posts.messages.confirm_delete'))) return
  switch (item.kind) {
    case 'post':
      await contentStore.deletePost(item.id)
      break
    case 'event':
      await contentStore.deleteEvent(item.id)
      break
    case 'community':
      await contentStore.deleteCommunity(item.id)
      break
  }
}

async function handleHide(item: OwnerUserContent) {
  const isVisible = item.isVisible !== false
  switch (item.kind) {
    case 'post':
      if (isVisible) await contentStore.hidePost(item.id)
      else await contentStore.showPost(item.id)
      break
    case 'event':
      await contentStore.updateEvent(item.id, { isVisible: !isVisible })
      break
    case 'community':
      await contentStore.updateCommunity(item.id, { isVisible: !isVisible })
      break
  }
}
</script>

<template>
  <template v-if="subView === 'myposts'">
    <MyContentList
      @intent:edit="handleEdit"
      @intent:delete="handleDelete"
      @intent:hide="handleHide"
    />

    <FloatingButton speed-dial>
      <BButton
        size="lg"
        class="btn-icon-lg btn-shadow "
        variant="primary"
        :title="$t('posts.actions.create_cta_title')"
      >
        <FontAwesomeIcon :icon="faPlus" />
      </BButton>
      <template #actions>
        <BButton
          size="lg"
          class="btn-icon-lg btn-shadow btn btn-light rounded-circle"
          variant="outline-primary"
          :title="$t('posts.actions.create_advert_cta_title')"
          @click="openCreatePost"
        >
          <FontAwesomeIcon :icon="faPenToSquare" />
        </BButton>
        <BButton
          size="lg"
          class="btn-icon-lg btn-shadow btn btn-light rounded-circle"
          variant="outline-primary"
          :title="$t('posts.actions.create_event_cta_title')"
          @click="openCreateEvent"
        >
          <FontAwesomeIcon :icon="faCalendarPlus" />
        </BButton>
        <BButton
          size="lg"
          class="btn-icon-lg btn-shadow btn btn-light rounded-circle"
          variant="outline-primary"
          :title="$t('posts.actions.create_community_cta_title')"
          @click="openCreateCommunity"
        >
          <IconCommunity class="svg-icon" />
        </BButton>
      </template>
    </FloatingButton>
  </template>
  <EditPostDialog
    v-else-if="subView === 'editpost'"
    :post="editingPost"
    :is-edit="!!editingPost"
    :default-location="defaultLocation"
    @cancel="router.replace({ name: 'MePosts' })"
    @saved="router.replace({ name: 'MePosts' })"
  />
  <EditEventDialog
    v-else-if="subView === 'editevent'"
    :event="editingEvent"
    :is-edit="!!editingEvent"
    :default-location="defaultLocation"
    @cancel="router.replace({ name: 'MePosts' })"
    @saved="router.replace({ name: 'MePosts' })"
  />
  <EditCommunityDialog
    v-else-if="subView === 'editcommunity'"
    :community="editingCommunity"
    :is-edit="!!editingCommunity"
    :default-location="defaultLocation"
    @cancel="router.replace({ name: 'MePosts' })"
    @saved="router.replace({ name: 'MePosts' })"
  />
</template>
```

- [ ] **Step 2: Type-check the change**

Run: `pnpm --filter frontend exec vue-tsc --noEmit 2>&1 | grep "PostsOrchestrator" | head`
Expected: no errors.

---

## Task 13: Update `ProfilePanel.vue` mount-gate (the 4th-change trap)

**Files:**

- Modify: `apps/frontend/src/features/myprofile/components/ProfilePanel.vue` (line 133)

- [ ] **Step 1: Inspect the current line**

Run: `sed -n '130,140p' apps/frontend/src/features/myprofile/components/ProfilePanel.vue`
Expected output includes:

```text
      v-else-if="subView === 'myposts' || subView === 'editpost' || subView === 'editevent'"
```

- [ ] **Step 2: Edit the line**

In `ProfilePanel.vue` line 133, change:

```vue
      v-else-if="subView === 'myposts' || subView === 'editpost' || subView === 'editevent'"
```

to:

```vue
      v-else-if="subView === 'myposts' || subView === 'editpost' || subView === 'editevent' || subView === 'editcommunity'"
```

- [ ] **Step 3: Confirm edit landed**

Run: `grep -n "editcommunity" apps/frontend/src/features/myprofile/components/ProfilePanel.vue`
Expected: at least one line containing `editcommunity`.

---

## Task 14: Update `MapLayerControl.vue` and its test

**Files:**

- Modify: `apps/frontend/src/features/map/components/MapLayerControl.vue`
- Modify: `apps/frontend/src/features/map/components/__tests__/MapLayerControl.spec.ts`

- [ ] **Step 1: Inspect the existing test file**

Run: `cat apps/frontend/src/features/map/components/__tests__/MapLayerControl.spec.ts | head -60`

Identify the pattern used to assert checkbox presence. Add a parallel test for the `community` toggle near the end of the `describe(...)` block:

```ts
  it('renders a community layer toggle', () => {
    const wrapper = mount(MapLayerControl, {
      props: { modelValue: ['profile', 'post', 'event', 'community'] },
      global: { stubs },
    })
    // Look for the community label key (uses t() from useI18n).
    expect(wrapper.text()).toContain('map.layer_control.communities')
  })
```

(Adjust `stubs` and `mount` props to match the spec's existing shape — read the file first.)

- [ ] **Step 2: Run the test — expect failure**

Run: `pnpm --filter frontend exec vitest run MapLayerControl 2>&1 | tail -10`
Expected: FAIL — community key not in rendered output.

- [ ] **Step 3: Add the fourth checkbox**

In `apps/frontend/src/features/map/components/MapLayerControl.vue`:

1. Add the icon import at line 11 (after `IconEvent`):

   ```ts
   import IconCommunity from '@/assets/icons/interface/community.svg'
   ```

2. In `<template>`, after the events `<div class="text-center"> ... </div>` block (currently lines 93-107), insert:

   ```vue
       <div class="text-center">
         <BFormCheckbox
           button
           button-variant="outline-primary"
           size="lg"
           class="btn-layer-select"
           :model-value="model.includes('community')"
           :disabled="isLocked('community')"
           @update:model-value="toggle('community')"
         >
           <IconCommunity class="svg-icon-lg" />
           <div class="form-hint mt-1">{{ t('map.layer_control.communities') }}</div>
         </BFormCheckbox>
       </div>
   ```

3. In the scoped style at the bottom, change `max-width: 16rem;` to `max-width: 20rem;` to give the four icons room.

- [ ] **Step 4: Run the test — expect pass**

Run: `pnpm --filter frontend exec vitest run MapLayerControl 2>&1 | tail -10`
Expected: PASS.

---

## Task 15: Update `BrowseProfiles.vue` dispatchers

**Files:**

- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue`

This file has multiple dispatch points scattered across the script. We update each one.

- [ ] **Step 1: Add the imports**

Locate the import block near the top of `<script setup>`. After the existing line:

```ts
import { renderEventMapIconHtml } from '@/features/events/components/eventMapIcon'
```

add:

```ts
import { renderCommunityMapIconHtml } from '@/features/community/components/communityMapIcon'
```

After:

```ts
import EventMapPopup from '@/features/events/components/EventMapPopup.vue'
import EventFullView from '@/features/events/components/EventFullView.vue'
```

add:

```ts
import CommunityMapPopup from '@/features/community/components/CommunityMapPopup.vue'
import CommunityFullView from '@/features/community/components/CommunityFullView.vue'
```

- [ ] **Step 2: Extend `iconResolver` (line ~100)**

Change:

```ts
const iconResolver = computed(() => (poi: MapPoi) => {
  if (poi.kind === 'post') return renderPostMapIconHtml
  if (poi.kind === 'event') return renderEventMapIconHtml
  return renderProfileMarkerHtml
})
```

to:

```ts
const iconResolver = computed(() => (poi: MapPoi) => {
  if (poi.kind === 'post') return renderPostMapIconHtml
  if (poi.kind === 'event') return renderEventMapIconHtml
  if (poi.kind === 'community') return renderCommunityMapIconHtml
  return renderProfileMarkerHtml
})
```

- [ ] **Step 3: Extend `popupResolver` (line ~106)**

Change:

```ts
const popupResolver = computed(() => (poi: MapPoi) => {
  if (poi.kind === 'post') return PostMapPopup
  if (poi.kind === 'event') return EventMapPopup
  return ProfileMapCard
})
```

to:

```ts
const popupResolver = computed(() => (poi: MapPoi) => {
  if (poi.kind === 'post') return PostMapPopup
  if (poi.kind === 'event') return EventMapPopup
  if (poi.kind === 'community') return CommunityMapPopup
  return ProfileMapCard
})
```

- [ ] **Step 4: Extend the detail watcher (line ~149-179)**

In the `watch(detail, async (d) => { ... })` block, after the existing `else if (d.type === 'event') { ... }` branch, insert:

```ts
    } else if (d.type === 'community') {
      const result = await contentStore.fetchPublicCommunity(d.id)
      if (result.success && result.data) {
        panel.show(CommunityFullView, { community: result.data.community })
      } else {
        toast.error(t('community.messages.error_load'))
        panel.close()
        router.replace({ name: 'Browse' })
      }
```

(Match the indentation and brace style of the existing `event` branch.)

- [ ] **Step 5: Add `handleCommunitySelect` helper (after `handleEventSelect`, line ~205)**

After:

```ts
function handleEventSelect(event: { id: string }) {
  router.push({ name: 'PublicEvent', params: { eventId: event.id } })
}
```

add:

```ts
function handleCommunitySelect(community: { id: string }) {
  router.push({ name: 'PublicCommunity', params: { communityId: community.id } })
}
```

- [ ] **Step 6: Extend `handleMarkerSelect` (line ~219-225)**

Change:

```ts
function handleMarkerSelect(id: string) {
  const poi = allPois.value.find((p) => p.id === id)
  if (!poi) return
  if (poi.kind === 'post') handlePostSelect({ id })
  else if (poi.kind === 'event') handleEventSelect({ id })
  else handleProfileSelect({ id })
}
```

to:

```ts
function handleMarkerSelect(id: string) {
  const poi = allPois.value.find((p) => p.id === id)
  if (!poi) return
  if (poi.kind === 'post') handlePostSelect({ id })
  else if (poi.kind === 'event') handleEventSelect({ id })
  else if (poi.kind === 'community') handleCommunitySelect({ id })
  else handleProfileSelect({ id })
}
```

- [ ] **Step 7: Type-check the change**

Run: `pnpm --filter frontend exec vue-tsc --noEmit 2>&1 | grep "BrowseProfiles" | head`
Expected: no errors.

---

## Task 16: Run all frontend tests

**Files:** none

- [ ] **Step 1: Run the full frontend test suite**

Run: `pnpm --filter frontend test 2>&1 | tail -30`
Expected: all tests pass. If any fail, diagnose and fix before continuing.

- [ ] **Step 2: Type-check**

Run: `pnpm type-check 2>&1 | tail -30`
Expected: clean across backend, frontend, admin.

- [ ] **Step 3: Lint**

Run: `pnpm lint 2>&1 | tail -30`
Expected: clean.

---

## Task 17: Browser verification via firefox-devtools MCP

**Files:** none

These checks confirm the feature works end-to-end. The dev server may already be running via `pnpm dev`.

- [ ] **Step 1: Ensure dev server is running**

Run: `curl -sk https://localhost:5173/home -o /dev/null -w "%{http_code}\n"`
Expected: `200`.

If not 200, start it: `pnpm dev` (in background — use the user's preferred workflow).

- [ ] **Step 2: Load firefox-devtools tool schemas**

Use ToolSearch to load `mcp__firefox-devtools__new_page`, `mcp__firefox-devtools__take_snapshot`, `mcp__firefox-devtools__click_by_uid`, `mcp__firefox-devtools__fill_by_uid`, `mcp__firefox-devtools__list_console_messages`.

- [ ] **Step 3: Navigate to home and log in**

Open `https://localhost:5173/home`. If the login screen appears, fill `me@example.org`, complete captcha, click Continue, then Continue again on the OTP page (dev shortcut — check `~/.claude/projects/-home-user-opencupid/memory/MEMORY.md` for the procedure if it's changed).

- [ ] **Step 4: Open the create-community flow**

From `/me/posts`, click the FloatingButton, then the community icon in the speed-dial. URL should change to `/me/communities/new`. The `EditCommunityDialog` should mount.

- [ ] **Step 5: Submit a test community**

Fill content with at least 11 characters. Pick a year. Submit. Verify the new community appears in `MyContentList`.

- [ ] **Step 6: Edit the community**

Click the edit pencil. URL should change to `/me/communities/<id>/edit`. The dialog should pre-populate. Toggle visibility. Save. Verify the card now shows `opacity-50` styling.

- [ ] **Step 7: Verify map**

Navigate to `/browse`. If you set a location on the community, look for the community map marker. Open the layer control — verify a fourth checkbox labeled "Communities" exists and toggles the layer.

- [ ] **Step 8: Verify detail panel**

Click the community marker. URL should change to `/communities/<id>`. `CommunityFullView` should mount in the detail panel.

- [ ] **Step 9: Capture a screenshot for the PR description**

Run firefox-devtools `screenshot_page` and save the result somewhere local. We'll embed it in the PR body.

---

## Task 18: Format changed files

**Files:** all files we touched

- [ ] **Step 1: Format only the files we changed**

Run:

```bash
pnpm exec prettier --write \
  apps/frontend/src/assets/icons/interface/community.svg \
  apps/frontend/src/features/community/components/CommunityCard.vue \
  apps/frontend/src/features/community/components/CommunityFullView.vue \
  apps/frontend/src/features/community/components/EditCommunityDialog.vue \
  apps/frontend/src/features/community/components/CommunityMapPopup.vue \
  apps/frontend/src/features/community/components/communityMapIcon.ts \
  apps/frontend/src/features/community/components/communityMapIcon.scss \
  apps/frontend/src/features/community/components/__tests__/CommunityCard.spec.ts \
  apps/frontend/src/features/community/components/__tests__/CommunityFullView.spec.ts \
  apps/frontend/src/features/community/components/__tests__/EditCommunityDialog.spec.ts \
  apps/frontend/src/features/userContent/components/ContentCard.vue \
  apps/frontend/src/features/posts/components/PostsOrchestrator.vue \
  apps/frontend/src/features/myprofile/components/ProfilePanel.vue \
  apps/frontend/src/features/myprofile/composables/useMyProfileRouteState.ts \
  apps/frontend/src/features/shared/composables/useDetailRouteState.ts \
  apps/frontend/src/features/shared/composables/__tests__/useDetailRouteState.spec.ts \
  apps/frontend/src/features/map/components/MapLayerControl.vue \
  apps/frontend/src/features/map/components/__tests__/MapLayerControl.spec.ts \
  apps/frontend/src/features/browse/views/BrowseProfiles.vue \
  apps/frontend/src/router/index.ts \
  packages/shared/i18n/en.json
```

Expected: no errors. (Some files may be unchanged if prettier finds them already conformant.)

---

## Task 19: Add a changeset

**Files:**

- Create: `.changeset/community-gui-launch.md` (or similar three-word kebab-case name)

- [ ] **Step 1: Write the changeset file**

```bash
cat > .changeset/community-gui-launch.md << 'EOF'
---
'@opencupid/frontend': minor
---

feat(community): add Community user-content GUI surface — card, full-view, edit dialog, map icon + popup, speed-dial pill, layer toggle, and routes.
EOF
```

- [ ] **Step 2: Verify the changeset was written**

Run: `cat .changeset/community-gui-launch.md`
Expected: the three frontmatter lines plus the description.

---

## Task 20: Run the CI-equivalent suite locally

**Files:** none

- [ ] **Step 1: Run full pre-PR checks**

Run: `pnpm run ci:test 2>&1 | tail -40`
Expected: green.

If anything fails, fix it and re-run. Do not proceed until clean.

---

## Task 21: Commit

**Files:** all changes

- [ ] **Step 1: Stage everything we changed**

Run:

```bash
git add \
  .changeset/community-gui-launch.md \
  apps/frontend/src/assets/icons/interface/community.svg \
  apps/frontend/src/features/community \
  apps/frontend/src/features/userContent/components/ContentCard.vue \
  apps/frontend/src/features/posts/components/PostsOrchestrator.vue \
  apps/frontend/src/features/myprofile/components/ProfilePanel.vue \
  apps/frontend/src/features/myprofile/composables/useMyProfileRouteState.ts \
  apps/frontend/src/features/shared/composables/useDetailRouteState.ts \
  apps/frontend/src/features/shared/composables/__tests__/useDetailRouteState.spec.ts \
  apps/frontend/src/features/map/components/MapLayerControl.vue \
  apps/frontend/src/features/map/components/__tests__/MapLayerControl.spec.ts \
  apps/frontend/src/features/browse/views/BrowseProfiles.vue \
  apps/frontend/src/router/index.ts \
  packages/shared/i18n/en.json \
  docs/superpowers/specs/2026-05-12-community-gui-design.md \
  docs/superpowers/plans/2026-05-12-community-gui.md
```

(Add `apps/frontend/src/features/myprofile/composables/__tests__/useMyProfileRouteState.spec.ts` if that file was newly created in Task 4.)

- [ ] **Step 2: Verify the staged diff**

Run: `git status --porcelain`
Expected: only added/modified files we intended.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(community): add Community user-content GUI surface

Adds the Vue surface for the `community` UserContent kind whose backend,
store actions, and DTOs landed in 56ab7028. Mirrors the Event GUI pattern
from PR #1450:

- `CommunityCard` / `CommunityFullView` / `EditCommunityDialog` /
  `CommunityMapPopup` under `features/community/components/`.
- Third speed-dial pill alongside post + event creation.
- Fourth map-layer toggle in `MapLayerControl` rendering circular pins
  masked with the embracing-figures SVG.
- Year-founded picker (last 15 years + "Don't know") on the edit form;
  schema bounds stay permissive so legacy data validates.
- `MeCreateCommunity` / `MeEditCommunity` / `PublicCommunity` routes;
  matching `editcommunity` subView and `editingCommunityId` from
  `useMyProfileRouteState`; `useDetailRouteState` learns the
  `community` arm.
- `ContentCard` discriminated dispatch becomes total (third `v-else-if`);
  `PostsOrchestrator` dispatchers converted from if/else chains to
  exhaustive `switch (item.kind)` blocks.
- `ProfilePanel`'s mount-gate at line 133 includes `editcommunity` so
  the edit drawer no longer mounts blank.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Confirm the commit landed**

Run: `git log --oneline -1`
Expected: the new commit at HEAD.

---

## Task 22: Push and open PR

**Files:** none

- [ ] **Step 1: Push**

Run: `git push -u origin feat/user-content-community-gui`
Expected: branch published.

- [ ] **Step 2: Open PR against the parent branch**

The parent of this branch is `feat/user-content-community`, not `main`, because this is stacked on top of the API plumbing branch. Use:

```bash
gh pr create --base feat/user-content-community --title "feat(community): GUI surface — card, full-view, edit, map, speed-dial" --body "$(cat <<'EOF'
## Summary

Adds the Vue surface for the `community` user-content kind on top of the API plumbing from 56ab7028. Stacked on top of `feat/user-content-community` so that branch's PR (or this one once that branch merges) becomes the base.

- New components: `CommunityCard`, `CommunityFullView`, `EditCommunityDialog`, `CommunityMapPopup`, `communityMapIcon` (under `features/community/components/`).
- Speed-dial: third pill alongside post + event creation.
- Map: fourth layer toggle in `MapLayerControl`; community POIs render as circular pins masked with the embracing-figures SVG.
- Edit form: year-founded picker covering the last 15 years plus a "Don't know" option that maps to `null`. Wire-schema bounds stay permissive.
- Routes: `MeCreateCommunity`, `MeEditCommunity`, `PublicCommunity`. `useMyProfileRouteState` exposes `editingCommunityId` and a new `editcommunity` subView. `useDetailRouteState` learns the `community` arm.
- Dispatch: `ContentCard` discriminated union becomes total; `PostsOrchestrator` dispatchers converted from if/else to exhaustive `switch (item.kind)` blocks; `ProfilePanel` mount-gate (line 133) includes `editcommunity`.

## Architecture notes

- Parallel-copy approach (not extraction of a shared `EditUserContentDialog`). At N=3 the patterns are not yet stable enough to abstract — Post and Event already diverge meaningfully (Post has no date, Event has date+venue, Community has yearFounded). Extracting now would be premature.
- Year-picker uses a 15-year window as a UX convenience; the DTO's `YearFoundedSchema` stays `[1, currentYear]` so legacy data validates.
- `ProfilePanel.vue:133` mount-gate change is the documented 4th-change trap — without it the edit drawer mounts blank.
- The map pin uses CSS `mask` (both `mask` and `-webkit-mask`) on `var(--bs-primary)`, matching the convention used elsewhere in the project.

## Test plan

- [ ] `pnpm --filter frontend test` — all specs pass (incl. new specs for CommunityCard, CommunityFullView, EditCommunityDialog, useMyProfileRouteState, useDetailRouteState, MapLayerControl)
- [ ] `pnpm type-check` — clean across backend / frontend / admin
- [ ] `pnpm lint` — clean
- [ ] Browser-verified via firefox-devtools MCP: create community → edit visibility → reopen → year persists; map marker click opens CommunityFullView; MapLayerControl toggles the community layer independently.
- [ ] CI green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Return the PR URL**

The output of `gh pr create` is the PR URL — share it back to the user.

---

## Task 23: Watch CI in background

**Files:** none

- [ ] **Step 1: Dispatch a background subagent to watch CI**

Use the Agent tool with `subagent_type: general-purpose` and `run_in_background: true`. Prompt: "Watch the CI run for the PR I just opened on branch `feat/user-content-community-gui`. Run `gh run watch --exit-status` until it exits. If it fails, run `gh run view --log-failed`, summarize the failure, and report back. If it passes, report back."

- [ ] **Step 2: Wait for notification, then act on the report**

If CI passes, the task is complete. If CI fails, diagnose, fix, and push the fix on the same branch; the subagent should retry.

---

## Self-review

(Performed inline while writing this plan.)

**Spec coverage:**

| Spec section | Plan task |
| --- | --- |
| SVG asset | Task 1 |
| i18n keys | Task 2 |
| Router routes | Task 3 |
| `useMyProfileRouteState` extension | Task 4 |
| `useDetailRouteState` extension | Task 5 |
| Map icon + scss | Task 6 |
| `CommunityCard` | Task 7 |
| `CommunityFullView` | Task 8 |
| `EditCommunityDialog` | Task 9 |
| `CommunityMapPopup` | Task 10 |
| `ContentCard` dispatch arm | Task 11 |
| `PostsOrchestrator` (speed-dial + switch dispatchers + EditCommunityDialog arm + state) | Task 12 |
| `ProfilePanel:133` mount-gate (4th-change trap) | Task 13 |
| `MapLayerControl` (+ test) | Task 14 |
| `BrowseProfiles` dispatchers + handleCommunitySelect | Task 15 |
| Frontend tests + type-check + lint | Task 16 |
| Browser verification | Task 17 |
| Format | Task 18 |
| Changeset | Task 19 |
| CI-equivalent local run | Task 20 |
| Commit | Task 21 |
| Push + PR | Task 22 |
| CI watch | Task 23 |

**Placeholder scan:** no "TBD", "TODO", or "implement later" remaining. The one soft note (Task 1 mentioning the simplified single-path icon vs. full embrace) is a documented fallback decision, not a placeholder.

**Type consistency:** prop name `community` consistent across `CommunityCard`, `CommunityFullView`, `EditCommunityDialog`. Event names `click | edit | hide | delete` consistent. Function name `handleCommunitySelect` consistent in Task 15 and Task 12. Route names `MeCreateCommunity`, `MeEditCommunity`, `PublicCommunity` consistent across Tasks 3, 4, 12, 15. `editingCommunityId` consistent across Tasks 4 and 12. ContentCard arm property name `community` matches `CommunityCard`'s prop. `yearFounded` consistent across DTO usage and form schema.

**Open verifications during implementation:**

1. Task 4 — confirm whether `useMyProfileRouteState.spec.ts` exists; create vs. modify.
2. Task 14 — adapt new test to the existing spec's `stubs` / mount shape.
3. Task 15 — exact line numbers in `BrowseProfiles.vue` may have shifted; use surrounding context to locate insertion points.

These are normal "read the file before editing" steps, not plan gaps.

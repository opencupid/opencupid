# Community GUI surface — design

**Branch:** `feat/user-content-community-gui` (off `feat/user-content-community`)
**Date:** 2026-05-12
**Related:** PR #1450 (events GUI suite), commit 56ab7028 (Community API plumbing),
[docs/user-content-howto.md](../../user-content-howto.md)

## Goal

Add the Vue surface for the `community` UserContent kind whose backend, store
actions, and shared wire DTOs already landed on the parent branch. Mirror the
patterns established for `event` in PR #1450 so reviewers can pattern-match
line-for-line against the Event addition. No schema, service, or DTO changes
in this PR.

## Non-goals

- Joining/following communities (no backend semantics exist).
- A members list on community detail.
- A dedicated `communitySummaries` map-bounds endpoint — the cluster service
  already serves community POIs.
- Extracting a shared `EditUserContentDialog` / `UserContentCard` — premature
  at N=3.
- Tightening `MAX_YEAR_FOUNDED` / `MIN_YEAR_FOUNDED` in the wire DTO to match
  the 15-year UI window — the schema stays permissive for legacy data.
- A per-form error surface on submit failure inside `EditCommunityDialog`. The
  existing `EditEventDialog` doesn't have one either; matching it for parity
  and flagging as a separate follow-up for both kinds together.

## Architecture at a glance

Single PR. Adds:

- Five Vue components under `apps/frontend/src/features/community/components/`.
- One SVG asset under `apps/frontend/src/assets/icons/interface/`.
- Three new router routes; one new `ProfileSubView` value; one new
  `editingCommunityId` computed.
- Six dispatch-site updates across existing shared components.
- One new i18n namespace `community.*`; two keys added to existing namespaces.

Data flow mirrors Event:

1. Owner creates/edits via `EditCommunityDialog` → `useUserContentStore.createCommunity`
   / `updateCommunity` → backend `/content/communities` → `OwnerCommunity` returned
   → store `upsert` keeps `myContent` unified list in sync.
2. Map marker click → `handleMarkerSelect` → `router.push({ name: 'PublicCommunity', ... })`
   → BrowseProfiles' `detail` watcher → `contentStore.fetchPublicCommunity(id)`
   → `panel.show(CommunityFullView, { community })`.
3. Owner list → `MyContentList` → `ContentCard.vue` discriminated dispatch
   (`v-else-if kind === 'community'`) → `CommunityCard`.

Because the wire DTOs (`PublicCommunity` | `OwnerCommunity` |
`PublicCommunityDetail`) are already members of the
`OwnerUserContentSchema` / `PublicUserContentSchema` discriminated unions, the
`ContentCard.vue` dispatch becomes total when the third `v-else-if` is added.

## File inventory

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
```

### Modified files

| File | Change |
| --- | --- |
| `apps/frontend/src/router/index.ts` | +3 routes: `PublicCommunity`, `MeCreateCommunity`, `MeEditCommunity` |
| `apps/frontend/src/features/myprofile/composables/useMyProfileRouteState.ts` | +`editcommunity` subView, +`editingCommunityId` computed, expand `MY_PROFILE_ROUTES` set |
| `apps/frontend/src/features/shared/composables/useDetailRouteState.ts` | parser learns `type: 'community'` for `route.name === 'PublicCommunity'` |
| `apps/frontend/src/features/userContent/components/ContentCard.vue` | +`v-else-if kind === 'community'` arm |
| `apps/frontend/src/features/posts/components/PostsOrchestrator.vue` | +3rd speed-dial pill, exhaustive `switch` on dispatchers, `EditCommunityDialog` template arm, `editingCommunity` state + deep-link guard |
| `apps/frontend/src/features/myprofile/components/ProfilePanel.vue` (line 133) | mount-gate includes `subView === 'editcommunity'` |
| `apps/frontend/src/features/map/components/MapLayerControl.vue` | +4th checkbox |
| `apps/frontend/src/features/browse/views/BrowseProfiles.vue` | `iconResolver` / `popupResolver` / `handleMarkerSelect` / detail watcher arms, `handleCommunitySelect` helper |
| `packages/shared/i18n/en.json` | +`community.*` namespace, +`posts.actions.create_community_cta_title`, +`map.layer_control.communities` |

### Spec updates / docs

- `docs/user-content-howto.md` may get a small note at the bottom of the stage
  checklist mentioning community as a worked example (optional; not required
  for this PR).

## Component shapes

### CommunityCard.vue

Clone of `apps/frontend/src/features/events/components/EventCard.vue` with:

- Props: `community: PublicCommunity | OwnerCommunity` from `@zod/community/community.dto`.
- Emits: `click | edit | hide | delete` (drop `attend`).
- Right-side aside: replace `IconCalendar` + date/time stack with `IconCommunity`,
  then (when `yearFounded != null`) render
  `{{ t('community.labels.founded_since', { year: yearFounded }) }}`.
  `LocationLabel` retained.
- No `venue` row.
- `ViewerToolbar` slot: empty. Just `:actions="['copy', 'share']"`.
- `shareCommunityPayload` computed: `title = content.substring(0, 80)`,
  `text = t('community.share.community_text', { publicName: postedBy.publicName })`,
  `url = ${origin}/communities/${id}`.
- Same `GRID_TRUNCATE_LENGTH = 100`, same `isVisible` computed, same
  `event-card--own`-equivalent `community-card--own` modifier.

### CommunityFullView.vue

Verbatim clone of `EventFullView.vue`:

- Props: `community: PublicCommunityDetail | OwnerCommunity`.
- Renders `<CommunityCard :community="community" :show-details="true" />` inside
  the same close-button shell. Same injected `detailPanelClose` fallback.

### EditCommunityDialog.vue

Cloned from `EditEventDialog.vue` with the following changes.

Drop `VueDatePicker` and `date-fns/locale` imports.

Form schema:

```ts
const COMMUNITY_CONTENT_MAX_LENGTH = 300
const CommunityFormSchema = z.object({
  content: z.string().default(''),
  isVisible: z.boolean().default(true),
  yearFounded: z.number().int().nullable().default(null),
  location: LocationSchema,
})
```

Year picker UI:

```ts
const currentYear = new Date().getUTCFullYear()
const yearOptions = computed(() => [
  { value: null, text: t('community.placeholders.year_unknown') },
  ...Array.from({ length: 15 }, (_, i) => {
    const y = currentYear - i
    return { value: y, text: String(y) }
  }),
])
```

Rendered as `<BFormSelect v-model="form.yearFounded" :options="yearOptions" />`.

- `isFormValid`: `form.content.trim().length > 10 && form.content.length <= COMMUNITY_CONTENT_MAX_LENGTH`.
- Submit: `createCommunity({ content, yearFounded, ...location })` or
  `updateCommunity(id, { content, isVisible, yearFounded, ...location })`.
- Emit on success: `emit('saved', result.data.community)`.
- Field order: content textarea → LocationSelector → year-founded BFormSelect →
  isVisible checkbox (edit-mode only) → cancel/save row.

### CommunityMapPopup.vue

Clone of `EventMapPopup.vue`. Shows `IconCommunity`, truncated content excerpt,
`postedBy.publicName`, `yearFounded` if set.

### communityMapIcon.ts + communityMapIcon.scss

```ts
import type { IconRenderer } from '@/features/map/types/map.types'
import './communityMapIcon.scss'
export const renderCommunityMapIconHtml: IconRenderer =
  () => '<div class="map-community"></div>'
```

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

### SVG asset

`apps/frontend/src/assets/icons/interface/community.svg`: the user-supplied
two-figures-embracing icon, with Inkscape (`sodipodi:` and `inkscape:`)
namespace metadata stripped. Explicit greyscale fills (`#fff` / `#999999` /
`#666666`) preserved for the speed-dial and aside renderings — the map mask
ignores fills and just uses the silhouette.

## Dispatch sites — exact edits

### 1. ContentCard.vue

```vue
<CommunityCard
  v-else-if="item.kind === 'community'"
  :community="item"
  :show-details="showDetails"
  @click="$emit('click', item)"
  @edit="$emit('edit', item)"
  @hide="$emit('hide', item)"
  @delete="$emit('delete', item)"
/>
```

### 2. BrowseProfiles.vue

```ts
// iconResolver
if (poi.kind === 'community') return renderCommunityMapIconHtml

// popupResolver
if (poi.kind === 'community') return CommunityMapPopup

// detail watcher
else if (d.type === 'community') {
  const result = await contentStore.fetchPublicCommunity(d.id)
  if (result.success && result.data) {
    panel.show(CommunityFullView, { community: result.data.community })
  } else {
    toast.error(t('community.messages.error_load'))
    panel.close()
    router.replace({ name: 'Browse' })
  }
}

// handleMarkerSelect
else if (poi.kind === 'community') handleCommunitySelect({ id })

// new helper
function handleCommunitySelect(community: { id: string }) {
  router.push({ name: 'PublicCommunity', params: { communityId: community.id } })
}
```

### 3. MapLayerControl.vue

Fourth `<BFormCheckbox button>` for `community` with `IconCommunity` and
`t('map.layer_control.communities')`. The `model` array (`UserContentKind[]`)
and `toggle()` / `isLocked()` helpers already work generically. May bump
`.layer-control-grid { max-width }` from `16rem` to `20rem` for breathing room.

### 4. PostsOrchestrator.vue

- New state: `editingCommunity = ref<OwnerCommunity | undefined>()`.
- New deep-link guard: `watch(editingCommunityId, ...)` mirroring the existing
  Post/Event guards at lines 34-58.
- Third speed-dial pill in `template` (see code block below).
- New helper: `function openCreateCommunity() { editingCommunity.value = undefined; router.push({ name: 'MeCreateCommunity' }) }`.
- `handleEdit`, `handleDelete`, `handleHide` converted from `if/else` to
  exhaustive `switch (item.kind)` blocks (per commit 56ab7028's rationale).
  Community visibility toggles via
  `contentStore.updateCommunity(item.id, { isVisible: !isVisible })`.
- Template arm: `<EditCommunityDialog v-else-if="subView === 'editcommunity'" ... />`.

Third speed-dial pill markup:

```vue
<BButton
  size="lg"
  class="btn-icon-lg btn-shadow btn btn-light rounded-circle"
  variant="outline-primary"
  :title="$t('posts.actions.create_community_cta_title')"
  @click="openCreateCommunity"
>
  <IconCommunity class="svg-icon" />
</BButton>
```

### 5. ProfilePanel.vue line 133 (the 4th-change trap)

```vue
v-else-if="subView === 'myposts' || subView === 'editpost' || subView === 'editevent' || subView === 'editcommunity'"
```

Without this edit the community edit drawer mounts blank — the symptom
documented in memory `feedback_subview_mount_gate.md`.

### 6. MyContentList.vue

If the component already iterates `myContent` generically and lets
`ContentCard` dispatch, no change is needed. If it filters per-kind, add a
third arm. Verify during implementation.

## Router + composable

### router/index.ts

```ts
browseRoute('communities/:communityId', 'PublicCommunity'),
browseRoute('me/communities/new', 'MeCreateCommunity'),
browseRoute('me/communities/:communityId/edit', 'MeEditCommunity'),
```

### useMyProfileRouteState.ts

- `ProfileSubView` union: `'editcommunity'`.
- `MY_PROFILE_ROUTES` set: `'MeCreateCommunity'`, `'MeEditCommunity'`.
- `subView` switch: cases `'MeCreateCommunity' | 'MeEditCommunity'` →
  `'editcommunity'`.
- New `editingCommunityId` computed: `route.name === 'MeEditCommunity'
  ? (route.params.communityId as string) : undefined`.
- Add `editingCommunityId` to the returned object.

### useDetailRouteState.ts

`apps/frontend/src/features/shared/composables/useDetailRouteState.ts` currently
has three branches (`PublicProfile` → `profile`, `PublicPost` → `post`,
`PublicEvent` → `event`). Add a fourth branch returning
`{ type: 'community' as const, id: route.params.communityId as string }` for
`route.name === 'PublicCommunity'`. The existing spec
`__tests__/useDetailRouteState.spec.ts` gets a parallel case.

## i18n keys

`packages/shared/i18n/en.json` additions:

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
}
```

Plus:

- `posts.actions.create_community_cta_title`: `"Create a community"`.
- `map.layer_control.communities`: `"Communities"`.

Run `pnpm tolgee:push` after the keys land so they're available for translation.

## Error handling

| Surface | Behaviour |
| --- | --- |
| `fetchPublicCommunity` failure | Toast `t('community.messages.error_load')`, close panel, replace route to `Browse`. Identical to post/event branches. |
| Deep-link to `MeEditCommunity` without a loaded community | Orchestrator's `watch(editingCommunityId, ...)` redirects to `MePosts`. |
| Submit failure in `EditCommunityDialog` | Form stays open with user's input intact; global toast surface handles error display. Matches existing `EditEventDialog` behaviour exactly. Per-form error UI is a separate follow-up across all kinds. |

## Tests

### Unit

- `__tests__/CommunityCard.spec.ts`:
  - Renders content; renders `yearFounded` line when set; omits when null.
  - Emits `click` / `edit` / `hide` / `delete` on respective interactions.
  - Owner vs non-owner: `OwnerToolbar` vs `ProfileThumbnail + publicName`.
- `__tests__/CommunityFullView.spec.ts`:
  - Renders close button and `CommunityCard`.
  - Close button calls injected `detailPanelClose` when available, otherwise
    `router.replace({ name: 'Browse' })`.
- `__tests__/EditCommunityDialog.spec.ts`:
  - Create-mode submit with `yearFounded = null` (when "Don't know" selected).
  - Create-mode submit with numeric `yearFounded`.
  - Edit-mode pre-populates from `props.community`.
  - Edit-mode shows `isVisible` toggle; create-mode hides it.
  - Submit disabled when `content.length < 10` after trim.
  - Cancel emits `cancel`; successful save emits `saved` with the returned community.

### Integration

- `userContent/components/__tests__/ContentCard.spec.ts`: add a case asserting
  `kind === 'community'` renders `CommunityCard`.
- `posts/components/__tests__/PostsOrchestrator.spec.ts`: add cases for the
  third speed-dial pill, `openCreateCommunity`, and `switch`-arm dispatchers
  for `handleEdit` / `handleDelete` / `handleHide`.
- `map/components/__tests__/MapLayerControl.spec.ts`: add cases for the
  community toggle and its `isLocked` interaction.
- `browse/views/__tests__/BrowseProfiles.spec.ts`: add cases asserting
  community-kind POIs render the community icon, marker click navigates to
  `PublicCommunity`, and the detail watcher fetches via `fetchPublicCommunity`
  and shows `CommunityFullView`.

### Manual / browser

Via firefox-devtools MCP at `https://localhost:5173/home`:

- Create community → appears in MyContentList → edit it → toggle visibility
  → reopen → confirm `yearFounded` persists.
- Locate it on BrowseMap → marker uses community icon → click → CommunityFullView
  mounts in detail panel → close → URL replaces back to `/browse`.
- Toggle community layer off in MapLayerControl → markers disappear → toggle on
  → reappear.
- Deep-link cold-load: `/communities/:id` and `/me/communities/:id/edit`.

## Build sequence

Single PR, single commit on `feat/user-content-community-gui`. Order of edits:

1. Drop SVG asset (`community.svg`, namespace-cleaned).
2. i18n keys (`community.*` + two insertions). Run i18n validator.
3. Router routes + `useMyProfileRouteState` (subView, editingCommunityId,
   MY_PROFILE_ROUTES) + `useDetailRouteState` parser.
4. Map icon files (`communityMapIcon.ts` + `.scss`).
5. `CommunityCard.vue` + unit tests.
6. `CommunityFullView.vue` + unit tests.
7. `EditCommunityDialog.vue` + unit tests.
8. `CommunityMapPopup.vue`.
9. Dispatch sites in order: `ContentCard.vue` → `PostsOrchestrator.vue`
   → `ProfilePanel.vue:133` mount-gate (adjacent to orchestrator) →
   `MapLayerControl.vue` → `BrowseProfiles.vue`.
10. Integration tests for dispatch sites.
11. Dev server + firefox-devtools MCP golden-path verification.
12. `pnpm exec prettier --write` on changed files; `pnpm --filter frontend test`;
    `pnpm type-check`; `pnpm lint`.
13. Commit, push, open PR mirroring PR #1450's structure.
14. CI watch in background subagent until green.

## Risks

| Risk | Mitigation |
| --- | --- |
| `ProfilePanel.vue:133` mount-gate missed | Step 9 puts it immediately adjacent to PostsOrchestrator. Explicit checklist item. Integration test covers `subView === 'editcommunity'`. |
| `useDetailRouteState` `community` arm missed | TypeScript narrowing surfaces this at type-check time as soon as `d.type === 'community'` is referenced in BrowseProfiles. |
| Speed-dial overcrowding on small screens | Three pills × ~48px = ~180px column; FloatingButton already uses `flex-direction: column` and grows naturally. |
| SVG mask rendering inconsistency | Both `mask` and `-webkit-mask` set; same approach as other masked icons in the project. |
| Year-picker mismatch with permissive DTO bounds | Intentional. UI restricts to last 15 years; wire schema stays `[1, currentYear]` so legacy data validates. Documented as non-goal. |

## Acceptance criteria

- All four sub-views (myposts, editpost, editevent, editcommunity) mount correctly
  in `ProfilePanel.vue`.
- A community owner can create, edit, hide, and delete a community via the
  drawer.
- A non-owner viewer sees community POIs on the map, can click through to
  `CommunityFullView`, and can copy/share the community URL.
- `MapLayerControl` toggles the community layer independently.
- All Vitest specs pass; `pnpm type-check` is clean across frontend + admin;
  `pnpm lint` is clean.
- CI green on the PR.
- A changeset under `.changeset/` patches the frontend package (minor bump —
  new feature).

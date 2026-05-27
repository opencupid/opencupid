# AttachImageButton Refactor — Design

**Date:** 2026-05-28
**Branch:** `feat/attach-image-button`

## Goal

Refactor `apps/frontend/src/features/images/components/ImageEditor.vue` into a
composable + a render-only thin component. Introduce a new
`AttachImageButton.vue` that reuses the composable and replaces
`ContentImageButton.vue` at all four call sites. `AttachImageButton` exposes
the same upload/delete functionality as `ImageEditor`, minus drag-reorder, and
renders selected images as an inline thumbnail roll (like the current
`ContentImageButton`).

## Non-Goals

- No changes to `ImageUpload`, `ImageTag`, `galleryStore`, or
  `userContentImageStore`.
- No changes to call-site form logic — only the import line and template tag
  name change.
- No reorder support in `AttachImageButton` (consistent with the current
  `ContentImageButton`).

## Components

### 1. New composable: `useImageEditor`

**Path:** `apps/frontend/src/features/images/composables/useImageEditor.ts`

```ts
function useImageEditor(options: {
  store: GalleryStore
  minImages: MaybeRefOrGetter<number>
  maxImages?: MaybeRefOrGetter<number>   // default 6
  autoLoad?: MaybeRefOrGetter<boolean>   // default false
}): {
  model: WritableComputedRef<OwnerImage[]>
  isRemoving: Ref<Record<string, boolean>>
  error: Ref<string>
  placeholderSlots: ComputedRef<unknown[]>
  remainingSlots: ComputedRef<number>
  isDeletable: ComputedRef<boolean>
  handleDelete: (img: OwnerImage) => Promise<void>
  handleReorder: (event: any) => Promise<void>
  checkMove: (evt: any) => boolean
}
```

Responsibilities:

- Owns the `onMounted` `store.load()` call when `autoLoad` resolves truthy.
- Owns the `onUnmounted` `store.cleanup?.()?.catch(() => {})` (fire-and-forget;
  Vue does not await lifecycle hooks).
- Exposes the same reactive derivations that currently live in
  `ImageEditor.vue` — slot math, deletable guard, remove tracker, error
  message, reorder handler.
- Uses `toValue()` on `MaybeRefOrGetter` inputs so callers may pass
  reactive expressions (e.g. `autoLoad: () => !!props.contentId`).

### 2. `ImageEditor.vue` becomes render-only

- `<script setup>` shrinks to a single call to `useImageEditor` with
  `{ store, minImages, maxImages, autoLoad: true }` and destructures the
  returned reactive bindings.
- Template is unchanged. The drag-reorder grid stays intact.
- Net: ~40 lines of logic removed, 4 lines of composable wiring added.

### 3. New `AttachImageButton.vue`

**Path:** `apps/frontend/src/features/images/components/AttachImageButton.vue`

Props (same shape as `ContentImageButton`):

```ts
{ contentId?: string; maxImages?: number /* default MAX_IMAGES_PER_GALLERY */ }
```

Exposes (unchanged contract — preserves the four call sites):

```ts
{ getImageIds(): string[]; markSaved(): void }
```

Behavior:

- Constructs the `useUserContentImageStore` exactly like `ContentImageButton`
  does today (draftKey for new content, contentId for existing).
- Uses `useImageEditor({ store, minImages: 0, maxImages,
  autoLoad: () => !!props.contentId })` — the composable now owns the
  conditional load that `ContentImageButton` performs inline.
- Renders the `IconPhoto` `BButton` plus an inline thumb roll. Each thumb has
  a hover-revealed X overlay button:
  - Click thumb → `showModal = true`
  - Click X overlay → `handleDelete(img)` from the composable;
    `:disabled="isRemoving[img.id]"`; thumb dims via the existing `.removing`
    style.
- Modal hosts `ImageEditor` with `:minImages="0"` and the same `:maxImages`.
  The editor inside the modal stays drag-reorderable; the button itself just
  shows the inline roll.

### 4. Delete `ContentImageButton.vue`

Update the four callers to import `AttachImageButton` instead:

- `apps/frontend/src/features/community/components/EditCommunityDialog.vue`
- `apps/frontend/src/features/events/components/EditEventDialog.vue`
- `apps/frontend/src/features/posts/components/EditPostDialog.vue`
- `apps/frontend/src/features/messaging/components/SendMessageForm.vue`

`InstanceType<typeof ContentImageButton>` template refs become
`InstanceType<typeof AttachImageButton>`. The `getImageIds()` / `markSaved()`
contract is preserved, so call-site logic does not change.

Also update the docstring reference in
`apps/frontend/src/features/images/stores/userContentImageStore.ts` (mentions
`ImageEditor.onUnmounted` — still accurate, no change required, but verify
during implementation).

### 5. Tests

- **New:** `__tests__/useImageEditor.spec.ts` — pure composable tests:
  load on mount when `autoLoad` is true (and skipped when false), cleanup on
  unmount, slot math (`placeholderSlots`, `remainingSlots`), `isDeletable`
  threshold, delete error path sets `error` and clears `isRemoving`, reorder
  payload shape, `checkMove` guard against dropping past `model.length`.
- **Rename + update:** `__tests__/ContentImageButton.spec.ts` →
  `__tests__/AttachImageButton.spec.ts` — covers thumb rendering, X-overlay
  delete affordance, modal open on thumb click, exposed methods.
- No new `ImageEditor` spec needed — its logic is now fully covered by the
  composable spec, and the template is unchanged.

## Data Flow

```
GalleryStore (props.store)
        │
        ▼
useImageEditor(options)  ← single owner of load/cleanup + derived state
        │
        ├─ ImageEditor.vue  (drag-reorderable grid, modal-hosted)
        │
        └─ AttachImageButton.vue
              ├─ inline thumb roll (X overlay → handleDelete)
              └─ BModal → ImageEditor (drag-reorderable)
```

## Error Handling

- `handleDelete` keeps the existing behavior: on failure, set
  `error.value = res.message` and clear `isRemoving[id]`. The inline thumb
  roll surfaces this via the dim/disabled state; the modal editor surfaces it
  the same way it does today.
- `onUnmounted` cleanup remains fire-and-forget with a `.catch(() => {})` to
  prevent unhandled promise rejections.

## Risks & Mitigations

- **Template ref typing drift.** Each caller imports
  `InstanceType<typeof ContentImageButton>`. Implementation must update all
  four refs in lockstep with the import change; `pnpm type-check` will catch
  any miss.
- **Spec coverage gap during the rename.** Move the spec in a single commit
  alongside the component rename so the test always exists in some form.
- **`userContentImageStore` docstring.** Mentions `ImageEditor.onUnmounted`.
  After the refactor, cleanup is invoked from the composable on behalf of
  both `ImageEditor` and `AttachImageButton`; update the comment if it would
  confuse a future reader.

## Build Sequence

1. Add `useImageEditor` composable + spec.
2. Refactor `ImageEditor.vue` to consume the composable (behavior unchanged).
3. Add `AttachImageButton.vue` + spec (renamed from `ContentImageButton.spec`).
4. Switch the four callers from `ContentImageButton` to `AttachImageButton`.
5. Delete `ContentImageButton.vue` and the old spec path.
6. Run `pnpm --filter frontend test`, `pnpm type-check`, `pnpm lint`.
7. Add a changeset (`patch` for `@opencupid/frontend`).

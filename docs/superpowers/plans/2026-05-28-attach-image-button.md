# AttachImageButton Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `ImageEditor.vue` logic into a `useImageEditor` composable, make `ImageEditor` render-only, introduce `AttachImageButton` (reuses the composable with an inline thumb roll + X-overlay delete) and replace `ContentImageButton` at all four call sites.

**Architecture:** A single `useImageEditor` composable owns store load/cleanup lifecycle and reactive derivations (slot math, deletable guard, remove tracker, error, reorder handler). `ImageEditor.vue` becomes a thin wrapper rendering the drag-reorder grid. `AttachImageButton.vue` consumes the same composable to render an inline `IconPhoto` button + thumb roll (with hover-revealed X), and hosts the `ImageEditor` inside a modal for the editing experience.

**Tech Stack:** Vue 3 `<script setup>`, Composition API, TypeScript, Pinia, Vitest + Vue Test Utils, Bootstrap-vue-next, vue-draggable-next, vue-i18n.

**Spec:** `docs/superpowers/specs/2026-05-28-attach-image-button-refactor-design.md`

---

## File Structure

**Create:**

- `apps/frontend/src/features/images/composables/useImageEditor.ts` — the composable.
- `apps/frontend/src/features/images/__tests__/useImageEditor.spec.ts` — composable spec.
- `apps/frontend/src/features/images/components/AttachImageButton.vue` — new inline attach button.
- `apps/frontend/src/features/images/__tests__/AttachImageButton.spec.ts` — replaces ContentImageButton spec.
- `.changeset/attach-image-button-refactor.md` — changeset entry.

**Modify:**

- `apps/frontend/src/features/images/components/ImageEditor.vue` — slim to render-only using composable.
- `apps/frontend/src/features/images/stores/userContentImageStore.ts:26` — update docstring (`ImageEditor.onUnmounted` → `useImageEditor.onUnmounted`).
- `apps/frontend/src/features/community/components/EditCommunityDialog.vue:10,55,154` — swap import + ref type + tag.
- `apps/frontend/src/features/events/components/EditEventDialog.vue:13,67,190` — swap import + ref type + tag.
- `apps/frontend/src/features/posts/components/EditPostDialog.vue:22,54,153` — swap import + ref type + tag.
- `apps/frontend/src/features/messaging/components/SendMessageForm.vue:22,58,236` — swap import + ref type + tag.

**Delete:**

- `apps/frontend/src/features/images/components/ContentImageButton.vue`
- `apps/frontend/src/features/images/__tests__/ContentImageButton.spec.ts`

---

## Task 1: Create the `useImageEditor` composable spec (failing)

**Files:**

- Create: `apps/frontend/src/features/images/__tests__/useImageEditor.spec.ts`

- [ ] **Step 1: Write the failing test file**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useImageEditor } from '../composables/useImageEditor'
import type { GalleryStore } from '../stores/galleryStore'
import type { OwnerImage } from '@zod/image/image.dto'

function makeImage(id: string, position = 0): OwnerImage {
  return {
    id,
    mimeType: 'image/jpeg',
    altText: '',
    position,
    blurhash: 'L0',
    variants: [{ size: 'thumb', url: `/${id}` }],
  } as unknown as OwnerImage
}

function makeStore(initial: OwnerImage[] = []): GalleryStore & {
  load: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  reorder: ReturnType<typeof vi.fn>
  cleanup: ReturnType<typeof vi.fn>
} {
  return {
    images: [...initial],
    isLoading: false,
    load: vi.fn().mockResolvedValue({ success: true }),
    upload: vi.fn().mockResolvedValue({ success: true }),
    remove: vi.fn().mockResolvedValue({ success: true }),
    reorder: vi.fn().mockResolvedValue({ success: true }),
    cleanup: vi.fn().mockResolvedValue({ success: true }),
  } as any
}

// Mount the composable inside a tiny host component so onMounted/onUnmounted fire.
function mountComposable<T>(setup: () => T) {
  let api!: T
  const Host = defineComponent({
    setup() {
      api = setup()
      return () => h('div')
    },
  })
  const wrapper = mount(Host)
  return { wrapper, api: () => api }
}

describe('useImageEditor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls store.load() on mount when autoLoad is true', async () => {
    const store = makeStore()
    mountComposable(() =>
      useImageEditor({ store, minImages: 0, maxImages: 6, autoLoad: true })
    )
    await nextTick()
    expect(store.load).toHaveBeenCalledTimes(1)
  })

  it('does not call store.load() on mount when autoLoad is false', async () => {
    const store = makeStore()
    mountComposable(() =>
      useImageEditor({ store, minImages: 0, maxImages: 6, autoLoad: false })
    )
    await nextTick()
    expect(store.load).not.toHaveBeenCalled()
  })

  it('defaults autoLoad to false', async () => {
    const store = makeStore()
    mountComposable(() => useImageEditor({ store, minImages: 0 }))
    await nextTick()
    expect(store.load).not.toHaveBeenCalled()
  })

  it('reacts to autoLoad as a getter', async () => {
    const store = makeStore()
    const enabled = ref(false)
    mountComposable(() =>
      useImageEditor({ store, minImages: 0, autoLoad: () => enabled.value })
    )
    await nextTick()
    expect(store.load).not.toHaveBeenCalled()
    // Getter is evaluated at mount only; toggling later must not re-fire load.
    enabled.value = true
    await nextTick()
    expect(store.load).not.toHaveBeenCalled()
  })

  it('calls store.cleanup() on unmount and swallows rejections', async () => {
    const store = makeStore()
    store.cleanup.mockRejectedValueOnce(new Error('boom'))
    const { wrapper } = mountComposable(() =>
      useImageEditor({ store, minImages: 0 })
    )
    wrapper.unmount()
    await nextTick()
    expect(store.cleanup).toHaveBeenCalledTimes(1)
  })

  it('handleDelete sets isRemoving, then clears it on success', async () => {
    const img = makeImage('a')
    const store = makeStore([img])
    let resolveRemove: (v: any) => void = () => {}
    store.remove.mockReturnValue(new Promise((r) => (resolveRemove = r)))
    const { api } = mountComposable(() =>
      useImageEditor({ store, minImages: 0 })
    )
    const p = api().handleDelete(img)
    expect(api().isRemoving.value['a']).toBe(true)
    resolveRemove({ success: true })
    await p
    // Composable does not clear isRemoving on success — the row disappears
    // from the store, so the flag is effectively gone. Assert no error set.
    expect(api().error.value).toBe('')
  })

  it('handleDelete sets error and clears isRemoving on failure', async () => {
    const img = makeImage('a')
    const store = makeStore([img])
    store.remove.mockResolvedValueOnce({ success: false, message: 'nope' })
    const { api } = mountComposable(() =>
      useImageEditor({ store, minImages: 0 })
    )
    await api().handleDelete(img)
    expect(api().error.value).toBe('nope')
    expect(api().isRemoving.value['a']).toBe(false)
  })

  it('handleReorder calls store.reorder with positions derived from model order', async () => {
    const a = makeImage('a', 0)
    const b = makeImage('b', 1)
    const store = makeStore([a, b])
    const { api } = mountComposable(() =>
      useImageEditor({ store, minImages: 0 })
    )
    api().model.value = [b, a]
    await api().handleReorder({ moved: { oldIndex: 0, newIndex: 1 } })
    expect(store.reorder).toHaveBeenCalledWith([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
    ])
  })

  it('handleReorder is a no-op when event.moved is absent', async () => {
    const store = makeStore([makeImage('a')])
    const { api } = mountComposable(() =>
      useImageEditor({ store, minImages: 0 })
    )
    await api().handleReorder({})
    expect(store.reorder).not.toHaveBeenCalled()
  })

  it('checkMove returns true when futureIndex is within model bounds', () => {
    const store = makeStore([makeImage('a'), makeImage('b')])
    const { api } = mountComposable(() =>
      useImageEditor({ store, minImages: 0 })
    )
    expect(api().checkMove({ draggedContext: { futureIndex: 0 } })).toBe(true)
    expect(api().checkMove({ draggedContext: { futureIndex: 1 } })).toBe(true)
    // futureIndex === model.length is the uploader slot — disallowed.
    expect(api().checkMove({ draggedContext: { futureIndex: 2 } })).toBe(false)
  })

  it('remainingSlots = maxImages - images.length', () => {
    const store = makeStore([makeImage('a'), makeImage('b')])
    const { api } = mountComposable(() =>
      useImageEditor({ store, minImages: 0, maxImages: 6 })
    )
    expect(api().remainingSlots.value).toBe(4)
  })

  it('placeholderSlots = max(0, maxImages - images.length - 1)', () => {
    const store = makeStore([makeImage('a')])
    const { api } = mountComposable(() =>
      useImageEditor({ store, minImages: 0, maxImages: 6 })
    )
    // 6 - 1 - 1 = 4 placeholder slots (leaving 1 for the uploader)
    expect(api().placeholderSlots.value.length).toBe(4)
  })

  it('placeholderSlots clamps to 0 when uploader fills the last slot', () => {
    const store = makeStore([
      makeImage('a'),
      makeImage('b'),
      makeImage('c'),
      makeImage('d'),
      makeImage('e'),
    ])
    const { api } = mountComposable(() =>
      useImageEditor({ store, minImages: 0, maxImages: 6 })
    )
    expect(api().placeholderSlots.value.length).toBe(0)
  })

  it('isDeletable is true only when images.length > minImages', () => {
    const store = makeStore([makeImage('a'), makeImage('b')])
    const { api } = mountComposable(() =>
      useImageEditor({ store, minImages: 2 })
    )
    expect(api().isDeletable.value).toBe(false)
    store.images.push(makeImage('c'))
    expect(api().isDeletable.value).toBe(true)
  })

  it('reacts to maxImages as a getter', () => {
    const store = makeStore([makeImage('a')])
    const max = ref(6)
    const { api } = mountComposable(() =>
      useImageEditor({ store, minImages: 0, maxImages: () => max.value })
    )
    expect(api().remainingSlots.value).toBe(5)
    max.value = 3
    expect(api().remainingSlots.value).toBe(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/images/__tests__/useImageEditor.spec.ts`
Expected: FAIL — module `../composables/useImageEditor` not found.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/images/__tests__/useImageEditor.spec.ts
git commit -m "test(images): failing spec for useImageEditor composable"
```

---

## Task 2: Implement `useImageEditor` composable

**Files:**

- Create: `apps/frontend/src/features/images/composables/useImageEditor.ts`

- [ ] **Step 1: Write the composable**

```ts
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
  type WritableComputedRef,
} from 'vue'
import type { OwnerImage } from '@zod/image/image.dto'
import type { GalleryStore } from '@/features/images/stores/galleryStore'

export interface UseImageEditorOptions {
  store: GalleryStore
  minImages: MaybeRefOrGetter<number>
  maxImages?: MaybeRefOrGetter<number>
  autoLoad?: MaybeRefOrGetter<boolean>
}

export interface UseImageEditorReturn {
  model: WritableComputedRef<OwnerImage[]>
  isRemoving: Ref<Record<string, boolean>>
  error: Ref<string>
  placeholderSlots: ComputedRef<unknown[]>
  remainingSlots: ComputedRef<number>
  isDeletable: ComputedRef<boolean>
  handleDelete: (image: OwnerImage) => Promise<void>
  handleReorder: (event: { moved?: unknown }) => Promise<void>
  checkMove: (evt: { draggedContext: { futureIndex: number } }) => boolean
}

const DEFAULT_MAX_IMAGES = 6

export function useImageEditor(options: UseImageEditorOptions): UseImageEditorReturn {
  const { store } = options

  const isRemoving = ref<Record<string, boolean>>({})
  const error = ref<string>('')

  const model = computed<OwnerImage[]>({
    get: () => store.images,
    set: (val) => {
      store.images = val
    },
  })

  const maxImages = computed(() => toValue(options.maxImages) ?? DEFAULT_MAX_IMAGES)
  const minImages = computed(() => toValue(options.minImages))

  const remainingSlots = computed(() => maxImages.value - model.value.length)

  const placeholderSlots = computed(() => {
    const remaining = Math.max(0, maxImages.value - model.value.length - 1)
    return Array.from({ length: remaining })
  })

  const isDeletable = computed(() => model.value.length > minImages.value)

  async function handleDelete(image: OwnerImage): Promise<void> {
    isRemoving.value[image.id] = true
    const res = await store.remove(image)
    if (!res.success) {
      error.value = res.message
      isRemoving.value[image.id] = false
    }
  }

  async function handleReorder(event: { moved?: unknown }): Promise<void> {
    if (!event.moved) return
    const newOrder = model.value.map((img, position) => ({
      id: img.id,
      position,
    }))
    await store.reorder(newOrder)
  }

  function checkMove(evt: { draggedContext: { futureIndex: number } }): boolean {
    return evt.draggedContext.futureIndex < model.value.length
  }

  onMounted(async () => {
    if (toValue(options.autoLoad) === true) {
      await store.load()
    }
  })

  onUnmounted(() => {
    // Fire-and-forget: Vue does not await lifecycle hooks. cleanup() is
    // best-effort internally (Promise.allSettled in the store); the .catch()
    // guards against unhandled promise rejections.
    store.cleanup?.()?.catch(() => {})
  })

  return {
    model,
    isRemoving,
    error,
    placeholderSlots,
    remainingSlots,
    isDeletable,
    handleDelete,
    handleReorder,
    checkMove,
  }
}
```

- [ ] **Step 2: Run the spec and verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/images/__tests__/useImageEditor.spec.ts`
Expected: PASS — all cases green.

- [ ] **Step 3: Format**

```bash
pnpm exec prettier --write apps/frontend/src/features/images/composables/useImageEditor.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/images/composables/useImageEditor.ts
git commit -m "feat(images): add useImageEditor composable"
```

---

## Task 3: Refactor `ImageEditor.vue` to use the composable

**Files:**

- Modify: `apps/frontend/src/features/images/components/ImageEditor.vue`

- [ ] **Step 1: Replace the file content**

```vue
<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { VueDraggableNext } from 'vue-draggable-next'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from 'vue-i18n'

import type { GalleryStore } from '@/features/images/stores/galleryStore'
import { useImageEditor } from '@/features/images/composables/useImageEditor'

import ImageUpload from './ImageUpload.vue'
import ImageTag from './ImageTag.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'

const props = withDefaults(
  defineProps<{
    store: GalleryStore
    minImages: number
    maxImages?: number
  }>(),
  {
    maxImages: 6,
  }
)

const { t } = useI18n()

const {
  model,
  isRemoving,
  placeholderSlots,
  remainingSlots,
  isDeletable,
  handleDelete,
  handleReorder,
  checkMove,
} = useImageEditor({
  store: props.store,
  minImages: () => props.minImages,
  maxImages: () => props.maxImages,
  autoLoad: true,
})
</script>

<template>
  <div class="image-editor">
    <div class="row">
      <div class="col-sm-12">
        <VueDraggableNext
          class="row row-cols-2 row-cols-sm-3 g-4 mx-4 sortable-grid"
          v-model="model"
          ghost-class="ghost"
          :sort="true"
          :filter="'.nodrag'"
          :dragoverBubble="true"
          :move="checkMove"
          @change="handleReorder"
        >
          <div
            v-for="img in model"
            :key="img.id"
            class="col thumbnail"
            :id="img.id"
          >
            <div class="actions nodrag">
              <button
                class="btn btn-sm btn-secondary "
                @mousedown.stop.prevent
                @click="handleDelete(img)"
                :disabled="isRemoving[img.id]"
                v-if="isDeletable"
                :title="t('profiles.image_editor.delete_button_title')"
              >
                <FontAwesomeIcon :icon="faXmark" />
              </button>
            </div>
            <div :class="{ removing: isRemoving[img.id] }">
              <div class="ratio ratio-1x1">
                <ImageTag
                  :image="img"
                  className="rounded"
                  variant="card"
                />
              </div>
            </div>
          </div>
          <div
            v-if="remainingSlots > 0"
            class="col nodrag"
          >
            <ImageUpload :store="props.store" />
          </div>

          <div
            v-for="(_, i) in placeholderSlots"
            :key="'placeholder-' + i"
            class="col nodrag"
          >
            <div class="opacity-25 placeholder ratio ratio-1x1 bg-light rounded">
              <IconPhoto class="svg-icon-100" />
            </div>
          </div>
        </VueDraggableNext>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
img {
  object-fit: cover;
}

.removing {
  opacity: 0.2;
}

.thumbnail {
  position: relative;
}

.actions {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  z-index: 1;
}

.actions {
  .btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.sortable-chosen {
  opacity: 0.3;
}

.sortable-chosen,
.fade-enter-from,
.fade-leave-to {
  opacity: 0.4;
  transform: translateY(10px);
}

.ghost,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

/* For reordering */
.sortable-grid {
  transition: transform 0.3s ease;
}

.fade-move {
  transition: transform 0.3s ease;
}
</style>
```

- [ ] **Step 2: Sanity check — composable spec still green and frontend still type-checks**

Run: `pnpm --filter frontend exec vitest run src/features/images/__tests__/useImageEditor.spec.ts`
Expected: PASS.

Run: `pnpm --filter frontend exec vue-tsc --noEmit -p tsconfig.json` (or `pnpm type-check`)
Expected: no new errors (pre-existing zod deprecation warnings are unrelated to this PR).

- [ ] **Step 3: Run any existing ImageEditor-related specs**

Run: `pnpm --filter frontend exec vitest run src/features/images/__tests__/`
Expected: existing tests pass; `ContentImageButton.spec.ts` still passes because it stubs `ImageEditor`.

- [ ] **Step 4: Format + commit**

```bash
pnpm exec prettier --write apps/frontend/src/features/images/components/ImageEditor.vue
git add apps/frontend/src/features/images/components/ImageEditor.vue
git commit -m "refactor(images): make ImageEditor render-only via useImageEditor"
```

---

## Task 4: Failing spec for `AttachImageButton`

**Files:**

- Create: `apps/frontend/src/features/images/__tests__/AttachImageButton.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
  safeApiCall: vi.fn((fn) => fn()),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k.split('.').pop() ?? k }),
}))

vi.mock('@/assets/icons/interface/photo.svg', () => ({ default: { name: 'IconPhoto' } }))

import AttachImageButton from '../components/AttachImageButton.vue'

const stubs = {
  BFormGroup: { template: '<div><slot /></div>' },
  BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  BModal: {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /></div>',
  },
  ImageEditor: {
    props: ['store', 'minImages', 'maxImages'],
    template: '<div data-test="image-editor" :data-max-images="maxImages"/>',
  },
  ImageTag: {
    template: '<img data-test="thumb" :src="image?.variants?.[0]?.url" />',
    props: ['image', 'variant', 'className'],
  },
  IconPhoto: { template: '<span class="icon-photo"/>' },
  FontAwesomeIcon: { template: '<span class="fa-icon"/>' },
}

const mountWith = (props: Record<string, unknown> = {}) =>
  mount(AttachImageButton, { props, global: { stubs } })

const mockImages = [
  {
    id: 'ckabcdefghijklmnopqrstu01',
    mimeType: 'image/jpeg',
    altText: '',
    position: 0,
    blurhash: 'L0',
    variants: [{ size: 'thumb', url: '/x' }],
  },
  {
    id: 'ckabcdefghijklmnopqrstu02',
    mimeType: 'image/jpeg',
    altText: '',
    position: 1,
    blurhash: 'L0',
    variants: [{ size: 'thumb', url: '/y' }],
  },
]

describe('AttachImageButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders an Images button with label', () => {
    const wrapper = mountWith()
    expect(wrapper.text()).toContain('label')
  })

  it('opens the modal with the editor when the Images button is clicked', async () => {
    const wrapper = mountWith()
    // First button is the IconPhoto BButton (modal opener)
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('[data-test="image-editor"]').exists()).toBe(true)
  })

  it('exposes getImageIds reflecting the underlying store images', () => {
    const wrapper = mountWith({ contentId: 'content-1' })
    const vm = wrapper.vm as any
    expect(vm.getImageIds()).toEqual([])
  })

  it('exposes markSaved which clears the store', () => {
    const wrapper = mountWith()
    const vm = wrapper.vm as any
    expect(typeof vm.markSaved).toBe('function')
    vm.markSaved()
    expect(vm.getImageIds()).toEqual([])
  })

  it('loads images on mount when contentId is provided', () => {
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: [] } })
    mountWith({ contentId: 'content-1' })
    expect(api.get).toHaveBeenCalledWith('/content/content-1/image')
  })

  it('does not load on mount in draft mode (no contentId)', () => {
    mountWith()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('forwards maxImages to ImageEditor', async () => {
    const wrapper = mountWith({ maxImages: 4 })
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('[data-test="image-editor"]').attributes('data-max-images')).toBe('4')
  })

  it('defaults maxImages to MAX_IMAGES_PER_GALLERY (6)', async () => {
    const wrapper = mountWith()
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('[data-test="image-editor"]').attributes('data-max-images')).toBe('6')
  })

  it('renders a thumbnail for each store image', async () => {
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: mockImages } })
    const wrapper = mountWith({ contentId: 'content-1' })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('[data-test="thumb"]')).toHaveLength(2)
  })

  it('clicking a thumbnail opens the modal', async () => {
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: mockImages } })
    const wrapper = mountWith({ contentId: 'content-1' })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="image-editor"]').exists()).toBe(false)
    const thumbWrappers = wrapper.findAll('[data-test="thumb-wrap"]')
    expect(thumbWrappers.length).toBeGreaterThan(0)
    await thumbWrappers[0]!.trigger('click')
    expect(wrapper.find('[data-test="image-editor"]').exists()).toBe(true)
  })

  it('clicking the X overlay deletes the image without opening the modal', async () => {
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: mockImages } })
    // remove → DELETE /image/:id, then reload returns empty
    ;(api.delete as any).mockResolvedValue({ data: { success: true } })
    let loadCall = 0
    ;(api.get as any).mockImplementation(() => {
      loadCall += 1
      return Promise.resolve({
        data: {
          success: true,
          images: loadCall === 1 ? mockImages : [mockImages[1]],
        },
      })
    })
    const wrapper = mountWith({ contentId: 'content-1' })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    const xButtons = wrapper.findAll('[data-test="thumb-remove"]')
    expect(xButtons.length).toBe(2)
    await xButtons[0]!.trigger('click')
    expect(api.delete).toHaveBeenCalledWith('/image/ckabcdefghijklmnopqrstu01')
    expect(wrapper.find('[data-test="image-editor"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/images/__tests__/AttachImageButton.spec.ts`
Expected: FAIL — module `../components/AttachImageButton.vue` not found.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/images/__tests__/AttachImageButton.spec.ts
git commit -m "test(images): failing spec for AttachImageButton"
```

---

## Task 5: Implement `AttachImageButton.vue`

**Files:**

- Create: `apps/frontend/src/features/images/components/AttachImageButton.vue`

- [ ] **Step 1: Write the component**

```vue
<script setup lang="ts">
import { ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

import { useUserContentImageStore } from '@/features/images/stores/userContentImageStore'
import { useImageEditor } from '@/features/images/composables/useImageEditor'
import ImageEditor from '@/features/images/components/ImageEditor.vue'
import ImageTag from '@/features/images/components/ImageTag.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'
import { MAX_IMAGES_PER_GALLERY } from '@zod/image/image.dto'

const props = withDefaults(
  defineProps<{ contentId?: string; maxImages?: number }>(),
  { maxImages: MAX_IMAGES_PER_GALLERY }
)
const { t } = useI18n()

const draftKey = useId()
const store = props.contentId
  ? useUserContentImageStore({ contentId: props.contentId })
  : useUserContentImageStore({ draftKey })

const { isRemoving, handleDelete } = useImageEditor({
  store,
  minImages: 0,
  maxImages: () => props.maxImages,
  autoLoad: () => !!props.contentId,
})

const showModal = ref(false)

defineExpose({
  getImageIds: () => store.images.map((i) => i.id),
  markSaved: () => store.$reset(),
})
</script>

<template>
  <BFormGroup>
    <div class="d-flex align-items-center flex-wrap gap-2">
      <BButton
        variant="link-secondary"
        @click="showModal = true"
      >
        <IconPhoto class="svg-icon me-2" />
        {{ t('userContent.image_button.label') }}
      </BButton>
      <div
        v-for="img in store.images"
        :key="img.id"
        class="attach-image-button__thumb"
        :class="{ removing: isRemoving[img.id] }"
      >
        <button
          type="button"
          data-test="thumb-wrap"
          class="attach-image-button__thumb-button"
          :aria-label="t('userContent.image_button.modal_title')"
          @click="showModal = true"
        >
          <ImageTag
            :image="img"
            variant="thumb"
            className="rounded"
          />
        </button>
        <button
          type="button"
          data-test="thumb-remove"
          class="attach-image-button__thumb-remove btn btn-sm btn-secondary"
          :disabled="isRemoving[img.id]"
          :title="t('profiles.image_editor.delete_button_title')"
          @click.stop="handleDelete(img)"
        >
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
    </div>
    <BModal
      v-model="showModal"
      size="lg"
      :title="t('userContent.image_button.modal_title')"
    >
      <ImageEditor
        :store="store"
        :minImages="0"
        :maxImages="props.maxImages"
      />
    </BModal>
  </BFormGroup>
</template>

<style scoped lang="scss">
.attach-image-button__thumb {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;

  &.removing {
    opacity: 0.4;
  }
}

.attach-image-button__thumb-button {
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: hidden;
  border-radius: 0.375rem;

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.attach-image-button__thumb-remove {
  position: absolute;
  top: -0.4rem;
  right: -0.4rem;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.attach-image-button__thumb:hover .attach-image-button__thumb-remove,
.attach-image-button__thumb-remove:focus-visible {
  opacity: 1;
}
</style>
```

- [ ] **Step 2: Run the spec**

Run: `pnpm --filter frontend exec vitest run src/features/images/__tests__/AttachImageButton.spec.ts`
Expected: PASS.

- [ ] **Step 3: Format + commit**

```bash
pnpm exec prettier --write apps/frontend/src/features/images/components/AttachImageButton.vue
git add apps/frontend/src/features/images/components/AttachImageButton.vue
git commit -m "feat(images): add AttachImageButton with inline thumb roll + X-overlay delete"
```

---

## Task 6: Swap `ContentImageButton` → `AttachImageButton` in `SendMessageForm.vue`

**Files:**

- Modify: `apps/frontend/src/features/messaging/components/SendMessageForm.vue:22,58,236`

- [ ] **Step 1: Replace the import**

Change line 22 from:

```ts
import ContentImageButton from '@/features/images/components/ContentImageButton.vue'
```

to:

```ts
import AttachImageButton from '@/features/images/components/AttachImageButton.vue'
```

- [ ] **Step 2: Replace the template-ref type**

Change line 58 from:

```ts
const imageButtonRef = ref<InstanceType<typeof ContentImageButton> | null>(null)
```

to:

```ts
const imageButtonRef = ref<InstanceType<typeof AttachImageButton> | null>(null)
```

- [ ] **Step 3: Replace the template tag**

Change the block at line 236 from:

```vue
<ContentImageButton
  ref="imageButtonRef"
  :max-images="MAX_IMAGES_PER_MESSAGE"
/>
```

to:

```vue
<AttachImageButton
  ref="imageButtonRef"
  :max-images="MAX_IMAGES_PER_MESSAGE"
/>
```

- [ ] **Step 4: Verify type-check + relevant tests**

```bash
pnpm --filter frontend exec vue-tsc --noEmit -p tsconfig.json
pnpm --filter frontend exec vitest run src/features/messaging
```

Expected: no new type errors; messaging tests pass.

- [ ] **Step 5: Format + commit**

```bash
pnpm exec prettier --write apps/frontend/src/features/messaging/components/SendMessageForm.vue
git add apps/frontend/src/features/messaging/components/SendMessageForm.vue
git commit -m "refactor(messaging): use AttachImageButton in SendMessageForm"
```

---

## Task 7: Swap `ContentImageButton` → `AttachImageButton` in `EditPostDialog.vue`

**Files:**

- Modify: `apps/frontend/src/features/posts/components/EditPostDialog.vue:22,54,153`

- [ ] **Step 1: Replace the import**

Change line 22 from:

```ts
import ContentImageButton from '@/features/images/components/ContentImageButton.vue'
```

to:

```ts
import AttachImageButton from '@/features/images/components/AttachImageButton.vue'
```

- [ ] **Step 2: Replace the template-ref type**

Change line 54 from:

```ts
const imageBtn = ref<InstanceType<typeof ContentImageButton> | null>(null)
```

to:

```ts
const imageBtn = ref<InstanceType<typeof AttachImageButton> | null>(null)
```

- [ ] **Step 3: Replace the template tag**

In the template at line 153, change the opening tag `<ContentImageButton` to `<AttachImageButton` (preserve all attributes/props as-is). If there is a corresponding closing `</ContentImageButton>`, rename it too.

- [ ] **Step 4: Verify**

```bash
pnpm --filter frontend exec vue-tsc --noEmit -p tsconfig.json
pnpm --filter frontend exec vitest run src/features/posts
```

Expected: no new type errors; posts tests pass.

- [ ] **Step 5: Format + commit**

```bash
pnpm exec prettier --write apps/frontend/src/features/posts/components/EditPostDialog.vue
git add apps/frontend/src/features/posts/components/EditPostDialog.vue
git commit -m "refactor(posts): use AttachImageButton in EditPostDialog"
```

---

## Task 8: Swap `ContentImageButton` → `AttachImageButton` in `EditEventDialog.vue`

**Files:**

- Modify: `apps/frontend/src/features/events/components/EditEventDialog.vue:13,67,190`

- [ ] **Step 1: Replace the import**

Change line 13 from:

```ts
import ContentImageButton from '@/features/images/components/ContentImageButton.vue'
```

to:

```ts
import AttachImageButton from '@/features/images/components/AttachImageButton.vue'
```

- [ ] **Step 2: Replace the template-ref type**

Change line 67 from:

```ts
const imageBtn = ref<InstanceType<typeof ContentImageButton> | null>(null)
```

to:

```ts
const imageBtn = ref<InstanceType<typeof AttachImageButton> | null>(null)
```

- [ ] **Step 3: Replace the template tag**

In the template at line 190, change the opening tag `<ContentImageButton` to `<AttachImageButton` (preserve all attributes/props as-is). Rename the closing tag too if present.

- [ ] **Step 4: Verify**

```bash
pnpm --filter frontend exec vue-tsc --noEmit -p tsconfig.json
pnpm --filter frontend exec vitest run src/features/events
```

Expected: no new type errors; events tests pass.

- [ ] **Step 5: Format + commit**

```bash
pnpm exec prettier --write apps/frontend/src/features/events/components/EditEventDialog.vue
git add apps/frontend/src/features/events/components/EditEventDialog.vue
git commit -m "refactor(events): use AttachImageButton in EditEventDialog"
```

---

## Task 9: Swap `ContentImageButton` → `AttachImageButton` in `EditCommunityDialog.vue`

**Files:**

- Modify: `apps/frontend/src/features/community/components/EditCommunityDialog.vue:10,55,154`

- [ ] **Step 1: Replace the import**

Change line 10 from:

```ts
import ContentImageButton from '@/features/images/components/ContentImageButton.vue'
```

to:

```ts
import AttachImageButton from '@/features/images/components/AttachImageButton.vue'
```

- [ ] **Step 2: Replace the template-ref type**

Change line 55 from:

```ts
const imageBtn = ref<InstanceType<typeof ContentImageButton> | null>(null)
```

to:

```ts
const imageBtn = ref<InstanceType<typeof AttachImageButton> | null>(null)
```

- [ ] **Step 3: Replace the template tag**

In the template at line 154, change the opening tag `<ContentImageButton` to `<AttachImageButton` (preserve all attributes/props as-is). Rename the closing tag too if present.

- [ ] **Step 4: Verify**

```bash
pnpm --filter frontend exec vue-tsc --noEmit -p tsconfig.json
pnpm --filter frontend exec vitest run src/features/community
```

Expected: no new type errors; community tests pass.

- [ ] **Step 5: Format + commit**

```bash
pnpm exec prettier --write apps/frontend/src/features/community/components/EditCommunityDialog.vue
git add apps/frontend/src/features/community/components/EditCommunityDialog.vue
git commit -m "refactor(community): use AttachImageButton in EditCommunityDialog"
```

---

## Task 10: Delete `ContentImageButton.vue` and update docstring

**Files:**

- Delete: `apps/frontend/src/features/images/components/ContentImageButton.vue`
- Delete: `apps/frontend/src/features/images/__tests__/ContentImageButton.spec.ts`
- Modify: `apps/frontend/src/features/images/stores/userContentImageStore.ts:26`

- [ ] **Step 1: Confirm there are no remaining importers**

Run:

```bash
grep -rn "ContentImageButton" apps/frontend/src
```

Expected output: empty (no matches).

If anything matches, stop and fix that caller before proceeding.

- [ ] **Step 2: Delete the files**

```bash
git rm apps/frontend/src/features/images/components/ContentImageButton.vue
git rm apps/frontend/src/features/images/__tests__/ContentImageButton.spec.ts
```

- [ ] **Step 3: Update the docstring**

In `apps/frontend/src/features/images/stores/userContentImageStore.ts`, change the comment block at line 26:

From:

```
 * `cleanup()` (called by ImageEditor.onUnmounted).
```

To:

```
 * `cleanup()` (called by useImageEditor's onUnmounted hook).
```

- [ ] **Step 4: Re-run the full image suite + type-check**

```bash
pnpm --filter frontend exec vitest run src/features/images
pnpm --filter frontend exec vue-tsc --noEmit -p tsconfig.json
```

Expected: all pass; no new type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/images/stores/userContentImageStore.ts
git commit -m "chore(images): remove ContentImageButton, replaced by AttachImageButton"
```

---

## Task 11: Add changeset

**Files:**

- Create: `.changeset/attach-image-button-refactor.md`

- [ ] **Step 1: Write the changeset**

```bash
cat > .changeset/attach-image-button-refactor.md << 'EOF'
---
'@opencupid/frontend': patch
---

Extract ImageEditor logic into a useImageEditor composable and introduce
AttachImageButton, replacing ContentImageButton across messaging, posts,
events, and communities. Inline thumbnails now expose a hover X-overlay
for quick removal without opening the modal.
EOF
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/attach-image-button-refactor.md
git commit -m "chore(changeset): AttachImageButton refactor"
```

---

## Task 12: Final verification — full frontend suite + lint + type-check

- [ ] **Step 1: Frontend tests**

Run: `pnpm --filter frontend test`
Expected: all green.

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: no errors introduced by this PR (pre-existing zod deprecation warnings in `event.dto.ts` / `community.dto.ts` / `send-reminder.ts` / `image.service.ts` are unrelated and out of scope).

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 4: Manual smoke (optional but recommended)**

```bash
pnpm dev
```

Open <https://localhost:5173/home>, log in via Mailpit (<http://localhost:1080/>), then:

1. `/inbox/:conversationId` → SendMessageForm: attach an image, see it as an inline thumb, hover the X, click to remove without opening the modal.
2. `/posts` → EditPostDialog: open the AttachImageButton modal, add images, reorder via drag — verify reorder still works inside the modal.
3. Repeat (2) for events and communities edit dialogs.

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin feat/attach-image-button
gh pr create --title "refactor(images): extract useImageEditor composable + introduce AttachImageButton" --body "$(cat <<'EOF'
## Summary
- Extract `ImageEditor.vue` logic into a `useImageEditor` composable (load/cleanup lifecycle, slot math, delete/reorder handlers).
- `ImageEditor.vue` is now a render-only thin wrapper around the composable.
- Introduce `AttachImageButton.vue`: inline `IconPhoto` button + thumbnail roll with hover-revealed X-overlay for quick delete; modal still hosts the full (drag-reorderable) `ImageEditor` for the editing UX.
- Replace `ContentImageButton.vue` at all four call sites (messaging, posts, events, communities) and delete it.

## Test plan
- [ ] Frontend Vitest suite passes (`pnpm --filter frontend test`).
- [ ] `pnpm type-check` clean (existing zod deprecation warnings are unrelated).
- [ ] Manual smoke: attach + remove inline in SendMessageForm; modal reorder still works in EditPostDialog / EditEventDialog / EditCommunityDialog.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage**

- `useImageEditor` composable spec'd in Task 1, implemented in Task 2 — covers all options (`store`, `minImages`, `maxImages`, `autoLoad`) and return surface (`model`, `isRemoving`, `error`, `placeholderSlots`, `remainingSlots`, `isDeletable`, `handleDelete`, `handleReorder`, `checkMove`).
- `ImageEditor.vue` becomes render-only in Task 3, preserving template and drag-reorder grid.
- `AttachImageButton.vue` spec'd in Task 4, implemented in Task 5 — props match `ContentImageButton`, exposes `getImageIds()` / `markSaved()`, conditional load via `autoLoad: () => !!props.contentId`, hover X-overlay for delete, modal hosts `ImageEditor`.
- Four call-site swaps in Tasks 6–9 (one per dialog/form).
- `ContentImageButton.vue` + spec deleted in Task 10; docstring updated in `userContentImageStore.ts`.
- Changeset added in Task 11.

**Placeholder scan:** No TBD / "add appropriate X" / "similar to Task N" placeholders. Every code-changing step shows the actual code or exact lines to change.

**Type/method consistency**

- `UseImageEditorOptions` field names (`store`, `minImages`, `maxImages`, `autoLoad`) are consistent across Tasks 1, 2, 3, 5.
- `handleDelete(image)`, `handleReorder(event)`, `checkMove(evt)` signatures match between Task 1's spec and Task 2's implementation.
- Exposed methods on `AttachImageButton` (`getImageIds`, `markSaved`) match `ContentImageButton`'s contract, so the four call sites need no logic changes — only an import/tag/type rename (verified by inspecting all four files before plan was written).
- Test stubs in Task 4 add `data-test="thumb-wrap"` and `data-test="thumb-remove"` markers; the component in Task 5 emits exactly those `data-test` attributes.
- `data-test="image-editor"` stub for `ImageEditor` is consistent with the same stub used in the original `ContentImageButton.spec.ts`.

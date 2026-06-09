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

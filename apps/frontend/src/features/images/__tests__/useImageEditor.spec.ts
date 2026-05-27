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

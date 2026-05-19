import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '@/lib/api'
import { useUserContentImageStore } from '../stores/userContentImageStore'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
  axios: { isAxiosError: vi.fn(() => false) },
  safeApiCall: vi.fn((fn) => fn()),
}))

const CREATED = {
  id: 'ckabcdefghijklmnopqrstuvw',
  mimeType: 'image/jpeg',
  altText: 'cap',
  position: 0,
  blurhash: 'L0',
  variants: [{ size: 'original', url: '/x' }],
}

describe('useUserContentImageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('load() GETs /content/:id/image and stores the result', async () => {
    ;(api.get as any).mockResolvedValue({
      data: {
        success: true,
        images: [
          {
            id: 'ckabcdefghijklmnopqrstuvw',
            mimeType: 'image/jpeg',
            altText: '',
            position: 0,
            blurhash: 'L0',
            variants: [{ size: 'original', url: '/x' }],
          },
        ],
      },
    })
    const store = useUserContentImageStore({ contentId: 'content-1' })
    const res = await store.load()
    expect(res.success).toBe(true)
    expect(api.get).toHaveBeenCalledWith('/content/content-1/image')
    expect(store.images).toHaveLength(1)
  })

  it('upload() calls POST /image then POST /content/:id/image/attach', async () => {
    ;(api.post as any)
      .mockResolvedValueOnce({ data: { success: true, image: CREATED } })
      .mockResolvedValueOnce({ data: { success: true, images: [CREATED] } })

    const store = useUserContentImageStore({ contentId: 'content-1' })
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    const res = await store.upload(file, 'cap')

    expect(res.success).toBe(true)
    expect((api.post as any).mock.calls[0][0]).toBe('/image')
    expect((api.post as any).mock.calls[0][1]).toBeInstanceOf(FormData)
    expect((api.post as any).mock.calls[1]).toEqual([
      '/content/content-1/image/attach',
      { imageId: CREATED.id },
    ])
    expect(store.images).toHaveLength(1)
  })

  it('upload() compensates with DELETE /image/:id when attach fails', async () => {
    ;(api.post as any)
      .mockResolvedValueOnce({ data: { success: true, image: CREATED } })
      .mockRejectedValueOnce(new Error('attach failed'))
    ;(api.delete as any).mockResolvedValue({ data: { success: true, images: [] } })

    const store = useUserContentImageStore({ contentId: 'content-1' })
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    const res = await store.upload(file, 'cap')

    expect(res.success).toBe(false)
    expect(api.delete).toHaveBeenCalledWith(`/image/${CREATED.id}`)
  })

  it('upload() does NOT call DELETE when create fails', async () => {
    ;(api.post as any).mockRejectedValueOnce(new Error('create failed'))

    const store = useUserContentImageStore({ contentId: 'content-1' })
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    const res = await store.upload(file, 'cap')

    expect(res.success).toBe(false)
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('reorder() PATCHes /content/:id/image/order', async () => {
    ;(api.patch as any).mockResolvedValue({ data: { success: true, images: [] } })
    const store = useUserContentImageStore({ contentId: 'content-1' })
    await store.reorder([{ id: 'i1', position: 0 }])
    expect(api.patch).toHaveBeenCalledWith('/content/content-1/image/order', {
      images: [{ id: 'i1', position: 0 }],
    })
  })

  it('remove() DELETEs /image/:id (unified endpoint)', async () => {
    ;(api.delete as any).mockResolvedValue({ data: { success: true, images: [] } })
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: [] } })
    const store = useUserContentImageStore({ contentId: 'content-1' })
    await store.remove({ id: 'i1' } as any)
    expect(api.delete).toHaveBeenCalledWith('/image/i1')
  })
})

describe('draft mode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('load() is a no-op (no network call, returns success, images empty)', async () => {
    const store = useUserContentImageStore({ draftKey: 'k1' })
    const res = await store.load()
    expect(res.success).toBe(true)
    expect(api.get).not.toHaveBeenCalled()
    expect(store.images).toEqual([])
  })
})

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

  it('upload() POSTs /image only, stages the image locally', async () => {
    ;(api.post as any).mockResolvedValueOnce({ data: { success: true, image: CREATED } })

    const store = useUserContentImageStore({ draftKey: 'k2' })
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    const res = await store.upload(file, 'cap')

    expect(res.success).toBe(true)
    expect((api.post as any).mock.calls).toHaveLength(1)
    expect((api.post as any).mock.calls[0][0]).toBe('/image')
    expect(store.images).toHaveLength(1)
    expect(store.images[0]!.id).toBe(CREATED.id)
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('upload() does NOT call DELETE in draft mode when no second step exists', async () => {
    ;(api.post as any).mockRejectedValueOnce(new Error('upload failed'))

    const store = useUserContentImageStore({ draftKey: 'k3' })
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    const res = await store.upload(file, 'cap')

    expect(res.success).toBe(false)
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('remove() DELETEs /image/:id and removes from local images (no load follow-up)', async () => {
    ;(api.delete as any).mockResolvedValue({ data: { success: true } })
    ;(api.post as any).mockResolvedValueOnce({ data: { success: true, image: CREATED } })

    const store = useUserContentImageStore({ draftKey: 'k4' })
    await store.upload(new File(['x'], 'x.jpg'), 'cap')
    expect(store.images).toHaveLength(1)

    const removeRes = await store.remove(CREATED as any)
    expect(removeRes.success).toBe(true)
    expect(api.delete).toHaveBeenCalledWith(`/image/${CREATED.id}`)
    expect(store.images).toHaveLength(0)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('reorder() permutes local images, no network call', async () => {
    const ID1 = 'ckabcdefghijklmnopqrstu01'
    const ID2 = 'ckabcdefghijklmnopqrstu02'
    ;(api.post as any)
      .mockResolvedValueOnce({ data: { success: true, image: { ...CREATED, id: ID1 } } })
      .mockResolvedValueOnce({ data: { success: true, image: { ...CREATED, id: ID2 } } })

    const store = useUserContentImageStore({ draftKey: 'k5' })
    await store.upload(new File(['x'], 'x.jpg'), 'cap')
    await store.upload(new File(['y'], 'y.jpg'), 'cap')
    expect(store.images.map((i) => i.id)).toEqual([ID1, ID2])

    const res = await store.reorder([
      { id: ID2, position: 0 },
      { id: ID1, position: 1 },
    ])
    expect(res.success).toBe(true)
    expect(store.images.map((i) => i.id)).toEqual([ID2, ID1])
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('cleanup() best-effort DELETEs each staged image; survives a failure', async () => {
    ;(api.post as any)
      .mockResolvedValueOnce({
        data: { success: true, image: { ...CREATED, id: 'ckabcdefghijklmnopqrstu01' } },
      })
      .mockResolvedValueOnce({
        data: { success: true, image: { ...CREATED, id: 'ckabcdefghijklmnopqrstu02' } },
      })
    ;(api.delete as any)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ data: { success: true } })

    const store = useUserContentImageStore({ draftKey: 'k6' })
    await store.upload(new File(['x'], 'x.jpg'), 'cap')
    await store.upload(new File(['y'], 'y.jpg'), 'cap')

    await store.cleanup()
    expect(api.delete).toHaveBeenCalledTimes(2)
    expect(api.delete).toHaveBeenCalledWith('/image/ckabcdefghijklmnopqrstu01')
    expect(api.delete).toHaveBeenCalledWith('/image/ckabcdefghijklmnopqrstu02')
  })

  it('cleanup() is a no-op in attached mode', async () => {
    const store = useUserContentImageStore({ contentId: 'content-1' })
    await store.cleanup()
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('cleanup() after $reset is a no-op (no DELETEs)', async () => {
    ;(api.post as any).mockResolvedValueOnce({ data: { success: true, image: CREATED } })
    const store = useUserContentImageStore({ draftKey: 'k7' })
    await store.upload(new File(['x'], 'x.jpg'), 'cap')
    store.$reset()
    await store.cleanup()
    expect(api.delete).not.toHaveBeenCalled()
  })
})

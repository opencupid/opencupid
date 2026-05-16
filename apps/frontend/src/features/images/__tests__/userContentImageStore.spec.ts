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
    const store = useUserContentImageStore('content-1')
    const res = await store.load()
    expect(res.success).toBe(true)
    expect(api.get).toHaveBeenCalledWith('/content/content-1/image')
    expect(store.images).toHaveLength(1)
  })

  it('upload() POSTs to /content/:id/image with multipart payload', async () => {
    ;(api.post as any).mockResolvedValue({
      data: { success: true, images: [] },
    })
    const store = useUserContentImageStore('content-1')
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    await store.upload(file, 'cap')
    expect(api.post).toHaveBeenCalledWith('/content/content-1/image', expect.any(FormData))
  })

  it('reorder() PATCHes /content/:id/image/order', async () => {
    ;(api.patch as any).mockResolvedValue({ data: { success: true, images: [] } })
    const store = useUserContentImageStore('content-1')
    await store.reorder([{ id: 'i1', position: 0 }])
    expect(api.patch).toHaveBeenCalledWith('/content/content-1/image/order', {
      images: [{ id: 'i1', position: 0 }],
    })
  })

  it('remove() DELETEs /image/:id (unified endpoint)', async () => {
    ;(api.delete as any).mockResolvedValue({ data: { success: true, images: [] } })
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: [] } })
    const store = useUserContentImageStore('content-1')
    await store.remove({ id: 'i1' } as any)
    expect(api.delete).toHaveBeenCalledWith('/image/i1')
  })
})

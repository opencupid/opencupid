import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '@/lib/api'
import { useProfileImageStore } from '../stores/profileImageStore'

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

vi.mock('@/lib/bus', () => ({ bus: { on: vi.fn() } }))

const CREATED = {
  id: 'ckabcdefghijklmnopqrstuvw',
  mimeType: 'image/jpeg',
  altText: 'cap',
  position: 0,
  blurhash: 'L0',
  variants: [{ size: 'original', url: '/x' }],
}

describe('useProfileImageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('upload() calls POST /image then POST /image/me/attach', async () => {
    ;(api.post as any)
      .mockResolvedValueOnce({ data: { success: true, image: CREATED } })
      .mockResolvedValueOnce({ data: { success: true, images: [CREATED] } })

    const store = useProfileImageStore()
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    const res = await store.upload(file, 'cap')

    expect(res.success).toBe(true)
    expect((api.post as any).mock.calls[0][0]).toBe('/image')
    expect((api.post as any).mock.calls[0][1]).toBeInstanceOf(FormData)
    expect((api.post as any).mock.calls[1]).toEqual(['/image/me/attach', { imageId: CREATED.id }])
    expect(store.images).toHaveLength(1)
  })

  it('upload() compensates with DELETE /image/:id when attach fails', async () => {
    ;(api.post as any)
      .mockResolvedValueOnce({ data: { success: true, image: CREATED } })
      .mockRejectedValueOnce(new Error('attach failed'))
    ;(api.delete as any).mockResolvedValue({ data: { success: true, images: [] } })

    const store = useProfileImageStore()
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    const res = await store.upload(file, 'cap')

    expect(res.success).toBe(false)
    expect(api.delete).toHaveBeenCalledWith(`/image/${CREATED.id}`)
  })

  it('upload() does NOT call DELETE when create fails', async () => {
    ;(api.post as any).mockRejectedValueOnce(new Error('create failed'))

    const store = useProfileImageStore()
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    const res = await store.upload(file, 'cap')

    expect(res.success).toBe(false)
    expect(api.delete).not.toHaveBeenCalled()
  })
})

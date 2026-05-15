import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockApi, mockSafeApiCall, mockOwnerProfile } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  mockSafeApiCall: vi.fn((fn: () => Promise<unknown>) => fn()),
  mockOwnerProfile: { value: null as { id: string } | null },
}))

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: mockSafeApiCall,
  axios: { isAxiosError: vi.fn(() => false) },
}))

vi.mock('@/lib/bus', async () => {
  const { default: mitt } = await import('mitt')
  return { bus: mitt() }
})

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({ profile: mockOwnerProfile.value }),
}))

const okResponse = { data: { success: true, images: [] } }

beforeEach(() => {
  setActivePinia(createPinia())
  mockApi.get.mockReset().mockResolvedValue(okResponse)
  mockApi.post.mockReset().mockResolvedValue(okResponse)
  mockApi.patch.mockReset().mockResolvedValue(okResponse)
  mockApi.delete.mockReset().mockResolvedValue(okResponse)
  mockOwnerProfile.value = { id: 'p1' }
})

async function loadStore() {
  const { useImageStore } = await import('../stores/imageStore')
  return useImageStore()
}

describe('imageStore — owner-scoped URLs', () => {
  it('fetchImages hits GET /image/profile/:profileId', async () => {
    const store = await loadStore()
    const res = await store.fetchImages()
    expect(res.success).toBe(true)
    expect(mockApi.get).toHaveBeenCalledWith('/image/profile/p1')
  })

  it('uploadProfileImage hits POST /image/profile/:profileId with FormData', async () => {
    const store = await loadStore()
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    await store.uploadProfileImage(file, 'caption')
    expect(mockApi.post).toHaveBeenCalledWith('/image/profile/p1', expect.any(FormData))
  })

  it('deleteImage hits DELETE /image/profile/:profileId/:imageId', async () => {
    const store = await loadStore()
    await store.deleteImage({ id: 'img-xyz' } as any)
    expect(mockApi.delete).toHaveBeenCalledWith('/image/profile/p1/img-xyz')
  })

  it('reorderImages hits PATCH /image/profile/:profileId/order with items in body', async () => {
    const store = await loadStore()
    const items = [
      { id: 'a', position: 0 },
      { id: 'b', position: 1 },
    ]
    await store.reorderImages(items)
    expect(mockApi.patch).toHaveBeenCalledWith('/image/profile/p1/order', { images: items })
  })
})

describe('imageStore — null profile guard', () => {
  beforeEach(() => {
    mockOwnerProfile.value = null
  })

  it('uploadProfileImage short-circuits when no profile is present', async () => {
    const store = await loadStore()
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    const res = await store.uploadProfileImage(file, '')
    expect(res).toEqual({ success: false, message: 'No profile in session' })
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('fetchImages, deleteImage, reorderImages all short-circuit identically', async () => {
    const store = await loadStore()
    expect(await store.fetchImages()).toEqual({ success: false, message: 'No profile in session' })
    expect(await store.deleteImage({ id: 'i1' } as any)).toEqual({
      success: false,
      message: 'No profile in session',
    })
    expect(await store.reorderImages([])).toEqual({
      success: false,
      message: 'No profile in session',
    })
    expect(mockApi.get).not.toHaveBeenCalled()
    expect(mockApi.delete).not.toHaveBeenCalled()
    expect(mockApi.patch).not.toHaveBeenCalled()
  })
})

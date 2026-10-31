import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: { get: mockGet } }))

import { useTagsStore } from '../tagStore'

describe('tagStore.fetchByIds', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
  })

  it('requests the tags for comma-joined ids', async () => {
    const tags = [{ id: 't1', name: 'hiking', slug: 'hiking' }]
    mockGet.mockResolvedValue({ data: { success: true, tags } })

    const res = await useTagsStore().fetchByIds(['t1', 't2'])

    expect(mockGet).toHaveBeenCalledWith('/tags/by-ids', { params: { ids: 't1,t2' } })
    expect(res).toEqual({ success: true, data: { result: tags } })
  })

  it('returns an error when the request fails', async () => {
    mockGet.mockRejectedValue(new Error('network'))

    const res = await useTagsStore().fetchByIds(['t1'])

    expect(res.success).toBe(false)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { CanceledError } from 'axios'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))
vi.mock('@/lib/api', () => ({
  api: { get: mockGet },
  safeApiCall: (fn: () => any) => fn(),
  isApiOnline: () => Promise.resolve(),
}))

vi.mock('@/lib/bus', () => ({
  bus: { on: vi.fn(), emit: vi.fn() },
}))

import { useSearchStore } from '../searchStore'
import { MAX_BROWSE_TAGS } from '@shared/maps'
import type { PublicTag } from '@zod/tag/tag.dto'

const emptyResults = {
  success: true as const,
  tags: [],
  profiles: [],
  posts: [],
  events: [],
  communities: [],
}

const tag = (id: string, name = id): PublicTag => ({ id, name, slug: id })

describe('useSearchStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with an empty selection', () => {
    const store = useSearchStore()
    expect(store.selectedTags).toEqual([])
    expect(store.selectedTagIds).toEqual([])
  })

  describe('toggleTag', () => {
    it('adds a tag when not present', () => {
      const store = useSearchStore()
      store.toggleTag(tag('t1', 'Vue'))
      expect(store.selectedTagIds).toEqual(['t1'])
    })

    it('removes a tag when already present', () => {
      const store = useSearchStore()
      store.toggleTag(tag('t1'))
      store.toggleTag(tag('t1'))
      expect(store.selectedTagIds).toEqual([])
    })

    it('preserves the full PublicTag object so the filter bar can render the pill', () => {
      const store = useSearchStore()
      store.toggleTag(tag('t1', 'Hiking'))
      expect(store.selectedTags[0]).toEqual({ id: 't1', name: 'Hiking', slug: 't1' })
    })

    it(`refuses to add more than ${MAX_BROWSE_TAGS} tags`, () => {
      const store = useSearchStore()
      for (let i = 0; i < MAX_BROWSE_TAGS + 3; i++) {
        store.toggleTag(tag(`t${i}`))
      }
      expect(store.selectedTags).toHaveLength(MAX_BROWSE_TAGS)
    })
  })

  describe('setTags', () => {
    it('replaces the selection wholesale', () => {
      const store = useSearchStore()
      store.toggleTag(tag('t1'))
      store.setTags([tag('t2'), tag('t3')])
      expect(store.selectedTagIds).toEqual(['t2', 't3'])
    })

    it(`truncates to ${MAX_BROWSE_TAGS} tags`, () => {
      const store = useSearchStore()
      store.setTags(Array.from({ length: MAX_BROWSE_TAGS + 4 }, (_, i) => tag(`t${i}`)))
      expect(store.selectedTags).toHaveLength(MAX_BROWSE_TAGS)
    })
  })

  describe('clearTags / reset', () => {
    it('clearTags empties the selection', () => {
      const store = useSearchStore()
      store.setTags([tag('t1'), tag('t2')])
      store.clearTags()
      expect(store.selectedTags).toEqual([])
    })

    it('reset empties the selection', () => {
      const store = useSearchStore()
      store.setTags([tag('t1'), tag('t2')])
      store.reset()
      expect(store.selectedTags).toEqual([])
    })

    it('reset also clears searchResults', async () => {
      const store = useSearchStore()
      mockGet.mockResolvedValueOnce({ data: emptyResults })
      await store.search('hello')
      expect(store.searchResults).not.toBeNull()

      store.reset()
      expect(store.searchResults).toBeNull()
    })
  })

  describe('search', () => {
    it('starts with searchResults=null', () => {
      const store = useSearchStore()
      expect(store.searchResults).toBeNull()
    })

    it('calls GET /search with the query and parses the response', async () => {
      const store = useSearchStore()
      mockGet.mockResolvedValueOnce({ data: emptyResults })

      const result = await store.search('hiking')

      expect(mockGet).toHaveBeenCalledWith(
        '/search',
        expect.objectContaining({ params: { q: 'hiking' } })
      )
      expect(result.success).toBe(true)
      expect(store.searchResults).toEqual(emptyResults)
    })

    it('stores results from the server', async () => {
      const store = useSearchStore()
      const payload = {
        success: true as const,
        tags: [{ id: 'cltagabc000000000000001', name: 'Hiking', slug: 'hiking' }],
        profiles: [],
        posts: [],
        events: [],
        communities: [],
      }
      mockGet.mockResolvedValueOnce({ data: payload })

      await store.search('hik')

      expect(store.searchResults?.tags).toHaveLength(1)
      expect(store.searchResults?.tags[0]!.name).toBe('Hiking')
    })

    it('treats a canceled request as success and clears results', async () => {
      const store = useSearchStore()
      mockGet.mockResolvedValueOnce({ data: emptyResults })
      await store.search('first')
      expect(store.searchResults).not.toBeNull()

      mockGet.mockRejectedValueOnce(new CanceledError('canceled'))
      const result = await store.search('second')

      expect(result.success).toBe(true)
      expect(store.searchResults).toBeNull()
    })

    it('returns a storeError on non-cancel failures', async () => {
      const store = useSearchStore()
      mockGet.mockRejectedValueOnce(new Error('boom'))

      const result = await store.search('x')

      expect(result.success).toBe(false)
    })

    it('aborts the previous in-flight request on a new call', async () => {
      const store = useSearchStore()
      const signals: AbortSignal[] = []
      mockGet.mockImplementation((_url: string, opts: { signal: AbortSignal }) => {
        signals.push(opts.signal)
        return new Promise((resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(new CanceledError('canceled')))
          // second call resolves; first call never resolves on its own
          if (signals.length === 2) {
            resolve({ data: emptyResults })
          }
        })
      })

      const first = store.search('alpha')
      const second = store.search('beta')

      await Promise.all([first, second])

      expect(signals[0]!.aborted).toBe(true)
      expect(signals[1]!.aborted).toBe(false)
    })
  })
})

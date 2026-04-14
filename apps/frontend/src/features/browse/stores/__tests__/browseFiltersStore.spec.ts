import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/lib/bus', () => ({
  bus: { on: vi.fn(), emit: vi.fn() },
}))

import { useBrowseFiltersStore } from '../browseFiltersStore'
import { MAX_BROWSE_TAGS } from '@shared/maps'
import type { PublicTag } from '@zod/tag/tag.dto'

const tag = (id: string, name = id): PublicTag => ({ id, name, slug: id })

describe('useBrowseFiltersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with an empty selection', () => {
    const store = useBrowseFiltersStore()
    expect(store.selectedTags).toEqual([])
    expect(store.selectedTagIds).toEqual([])
  })

  describe('toggleTag', () => {
    it('adds a tag when not present', () => {
      const store = useBrowseFiltersStore()
      store.toggleTag(tag('t1', 'Vue'))
      expect(store.selectedTagIds).toEqual(['t1'])
    })

    it('removes a tag when already present', () => {
      const store = useBrowseFiltersStore()
      store.toggleTag(tag('t1'))
      store.toggleTag(tag('t1'))
      expect(store.selectedTagIds).toEqual([])
    })

    it('preserves the full PublicTag object so the filter bar can render the pill', () => {
      const store = useBrowseFiltersStore()
      store.toggleTag(tag('t1', 'Hiking'))
      expect(store.selectedTags[0]).toEqual({ id: 't1', name: 'Hiking', slug: 't1' })
    })

    it(`refuses to add more than ${MAX_BROWSE_TAGS} tags`, () => {
      const store = useBrowseFiltersStore()
      for (let i = 0; i < MAX_BROWSE_TAGS + 3; i++) {
        store.toggleTag(tag(`t${i}`))
      }
      expect(store.selectedTags).toHaveLength(MAX_BROWSE_TAGS)
    })
  })

  describe('setTags', () => {
    it('replaces the selection wholesale', () => {
      const store = useBrowseFiltersStore()
      store.toggleTag(tag('t1'))
      store.setTags([tag('t2'), tag('t3')])
      expect(store.selectedTagIds).toEqual(['t2', 't3'])
    })

    it(`truncates to ${MAX_BROWSE_TAGS} tags`, () => {
      const store = useBrowseFiltersStore()
      store.setTags(Array.from({ length: MAX_BROWSE_TAGS + 4 }, (_, i) => tag(`t${i}`)))
      expect(store.selectedTags).toHaveLength(MAX_BROWSE_TAGS)
    })
  })

  describe('clearTags / reset', () => {
    it('clearTags empties the selection', () => {
      const store = useBrowseFiltersStore()
      store.setTags([tag('t1'), tag('t2')])
      store.clearTags()
      expect(store.selectedTags).toEqual([])
    })

    it('reset empties the selection', () => {
      const store = useBrowseFiltersStore()
      store.setTags([tag('t1'), tag('t2')])
      store.reset()
      expect(store.selectedTags).toEqual([])
    })
  })
})

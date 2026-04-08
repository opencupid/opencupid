import { defineStore } from 'pinia'
import { bus } from '@/lib/bus'

/**
 * Ephemeral, client-side filter state for the browse map. State lives only
 * for the session: no persistence to localStorage, sessionStorage, or the
 * backend. Selections reset on page reload and on logout.
 *
 * Currently holds the `selectedTagIds` that are passed into bounds/cluster
 * queries as an optional comma-separated `tagIds` query param. The persistent
 * SocialMatchFilter model has been retired — see the matching refactor in
 * `profileMatch.service.ts` and `findProfile.route.ts`.
 */
interface BrowseFiltersState {
  selectedTagIds: string[]
}

export const useBrowseFiltersStore = defineStore('browseFilters', {
  state: (): BrowseFiltersState => ({
    selectedTagIds: [],
  }),

  actions: {
    toggleTag(id: string) {
      const idx = this.selectedTagIds.indexOf(id)
      if (idx === -1) {
        this.selectedTagIds = [...this.selectedTagIds, id]
      } else {
        this.selectedTagIds = this.selectedTagIds.filter((t) => t !== id)
      }
    },

    setTags(ids: string[]) {
      this.selectedTagIds = [...ids]
    },

    clearTags() {
      this.selectedTagIds = []
    },

    reset() {
      this.selectedTagIds = []
    },
  },
})

bus.on('auth:logout', () => {
  useBrowseFiltersStore().reset()
})

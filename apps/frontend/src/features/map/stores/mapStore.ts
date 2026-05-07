import { defineStore } from 'pinia'
import { ref } from 'vue'
import { USER_CONTENT_KINDS, type UserContentKind } from '@shared/maps'

/**
 * Map UI state — which user-content layers are visible on the
 * BrowseProfiles map. The selection is sent verbatim to the backend as
 * the `kinds` query param on cluster fetches; toggling a layer in the
 * UI causes `findProfileStore` to invalidate its bounds cache and refetch.
 *
 * Invariant: at least one kind is always selected. The wire schema rejects
 * empty `kinds`, so the setter clamps empty input by keeping the current
 * value rather than letting the UI write an unsendable selection.
 */
export const useMapStore = defineStore('map', () => {
  const selectedLayers = ref<UserContentKind[]>([...USER_CONTENT_KINDS])

  function setSelectedLayers(next: UserContentKind[]) {
    if (next.length === 0) return
    selectedLayers.value = next
  }

  return {
    selectedLayers,
    setSelectedLayers,
  }
})

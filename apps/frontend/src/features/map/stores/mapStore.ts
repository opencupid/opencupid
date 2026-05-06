import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Map UI state — per-layer visibility for the BrowseProfiles map's layer
 * control. The selection is sent to the backend as the `kinds` query param
 * on cluster fetches; toggling a layer in the UI causes
 * `findProfileStore` to invalidate its bounds cache and refetch.
 *
 * The component-level invariant that at least one layer is always selected
 * keeps the wire payload non-empty (the backend rejects empty `kinds`).
 */
export const useMapStore = defineStore('map', () => {
  const showPeople = ref(true)
  const showPosts = ref(true)

  function setShowPeople(value: boolean) {
    showPeople.value = value
  }

  function setShowPosts(value: boolean) {
    showPosts.value = value
  }

  return {
    showPeople,
    showPosts,
    setShowPeople,
    setShowPosts,
  }
})

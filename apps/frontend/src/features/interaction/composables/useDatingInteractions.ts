import { computed } from "vue"
import { useDatingInteractionStore } from "../stores/useDatingInteractionStore"

export function useDatingInteractions() {
  const store = useDatingInteractionStore()

  
  return {
    likesSent: store.sent,
    matches: store.matches,
    haveMatches: computed(() => store.matches.length > 0),
    receivedLikesCount: store.receivedLikesCount,
    like: store.sendLike,
    pass: store.passProfile,
    refreshInteractions: store.fetchInteractions,
    isLoading: store.loading,
  }
}
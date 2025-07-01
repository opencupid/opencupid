import { computed } from "vue"
import { useInteractionStore } from "../stores/useInteractionStore"

export function useInteractionsViewModel() {
  const store = useInteractionStore()

  
  return {
    likesSent: store.sent,
    matches: computed(() => store.matches)  ,
    haveMatches: computed(() => store.matches.length > 0),
    receivedLikesCount: computed(() => store.receivedLikesCount),
    like: store.sendLike,
    pass: store.passProfile,
    refreshInteractions: store.fetchInteractions,
    isLoading: store.loading,
  }
}
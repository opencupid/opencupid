import { useDatingInteractionStore } from "../stores/useDatingInteractionStore"

export function useDatingInteractions() {
  const store = useDatingInteractionStore()
  return {
    likesSent: store.sent,
    matches: store.matches,
    like: store.sendLike,
    unlike: store.removeLike,
    pass: store.passProfile,
    unpass: store.unpassProfile,
    refreshInteractions: store.fetchInteractions,
    loadingLikes: store.loading,
  }
}
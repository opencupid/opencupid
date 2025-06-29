import { useDatingInteractionStore } from "../stores/useDatingInteractionStore"

export function useDatingInteractions() {
  const store = useDatingInteractionStore()
  return {
    likesSent: store.sent,
    matches: store.matches,
    like: store.sendLike,
    pass: store.passProfile,
    refreshInteractions: store.fetchInteractions,
    loadingLikes: store.loading,
  }
}
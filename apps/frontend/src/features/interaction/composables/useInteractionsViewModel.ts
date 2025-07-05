import { computed } from "vue"
import { useInteractionStore } from "../stores/useInteractionStore"

export function useInteractionsViewModel() {
  const store = useInteractionStore()


  return {
    likesSent: computed(() => store.sent),
    matches: computed(() => store.matches),
    haveMatches: computed(() => store.matches.length > 0),
    haveNewMatches: computed(() => store.newMatchesCount > 0),
    haveReceivedLikes: computed(() => store.receivedLikesCount > 0),
    haveSentLikes: computed(() => store.sent.length > 0),
    receivedLikesCount: computed(() => store.receivedLikesCount),
    newMatchesCount: computed(() => store.newMatchesCount),
    like: store.sendLike,
    pass: store.passProfile,
    refreshInteractions: store.fetchInteractions,
    initialize: store.initialize,
    isInitialized: computed(() => store.initialized),
    isLoading: computed(() => store.loading || !store.initialized),
  }
}
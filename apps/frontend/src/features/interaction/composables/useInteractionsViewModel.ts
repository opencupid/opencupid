import { computed } from 'vue'
import { useInteractionStore } from '../stores/useInteractionStore'

export function useInteractionsViewModel() {
  const store = useInteractionStore()

  return {
    likesSent: computed(() => store.sent),
    matches: computed(() => store.matches),
    haveMatches: computed(() => store.matches.length > 0),
    haveNewMatches: computed(() => store.newMatchesCount > 0),
    haveReceivedLikes: computed(() => store.receivedLikes.length > 0),
    haveSentLikes: computed(() => store.sent.length > 0),
    receivedLikes: computed(() => store.receivedLikes),
    receivedLikesCount: computed(() => store.receivedLikes.length),
    newMatchesCount: computed(() => store.newMatchesCount),
    like: store.sendLike,
    updateLike: store.updateLike,
    pass: store.passProfile,
    refreshInteractions: store.fetchInteractions,
    initialize: store.initialize,
    isInitialized: computed(() => store.initialized),
    isLoading: computed(() => store.loading || !store.initialized),
  }
}

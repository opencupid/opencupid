import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { bus } from '@/lib/bus'
import { InteractionEdgePairSchema, InteractionStatsSchema, type InteractionEdge, type InteractionEdgePair } from '@zod/interaction/interaction.dto'
import { storeError, storeSuccess, type StoreError, type StoreResponse } from '@/store/helpers'

interface InteractionState {
  sent: InteractionEdge[]
  receivedLikesCount: number
  matches: InteractionEdge[]
  passed: string[] // just IDs for now
  loading: boolean
  error: StoreError | null
}

export const useInteractionStore = defineStore('interaction', {
  state: (): InteractionState => ({
    sent: [],
    receivedLikesCount: 0,
    matches: [],
    passed: [],
    loading: false,
    error: null,
  }),

  actions: {

    onNewLike() {
      // // Push to sent only if not already there
      // if (!this.sent.some(e => e.profile.id === edge.profile.id)) {
      //   this.sent.unshift(edge)
      // }

      // if (edge.isMatch && !this.matches.some(e => e.profile.id === edge.profile.id)) {
      //   this.matches.unshift(edge)
      // }
    },
    onNewMatch(edge: InteractionEdge) {
      if (edge.isMatch && !this.matches.some(e => e.profile.id === edge.profile.id)) {
        this.matches.unshift(edge)
      }
    },

    async fetchInteractions() {
      this.loading = true
      try {
        const res = await api.get('/interactions')
        const stats = InteractionStatsSchema.parse(res.data.stats)
        this.sent = stats.sent
        this.matches = stats.matches
        this.receivedLikesCount = stats.receivedLikesCount
        return storeSuccess()
      } catch (error) {
        return storeError(error)
      } finally {
        this.loading = false
      }
    },

    async sendLike(targetId: string): Promise<StoreResponse<InteractionEdgePair>> {
      try {
        const res = await api.post<{ success: true; pair: unknown }>(
          `/interactions/like/${targetId}`
        )

        // Parse and validate the response shape
        const pair = InteractionEdgePairSchema.parse(res.data.pair)

        if (pair.isMatch) {
          this.matches.push(pair.from)
        } else {
          this.sent.push(pair.from)
        }

        return storeSuccess(pair)
      } catch (error) {
        console.error('Failed to like profile:', error)
        return storeError(error)
      }
    },

    async removeLike(targetId: string): Promise<StoreResponse<void>> {
      try {
        await api.delete(`/interactions/like/${targetId}`)
        this.sent = this.sent.filter(e => e.profile.id !== targetId)
        this.matches = this.matches.filter(e => e.profile.id !== targetId)
        return storeSuccess()
      } catch (error) {
        console.error('Failed to unlike profile:', error)
        return storeError(error)
      }
    },

    async passProfile(targetId: string): Promise<StoreResponse<void>> {
      try {
        await api.post(`/interactions/pass/${targetId}`)
        if (!this.passed.includes(targetId)) {
          this.passed.push(targetId)
        }
        // Optionally: remove from sent/matches if previously liked
        this.sent = this.sent.filter(e => e.profile.id !== targetId)
        this.matches = this.matches.filter(e => e.profile.id !== targetId)
        return storeSuccess()
      } catch (error) {
        console.error('Failed to pass profile:', error)
        return storeError(error)
      }
    },

    async unpassProfile(targetId: string): Promise<StoreResponse<void>> {
      try {
        await api.delete(`/interactions/pass/${targetId}`)
        this.passed = this.passed.filter(id => id !== targetId)
        return storeSuccess()
      } catch (error) {
        console.error('Failed to unpass profile:', error)
        return storeError(error)
      }
    },

    async initialize() {
      await this.fetchInteractions()
      bus.on('ws:new_like', this.onNewLike)
      bus.on('ws:new_match', this.onNewMatch)
    },

    teardown() {
      bus.off('ws:new_like', this.onNewLike)
      bus.off('ws:new_match', this.onNewMatch)
      // Remove any other event listeners you may have added
      this.sent = []
      this.receivedLikesCount = 0
      this.matches = []
      this.passed = []
      this.loading = false
      this.error = null
    }
  },
})

bus.on('auth:login', async ({ token, userInfo }) => {
  await useInteractionStore().initialize()
})

bus.on('auth:logout', () => {
  useInteractionStore().teardown()
})


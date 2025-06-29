import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { bus } from '@/lib/bus'
import { InteractionEdgePairSchema, type InteractionEdge, type InteractionEdgePair } from '@zod/datinginteraction/datinginteraction.dto'
import { storeError, storeSuccess, type StoreError, type StoreResponse } from '@/store/helpers'

interface InteractionState {
  sent: InteractionEdge[]
  receivedLikesCount: number
  matches: InteractionEdge[]
  passed: string[] // just IDs for now
  loading: boolean
  error: StoreError | null
}

export const useDatingInteractionStore = defineStore('datingInteraction', {
  state: (): InteractionState => ({
    sent: [],
    receivedLikesCount: 0,
    matches: [],
    passed: [],
    loading: false,
    error: null,
  }),

  actions: {
    initialize() {
      bus.on('ws:new_like', this.onNewLike)
      bus.on('ws:new_match', this.onNewMatch)
      // You can also listen for future events: ws:new_pass, ws:match, etc.
    },

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
        const [sentRes, receivedRes, matchRes] = await Promise.all([
          api.get('/interactions/sent'),
          api.get('/interactions/received'),
          api.get('/interactions/matches'),
        ])
        this.sent = sentRes.data.edges
        this.matches = matchRes.data.edges
        this.receivedLikesCount = receivedRes.data.count
        return storeSuccess()
      } catch (error) {
        console.error('Failed to fetch likes:', error)
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

        console.log('store Like response:', res.data)

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
  },
})

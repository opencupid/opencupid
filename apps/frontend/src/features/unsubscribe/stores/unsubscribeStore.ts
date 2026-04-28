import z from 'zod'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'

const UnsubscribeStatusSchema = z.object({
  success: z.literal(true),
  alreadyUnsubscribed: z.boolean(),
})

export type UnsubscribeStatus = z.infer<typeof UnsubscribeStatusSchema>

type UnsubscribeStoreState = {
  isLoading: boolean
}

export const useUnsubscribeStore = defineStore('unsubscribe', {
  state: (): UnsubscribeStoreState => ({
    isLoading: false,
  }),

  actions: {
    async getStatus(token: string): Promise<StoreResponse<UnsubscribeStatus>> {
      try {
        this.isLoading = true
        const res = await api.get(`/unsubscribe/${encodeURIComponent(token)}`)
        const parsed = UnsubscribeStatusSchema.parse(res.data)
        return storeSuccess(parsed)
      } catch (error: any) {
        return storeError(error, 'Failed to read unsubscribe status')
      } finally {
        this.isLoading = false
      }
    },

    async unsubscribe(token: string): Promise<StoreResponse<UnsubscribeStatus>> {
      try {
        this.isLoading = true
        const res = await api.post(`/unsubscribe/${encodeURIComponent(token)}`)
        const parsed = UnsubscribeStatusSchema.parse(res.data)
        return storeSuccess(parsed)
      } catch (error: any) {
        return storeError(error, 'Failed to unsubscribe')
      } finally {
        this.isLoading = false
      }
    },
  },
})

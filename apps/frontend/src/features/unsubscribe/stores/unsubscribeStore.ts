import z from 'zod'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { EmailScopeSchema } from '@zod/user/emailPreference.dto'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'

const UnsubscribeStatusSchema = z.object({
  success: z.literal(true),
  alreadyUnsubscribed: z.boolean(),
  /** The email scope the link turns off. */
  scope: EmailScopeSchema,
})

export type UnsubscribeStatus = z.infer<typeof UnsubscribeStatusSchema>

const UnsubscribeAllResultSchema = z.object({
  success: z.literal(true),
  alreadyUnsubscribed: z.boolean(),
})

export type UnsubscribeAllResult = z.infer<typeof UnsubscribeAllResultSchema>

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

    /** Turn off every email scope for the token's user. */
    async unsubscribeAll(token: string): Promise<StoreResponse<UnsubscribeAllResult>> {
      try {
        this.isLoading = true
        const res = await api.post(`/unsubscribe/${encodeURIComponent(token)}/all`)
        return storeSuccess(UnsubscribeAllResultSchema.parse(res.data))
      } catch (error: any) {
        return storeError(error, 'Failed to unsubscribe from all emails')
      } finally {
        this.isLoading = false
      }
    },
  },
})

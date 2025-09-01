import { defineStore } from 'pinia'
import { api, safeApiCall } from '@/lib/api'
import type {
  NewsletterSubscriptionResponse,
  NewsletterAction,
  NewsletterActionResponse,
} from '@zod/newsletter/newsletter.dto'
import type { ApiError } from '@zod/apiResponse.dto'
import { NewsletterStatus } from '@zod/generated'

interface NewsletterState {
  subscription: NewsletterSubscriptionResponse | null
  loading: boolean
  error: string | null
}

export const useNewsletterStore = defineStore('newsletter', {
  state: (): NewsletterState => ({
    subscription: null,
    loading: false,
    error: null,
  }),

  getters: {
    isSubscribed: (state): boolean => {
      return state.subscription?.status === NewsletterStatus.SUBSCRIBED
    },
    canSubscribe: (state): boolean => {
      return !state.subscription || 
             state.subscription.status === NewsletterStatus.UNSUBSCRIBED ||
             state.subscription.status === NewsletterStatus.BOUNCED ||
             state.subscription.status === NewsletterStatus.COMPLAINED
    },
    statusText: (state): string => {
      if (!state.subscription) return 'Not subscribed'
      
      switch (state.subscription.status) {
        case NewsletterStatus.SUBSCRIBED:
          return 'Subscribed'
        case NewsletterStatus.UNSUBSCRIBED:
          return 'Unsubscribed'
        case NewsletterStatus.BOUNCED:
          return 'Bounced (email delivery failed)'
        case NewsletterStatus.COMPLAINED:
          return 'Complained (marked as spam)'
        case NewsletterStatus.PENDING_DOUBLE_OPT_IN:
          return 'Pending confirmation'
        default:
          return 'Unknown status'
      }
    },
  },

  actions: {
    async fetchMe(): Promise<void> {
      this.loading = true
      this.error = null

      try {
        const response = await safeApiCall<NewsletterSubscriptionResponse>(
          () => api.get('/newsletter/me')
        )

        if (response.success) {
          this.subscription = response.data
        } else {
          this.error = response.message || 'Failed to fetch newsletter subscription'
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch newsletter subscription'
      } finally {
        this.loading = false
      }
    },

    async subscribe(): Promise<boolean> {
      return this.updateSubscription('subscribe')
    },

    async unsubscribe(): Promise<boolean> {
      return this.updateSubscription('unsubscribe')
    },

    async updateSubscription(action: NewsletterAction['action']): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const response = await safeApiCall<NewsletterActionResponse>(
          () => api.post('/newsletter/me', { action })
        )

        if (response.success) {
          // Update local state optimistically
          if (this.subscription) {
            this.subscription.status = response.data.status
            if (action === 'subscribe') {
              this.subscription.subscribedAt = new Date().toISOString()
              this.subscription.unsubscribedAt = null
            } else {
              this.subscription.unsubscribedAt = new Date().toISOString()
            }
          } else {
            // Create subscription object if it didn't exist
            this.subscription = {
              id: '',
              status: response.data.status,
              subscribedAt: action === 'subscribe' ? new Date().toISOString() : null,
              unsubscribedAt: action === 'unsubscribe' ? new Date().toISOString() : null,
              source: 'user_preference',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          }
          return true
        } else {
          this.error = response.message || `Failed to ${action}`
          return false
        }
      } catch (error: any) {
        this.error = error.message || `Failed to ${action}`
        return false
      } finally {
        this.loading = false
      }
    },

    clearError(): void {
      this.error = null
    },
  },
})
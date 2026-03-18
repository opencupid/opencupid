import { defineStore } from 'pinia'
import { api, safeApiCall } from '@/lib/api'
import { urlBase64ToUint8Array } from '@/lib/utils'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import {
  storeSuccess,
  storeError,
  type StoreVoidSuccess,
  type StoreError,
} from '../../../store/helpers'

interface PushNotificationState {
  isSubscribed: boolean
  isLoading: boolean
}

export const usePushNotificationStore = defineStore('pushNotification', {
  state: (): PushNotificationState => ({
    isSubscribed: false,
    isLoading: false,
  }),

  getters: {
    isSupported(): boolean {
      return (
        typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        'Notification' in window &&
        'PushManager' in window
      )
    },
  },

  actions: {
    async checkSubscription(): Promise<void> {
      if (!this.isSupported) return
      if (Notification.permission !== 'granted') {
        this.isSubscribed = false
        return
      }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      this.isSubscribed = !!subscription
    },

    async subscribe(): Promise<StoreVoidSuccess | StoreError> {
      this.isLoading = true
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          this.isSubscribed = false
          return storeError(new Error('Permission denied'), 'Push permission denied')
        }

        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(__APP_CONFIG__.VAPID_PUBLIC_KEY),
        })

        await safeApiCall(() => api.post('/push/subscription', subscription))
        // TODO: remove isPushNotificationEnabled DB sync once the column is dropped
        await useOwnerProfileStore().updateOptInSettings({ isPushNotificationEnabled: true })
        this.isSubscribed = true
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to subscribe to push notifications')
      } finally {
        this.isLoading = false
      }
    },

    async unsubscribe(): Promise<StoreVoidSuccess | StoreError> {
      this.isLoading = true
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          const endpoint = subscription.endpoint
          await subscription.unsubscribe()
          await safeApiCall(() => api.delete('/push/subscription', { data: { endpoint } }))
        }
        // TODO: remove isPushNotificationEnabled DB sync once the column is dropped
        await useOwnerProfileStore().updateOptInSettings({ isPushNotificationEnabled: false })
        this.isSubscribed = false
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to unsubscribe from push notifications')
      } finally {
        this.isLoading = false
      }
    },
  },
})

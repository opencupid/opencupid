<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/lib/api'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { t } = useI18n()

const isSupported = 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window

const isLoading = ref(false)

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64url = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  try {
    const raw = atob(base64url)
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)))
  } catch (error) {
    console.error('Failed to decode base64 string:', error)
  }
  return new Uint8Array()
}

async function handleChange(event: Event) {
  const checkbox = event.target as HTMLInputElement
  const checked = checkbox.checked

  isLoading.value = true
  try {
    if (checked) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        checkbox.checked = false
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(__APP_CONFIG__.VAPID_PUBLIC_KEY),
      })

      await api.post('/push/subscription', subscription)
      await api.patch('/users/me', { isPushNotificationEnabled: true })
      emit('update:modelValue', true)
    } else {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }
      await api.patch('/users/me', { isPushNotificationEnabled: false })
      emit('update:modelValue', false)
    }
  } catch (error) {
    console.error('Push notification toggle failed:', error)
    checkbox.checked = !checked
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div v-if="isSupported" class="form-check">
    <input
      id="push-notify-messages"
      type="checkbox"
      class="form-check-input"
      :checked="modelValue"
      :disabled="disabled || isLoading"
      @change="handleChange"
    />
    <label class="form-check-label" for="push-notify-messages">
      {{ t('settings.push_notify_messages') }}
    </label>
  </div>
</template>

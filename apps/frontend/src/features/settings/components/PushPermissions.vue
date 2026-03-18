<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePushNotificationStore } from '../stores/pushNotificationStore'

defineProps<{
  disabled?: boolean
}>()

const { t } = useI18n()
const pushStore = usePushNotificationStore()

onMounted(() => pushStore.checkSubscription())

async function handleChange(event: Event) {
  const checkbox = event.target as HTMLInputElement
  const checked = checkbox.checked

  const res = checked ? await pushStore.subscribe() : await pushStore.unsubscribe()
  if (!res.success) {
    checkbox.checked = !checked
  }
}
</script>

<template>
  <div
    v-if="pushStore.isSupported"
    class="form-check"
  >
    <input
      id="push-notify-messages"
      type="checkbox"
      class="form-check-input"
      :checked="pushStore.isSubscribed"
      :disabled="disabled || pushStore.isLoading"
      @change="handleChange"
    />
    <label
      class="form-check-label"
      for="push-notify-messages"
    >
      {{ t('settings.push_notify_messages') }}
    </label>
  </div>
</template>

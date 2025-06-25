<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import ProfileImage from '@/features/images/components/ProfileImage.vue'
// import { useI18n } from 'vue-i18n';
// const { t } = useI18n()

defineEmits<{
  (e: 'closeToast'): void
}>()

defineProps<{
  message: MessageDTO
  toastId: number | string
}>()
</script>

<template>
  <div class="d-flex align-items-center">
    <div
      class="thumbnail me-2"
      style="width: 40px; height: 40px;"
    >
      <ProfileImage :profile="message.sender" />
    </div>
    <span>
      {{
        $t('messaging.new_message_notification', {
          sender: message.sender.publicName || $t('messaging.unknown_sender'),
        })
      }}
    </span>
  </div>
</template>

<style scoped>
:deep(img) {
  width: 40px !important;
  height: 40px !important;
  border-radius: 9999px !important;
}
</style>

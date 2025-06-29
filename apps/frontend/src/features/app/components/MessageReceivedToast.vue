<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import ProfileImage from '@/features/images/components/ProfileImage.vue'


defineEmits<{
  (e: 'closeToast'): void
}>()

defineProps<{
  message: MessageDTO
  toastId: number | string
}>()
</script>

<template>
  <div class="d-flex align-items-center clickable">
    <div class="profile-thumbnail me-2">
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

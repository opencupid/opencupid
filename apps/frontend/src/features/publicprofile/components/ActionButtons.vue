<script setup lang="ts">
import { inject, nextTick, ref } from 'vue'
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import IconMessage from '@/assets/icons/interface/message.svg'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'

const props = defineProps<{
  profile: PublicProfileWithContext
}>()
const isOwner = inject<boolean>('isOwner', false)
const isEditable = inject<boolean>('isEditable', false)

const emit = defineEmits<{
  (e: 'intent:message', profile: PublicProfileWithContext): void
  (e: 'intent:conversation:open', conversationId: string): void
}>()

const showMessageModal = ref(false)

const handleMessageIntent = () => {
  if (!props.profile.conversation) {
    showMessageModal.value = true
    return
  }
  if (props.profile.conversation.status === 'ACCEPTED') {
    emit('intent:conversation:open', props.profile.conversation.id)
  }
}
</script>

<template>
  <div>
    <div>
      <BButton
        v-if="(!profile.conversation || profile.conversation.status === 'ACCEPTED') && !isOwner"
        :pill="true"
        class="btn-overlay"
        @click="handleMessageIntent"
      >
        <IconMessage class="svg-icon-lg p-0" />
        <!-- {{ $t('profiles.send_message_button') }} -->
      </BButton>
    </div>

    <SendMessageDialog />
  </div>
</template>

<style scoped></style>

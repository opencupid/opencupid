<script setup lang="ts">
import { type ConversationSummary } from '@zod/messaging/messaging.dto'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  conversations: ConversationSummary[]
  activeConversation: ConversationSummary | null
  loading: boolean
}>()

defineEmits<{
  (e: 'convo:select', val: ConversationSummary): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="mb-3 px-3">
    <BListGroup >
      <BListGroupItem
        v-for="convo in conversations"
        :key="convo.conversationId"
        :active="activeConversation?.conversationId === convo.conversationId"
        :class="{disabled: !convo.canReply}"
        variant="light"
        class="d-flex justify-content-start align-items-center mb-3 p-2 border-0 rounded-3 shadow cursor-pointer user-select-none"
        @click="$emit('convo:select', convo)"
      >
        <div class="thumbnail me-2 flex-shrink-0">
          <ProfileThumbnail :profile="convo.partnerProfile" />
        </div>
        <div class="overflow-hidden flex-grow-1 user-select-none">
          <div class="text-truncate fw-bold">{{ convo.partnerProfile.publicName }}</div>
          <small
            class="last-message text-truncate text-nowrap pe-2"
            v-if="convo.lastMessage"
            >{{ convo.lastMessage.content }}</small
          >
        </div>
        <div class="flex-shrink-0 me-2 ">
          <small v-if="!convo.lastMessage?.isMine" class="badge bg-danger">{{ t('messaging.my_turn') }}</small>
          <small v-if="!convo.canReply" class="badge bg-secondary">
            <!-- Their turn -->
            {{ t('messaging.their_turn') }}
          </small>
        </div>
      </BListGroupItem>
    </BListGroup>
  </div>
</template>

<style scoped>
.last-message {
  text-overflow: ellipsis;
}
.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>

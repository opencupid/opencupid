<script setup lang="ts">
import IconArrowSingleLeft from '@/assets/icons/arrows/arrow-single-left.svg'
import type { ConversationLoadError } from '../composables/useConversationDetailViewModel'

defineProps<{ reason: ConversationLoadError }>()

defineEmits<{
  (e: 'back'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div
    class="d-flex flex-column h-100"
    data-testid="conversation-load-error"
  >
    <div class="d-flex align-items-center justify-content-between p-2">
      <button
        type="button"
        class="btn btn-secondary-outline fs-1"
        :title="$t('uicomponents.back_button_title')"
        :aria-label="$t('uicomponents.back_button_title')"
        @click="$emit('back')"
      >
        <IconArrowSingleLeft class="svg-icon" />
      </button>
      <button
        type="button"
        class="btn-close"
        :aria-label="$t('common.close')"
        @click="$emit('close')"
      />
    </div>
    <p class="flex-grow-1 d-flex align-items-center justify-content-center text-muted p-3">
      {{
        $t(
          reason === 'not_found'
            ? 'messaging.conversation_not_found'
            : 'messaging.conversation_load_failed'
        )
      }}
    </p>
  </div>
</template>

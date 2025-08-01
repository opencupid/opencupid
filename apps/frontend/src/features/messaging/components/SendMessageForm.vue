<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'
import { funnel } from 'remeda'

import { useLocalStore } from '@/store/localStore'

import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import TagList from '@/features/shared/profiledisplay/TagList.vue'
import LanguageList from '@/features/shared/profiledisplay/LanguageList.vue'
import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import { useMessageStore } from '../stores/messageStore'

const messageStore = useMessageStore()

const props = defineProps<{
  recipientProfile: PublicProfileWithContext
  conversationId: string | null
  showTags?: boolean
}>()

const emit = defineEmits<{
  (e: 'message:sent', message: MessageDTO | null): void
}>()

const content = ref('')

// Local store for managing message drafts
const localStore = useLocalStore()
const debouncer = funnel<[string], string>(
  (val: string) => {
    localStore.setMessageDraft(props.recipientProfile.id, content.value)
  },
  {
    minQuietPeriodMs: 3000,
  }
)

// Watch message input field and save draft in localStore
watch(content, val => debouncer.call(val))

watchEffect(() => {
  // Load the draft message from local store when the component is mounted
  const draft = localStore.getMessageDraft(props.recipientProfile.id)
  if (draft) content.value = draft
})

const textarea = ref<HTMLTextAreaElement>()

// Give focus to textarea - expose method to parent which can call it
// when it's rendered or when needed
const focusTextarea = () => textarea.value?.focus()

defineExpose({
  focusTextarea,
})

async function handleSendMessage() {
  const trimmedContent = content.value.trim()
  if (trimmedContent === '') return
  const result = await messageStore.sendMessage(props.recipientProfile.id, trimmedContent)
  if (result.success) {
    // console.log('Message sent successfully:', result.data)
    emit('message:sent', result.data!)
    content.value = '' // Clear the input after sending
    localStore.setMessageDraft(props.recipientProfile.id, '') // Clear the draft in local store
    return
  }
}
</script>

<template>
  <div class="w-100">
    <StoreErrorOverlay v-if="messageStore.error" :error="messageStore.error" />

    <div class="mb-2">
      <div v-if="showTags" class="mb-2 opacity-75">
        <div class="d-inline-block">
          <TagList :tags="props.recipientProfile.tags" class="d-inline-block" />
        </div>
        <div class="d-inline-block">
          <LanguageList :languages="props.recipientProfile.languages" class="d-inline-block" />
        </div>
      </div>
      <BFormGroup label="" label-for="content-input" class="me-2 flex-grow-1 w-100">
        <BFormTextarea
          id="content-input"
          ref="textarea"
          v-model="content"
          rows="1"
          max-rows="5"
          no-resize
          @keyup.enter="handleSendMessage"
          :placeholder="$t('messaging.message_input_placeholder')"
        />
        <div class="form-text text-muted d-flex justify-content-end">
          <small>{{ $t('messaging.message_input_hint') }}</small>
        </div>
      </BFormGroup>
    </div>
  </div>
</template>

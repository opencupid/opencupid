<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'
import { funnel } from 'remeda'

import { useLocalStore } from '@/store/localStore'

import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import TagList from '@/features/shared/profiledisplay/TagList.vue'
import LanguageList from '@/features/shared/profiledisplay/LanguageList.vue'
import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import VoiceRecorder from './VoiceRecorder.vue'
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
const isVoiceMode = ref(false)

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

// Voice message handlers
async function handleVoiceRecordingCompleted(audioBlob: Blob, duration: number) {
  const result = await messageStore.sendVoiceMessage(props.recipientProfile.id, audioBlob, duration)
  if (result.success) {
    emit('message:sent', result.data!)
    isVoiceMode.value = false
  }
}

function handleVoiceRecordingCancelled() {
  isVoiceMode.value = false
}

function handleVoiceRecordingError(error: string) {
  console.error('Voice recording error:', error)
  // You might want to show a toast notification here
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
      
      <!-- Text input form -->
      <div v-if="!isVoiceMode" class="d-flex align-items-end gap-2">
        <BFormGroup label="" label-for="content-input" class="flex-grow-1">
          <BFormTextarea
            id="content-input"
            ref="textarea"
            v-model="content"
            rows="1"
            max-rows="5"
            no-resize
            @keyup.enter="handleSendMessage"
            :placeholder="$t('messaging.message_input_placeholder')"
            :disabled="messageStore.isSending"
          />
          <div class="form-text text-muted d-flex justify-content-end">
            <small>{{ $t('messaging.message_input_hint') }}</small>
          </div>
        </BFormGroup>
        
        <!-- Voice recorder button -->
        <div class="d-flex flex-column align-items-center">
          <BButton
            variant="outline-primary"
            size="sm"
            @click="isVoiceMode = true"
            :disabled="messageStore.isSending"
            :title="$t('messaging.voice.record_voice_message')"
            class="mb-1"
          >
            <i class="fas fa-microphone"></i>
          </BButton>
        </div>
      </div>

      <!-- Voice recording mode -->
      <div v-else class="voice-mode-container">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h6 class="mb-0">{{ $t('messaging.voice.recording_mode') }}</h6>
          <BButton
            variant="outline-secondary"
            size="sm"
            @click="isVoiceMode = false"
            :title="$t('messaging.voice.back_to_text')"
          >
            <i class="fas fa-keyboard"></i> {{ $t('messaging.voice.text') }}
          </BButton>
        </div>
        
        <VoiceRecorder
          :disabled="messageStore.isSending"
          :max-duration="120"
          @recording:completed="handleVoiceRecordingCompleted"
          @recording:cancelled="handleVoiceRecordingCancelled"
          @recording:error="handleVoiceRecordingError"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.voice-mode-container {
  border: 2px dashed var(--bs-primary);
  border-radius: 8px;
  padding: 1rem;
  background: var(--bs-primary-bg-subtle);
}

.voice-mode-container h6 {
  color: var(--bs-primary);
}
</style>

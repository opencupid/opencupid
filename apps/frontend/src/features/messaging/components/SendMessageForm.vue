<script setup lang="ts">
import { ref, watch, watchEffect, computed } from 'vue'
import { funnel } from 'remeda'

import { useLocalStore } from '@/store/localStore'
import type { SendMode } from '@/store/localStore'

import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import TagList from '@/features/shared/profiledisplay/TagList.vue'
import LanguageList from '@/features/shared/profiledisplay/LanguageList.vue'
import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import IconMenuDotsVert from '@/assets/icons/interface/menu-dots-vert.svg'
import VoiceRecorder from './VoiceRecorder.vue'
import { useMessageStore } from '../stores/messageStore'

import MicIcon from '@/assets/icons/interface/mic.svg'
import Mic2Icon from '@/assets/icons/interface/mic-2.svg'


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

// Send mode preference
const sendMode = computed(() => localStore.getSendMode)

const handleKeyPress = (event: KeyboardEvent) => {
  if (sendMode.value === 'enter' && event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSendMessage()
  }
}

const setSendMode = (mode: SendMode) => {
  localStore.setSendMode(mode)
}

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
        <BFormGroup label="" label-for="content-input" class="me-2 flex-grow-1 w-100">
          <BFormTextarea
            id="content-input"
            ref="textarea"
            v-model="content"
            rows="1"
            max-rows="5"
            no-resize
            @keydown="handleKeyPress"
            :placeholder="$t('messaging.message_input_placeholder')"
            :disabled="messageStore.isSending"
          />
          <div class="form-text text-muted d-flex justify-content-end align-items-center gap-2">
            <BButton
              v-if="sendMode === 'click'"
              variant="primary"
              size="sm"
              @click="handleSendMessage"
              :disabled="content.trim() === ''"
            >
              {{ $t('messaging.send_message_button').toUpperCase() }}
            </BButton>
            <small v-else class="text-muted">
              {{ $t('messaging.send_mode_press_enter') }}
            </small>
            <BDropdown
              variant="link"
              no-caret
              toggle-class="text-decoration-none p-0 text-muted"
              size="sm"
              menu-class="send-mode-menu"
              end
            >
              <template #button-content>
                <IconMenuDotsVert class="svg-icon-lg fs-4" />
              </template>
              <BDropdownItem @click="setSendMode('enter')" :active="sendMode === 'enter'">
                <i class="bi bi-record-circle-fill" v-if="sendMode === 'enter'"></i>
                <i class="bi bi-circle" v-else></i>
                {{ $t('messaging.send_mode_press_enter') }}
              </BDropdownItem>
              <BDropdownItem @click="setSendMode('click')" :active="sendMode === 'click'">
                <i class="bi bi-record-circle-fill" v-if="sendMode === 'click'"></i>
                <i class="bi bi-circle" v-else></i>
                {{ $t('messaging.send_mode_click') }}
              </BDropdownItem>
            </BDropdown>
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
          <Mic2Icon class="svg-icon"></Mic2Icon>
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
.send-mode-menu {
  min-width: 200px;
}

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

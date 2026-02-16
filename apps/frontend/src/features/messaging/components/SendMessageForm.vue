<script setup lang="ts">
import { ref, watch, watchEffect, computed, nextTick } from 'vue'
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
const isVoiceActive = ref(false)
const voiceRecorderRef = ref<InstanceType<typeof VoiceRecorder> | null>(null)

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

async function handleMicClick() {
  isVoiceActive.value = true
  await nextTick()
  voiceRecorderRef.value?.triggerStart()
}

// Voice message handlers
async function handleVoiceRecordingCompleted(audioBlob: Blob, duration: number) {
  const result = await messageStore.sendVoiceMessage(props.recipientProfile.id, audioBlob, duration)
  if (result.success) {
    emit('message:sent', result.data!)
  }
  isVoiceActive.value = false
}

function handleVoiceRecordingCancelled() {
  isVoiceActive.value = false
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

      <!-- Message input form -->
      <div>
        <BFormTextarea
          id="content-input"
          ref="textarea"
          v-model="content"
          rows="1"
          max-rows="5"
          no-resize
          @keydown="handleKeyPress"
          :placeholder="$t('messaging.message_input_placeholder')"
          :disabled="messageStore.isSending || isVoiceActive"
        />
        <div class="form-text text-muted d-flex justify-content-between align-items-center">
          <!-- Voice recorder button (left) -->
          <BButton
            variant="outline-secondary"
            size="sm"
            @click="handleMicClick"
            :disabled="messageStore.isSending || isVoiceActive"
            :title="$t('messaging.voice.record_voice_message')"
          >
            <Mic2Icon class="svg-icon" />
          </BButton>

          <div class="d-flex align-items-center gap-2">
            <BButton
              v-if="sendMode === 'click'"
              variant="primary"
              size="sm"
              @click="handleSendMessage"
              :disabled="content.trim() === '' || isVoiceActive"
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
                <input 
                  type="radio" 
                  class="form-check-input me-2" 
                  :checked="sendMode === 'enter'"
                  disabled
                />
                {{ $t('messaging.send_mode_press_enter') }}
              </BDropdownItem>
              <BDropdownItem @click="setSendMode('click')" :active="sendMode === 'click'">
                <input 
                  type="radio" 
                  class="form-check-input me-2" 
                  :checked="sendMode === 'click'"
                  disabled
                />
                {{ $t('messaging.send_mode_click') }}
              </BDropdownItem>
            </BDropdown>
          </div>
        </div>
      </div>

      <!-- Inline voice recorder (shown when active) -->
      <VoiceRecorder
        v-if="isVoiceActive"
        ref="voiceRecorderRef"
        :disabled="messageStore.isSending"
        :max-duration="120"
        :hide-idle-button="true"
        @recording:completed="handleVoiceRecordingCompleted"
        @recording:cancelled="handleVoiceRecordingCancelled"
        @recording:error="handleVoiceRecordingError"
      />
    </div>
  </div>
</template>

<style scoped>
.send-mode-menu {
  min-width: 200px;
}

</style>

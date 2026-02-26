<script setup lang="ts">
import { ref, watch, watchEffect, computed } from 'vue'
import { funnel } from 'remeda'

import { useLocalStore } from '@/store/localStore'
import type { SendMode } from '@/store/localStore'

import { type MessageDTO, type MessageAttachmentDTO } from '@zod/messaging/messaging.dto'
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import TagList from '@/features/shared/profiledisplay/TagList.vue'
import LanguageList from '@/features/shared/profiledisplay/LanguageList.vue'
import StoreErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import IconMenuDotsVert from '@/assets/icons/interface/menu-dots-vert.svg'
import IconCall from '@/assets/icons/interface/call.svg'
import { useToast } from 'vue-toastification'
import VoiceRecorder from './VoiceRecorder.vue'
import VoiceMessage from './VoiceMessage.vue'
import { useMessageStore } from '../stores/messageStore'

const toast = useToast()

const messageStore = useMessageStore()

const props = defineProps<{
  recipientProfile: PublicProfileWithContext
  conversationId: string | null
  showTags?: boolean
  canCall?: boolean
}>()

const emit = defineEmits<{
  (e: 'message:sent', message: MessageDTO | null): void
  (e: 'call:start'): void
}>()

const content = ref('')
const isVoiceActive = ref(false)
const voiceRecorderRef = ref<InstanceType<typeof VoiceRecorder> | null>(null)
const voiceMaxDuration = __APP_CONFIG__.VOICE_MESSAGE_MAX_DURATION

// Voice confirmation modal state (shown when recording auto-stops at max duration)
const showVoiceConfirmModal = ref(false)
const pendingVoiceBlob = ref<Blob | null>(null)
const pendingVoiceDuration = ref(0)
const pendingVoiceAttachment = computed<MessageAttachmentDTO | null>(() => {
  if (!pendingVoiceBlob.value) return null
  return {
    id: 'preview',
    url: URL.createObjectURL(pendingVoiceBlob.value),
    mimeType: 'audio/wav',
    fileSize: pendingVoiceBlob.value.size,
    duration: pendingVoiceDuration.value,
    createdAt: new Date(),
  }
})

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
watch(content, (val) => debouncer.call(val))

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
  }
  isVoiceActive.value = false
  voiceRecorderRef.value?.reset()
}

// Auto-stop at max duration: show confirmation modal instead of auto-sending
function handleVoiceRecordingMaxed(audioBlob: Blob, duration: number) {
  pendingVoiceBlob.value = audioBlob
  pendingVoiceDuration.value = duration
  showVoiceConfirmModal.value = true
}

async function handleVoiceConfirmSend() {
  if (!pendingVoiceBlob.value) return
  showVoiceConfirmModal.value = false
  const result = await messageStore.sendVoiceMessage(
    props.recipientProfile.id,
    pendingVoiceBlob.value,
    pendingVoiceDuration.value
  )
  if (result.success) {
    emit('message:sent', result.data!)
  }
  pendingVoiceBlob.value = null
  pendingVoiceDuration.value = 0
  isVoiceActive.value = false
  voiceRecorderRef.value?.reset()
}

function handleVoiceConfirmCancel() {
  showVoiceConfirmModal.value = false
  pendingVoiceBlob.value = null
  pendingVoiceDuration.value = 0
  isVoiceActive.value = false
  voiceRecorderRef.value?.reset()
}

function handleVoiceRecordingCancelled() {
  isVoiceActive.value = false
}

function handleVoiceRecordingError(error: string) {
  toast.error(error)
}
</script>

<template>
  <div class="w-100">
    <StoreErrorOverlay
      v-if="messageStore.error"
      :error="messageStore.error"
    />

    <div class="mb-2">
      <div
        v-if="showTags"
        class="mb-2 opacity-75"
      >
        <div class="d-inline-block">
          <TagList
            :tags="props.recipientProfile.tags"
            class="d-inline-block"
          />
        </div>
        <div class="d-inline-block">
          <LanguageList
            :languages="props.recipientProfile.languages"
            class="d-inline-block"
          />
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
          class="mb-2"
          @keydown="handleKeyPress"
          :placeholder="$t('messaging.message_input_placeholder')"
          :disabled="messageStore.isSending || isVoiceActive"
        />
        <div class="form-text text-muted d-flex justify-content-between align-items-start">
          <div class="d-flex align-items-center gap-1">
            <!-- Unified voice recorder (left) -->
            <VoiceRecorder
              ref="voiceRecorderRef"
              :disabled="messageStore.isSending"
              :max-duration="voiceMaxDuration"
              @recording:started="() => (isVoiceActive = true)"
              @recording:completed="handleVoiceRecordingCompleted"
              @recording:maxed="handleVoiceRecordingMaxed"
              @recording:cancelled="handleVoiceRecordingCancelled"
              @recording:error="handleVoiceRecordingError"
            />
            <a
              v-if="canCall && !isVoiceActive"
              class="btn btn-outline-secondary btn-sm icon-btn-round"
              role="button"
              :title="$t('calls.call_button_title')"
              @click="emit('call:start')"
            >
              <IconCall class="svg-icon" />
            </a>
          </div>

          <div
            v-if="!isVoiceActive"
            data-testid="send-controls"
            class="d-flex align-items-center gap-2"
          >
            <BButton
              v-if="sendMode === 'click'"
              variant="primary"
              size="sm"
              @click="handleSendMessage"
              :disabled="content.trim() === '' || isVoiceActive"
              :title="$t('messaging.send_message_button')"
            >
              {{ $t('messaging.send_message_button').toUpperCase() }}
            </BButton>
            <small
              v-else
              class="text-muted"
            >
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
              <BDropdownItem
                @click="setSendMode('enter')"
                :active="sendMode === 'enter'"
              >
                <input
                  type="radio"
                  class="form-check-input me-2"
                  :checked="sendMode === 'enter'"
                  disabled
                />
                {{ $t('messaging.send_mode_press_enter') }}
              </BDropdownItem>
              <BDropdownItem
                @click="setSendMode('click')"
                :active="sendMode === 'click'"
              >
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
    </div>

    <!-- Voice message confirmation modal (shown on auto-stop at max duration) -->
    <BModal
      :show="showVoiceConfirmModal"
      :title="$t('messaging.voice.confirm_send_title')"
      :ok-title="$t('messaging.voice.confirm_send_button')"
      :cancel-title="$t('messaging.voice.confirm_cancel_button')"
      ok-variant="primary"
      cancel-variant="link"
      cancel-class="link-secondary"
      centered
      size="sm"
      data-testid="voice-confirm-modal"
      @ok.prevent="handleVoiceConfirmSend"
      @cancel="handleVoiceConfirmCancel"
      @hidden="handleVoiceConfirmCancel"
    >
      <div
        v-if="pendingVoiceAttachment"
        class="bg-secondary text-white p-2"
        style="border-radius: 15px"
      >
        <VoiceMessage
          :attachment="pendingVoiceAttachment"
          :is-mine="true"
        />
      </div>
    </BModal>
  </div>
</template>

<style scoped>
.send-mode-menu {
  min-width: 200px;
}

.icon-btn-round {
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>

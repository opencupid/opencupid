<script setup lang="ts">
import { ref, watch, watchEffect, computed, inject, nextTick, useId, type Ref } from 'vue'
import { funnel } from 'remeda'
import type { BFormTextarea } from 'bootstrap-vue-next'
import { useI18n } from 'vue-i18n'

import { useLocalStore } from '@/store/localStore'

import { type MessageDTO, type MessageAttachmentDTO } from '@zod/messaging/messaging.dto'
import { type MessageRecipient, type OwnerProfile } from '@zod/profile/profile.dto'

import TagList from '@/features/shared/profiledisplay/TagList.vue'
import LanguageList from '@/features/shared/profiledisplay/LanguageList.vue'
import IconCall from '@/assets/icons/interface/call.svg'
import IconSend from '@/assets/icons/interface/send.svg'
import IconPhoto from '@/assets/icons/interface/photo.svg'
import IconCross from '@/assets/icons/interface/cross.svg'
import SendModeSelector from './SendModeSelector.vue'
import { useToast } from 'vue-toastification'
import VoiceRecorder from './VoiceRecorder.vue'
import VoiceMessage from './VoiceMessage.vue'
import ImageUpload from '@/features/images/components/ImageUpload.vue'
import { useUserContentImageStore } from '@/features/images/stores/userContentImageStore'
import { useMessageStore } from '../stores/messageStore'

const toast = useToast()
const { t } = useI18n()

const messageStore = useMessageStore()
messageStore.error = null

const props = withDefaults(
  defineProps<{
    recipientProfile: MessageRecipient
    conversationId: string | null
    showTags?: boolean
    canCall?: boolean
    noResize?: boolean
  }>(),
  { noResize: true }
)
const emit = defineEmits<{
  (e: 'message:sent', message: MessageDTO | null): void
  (e: 'call:start'): void
}>()

const viewerProfile = inject<Ref<OwnerProfile>>('viewerProfile')

const senderLanguages = computed<string[]>(() => viewerProfile?.value?.languages ?? [])

const commonLanguages = computed<string[]>(() =>
  senderLanguages.value.filter((lang) => (props.recipientProfile.languages ?? []).includes(lang))
)

const shouldShowLanguageList = computed(() => senderLanguages.value.length > 1)

const content = ref('')
const isVoiceActive = ref(false)
const isSending = ref(false)
const voiceRecorderRef = ref<InstanceType<typeof VoiceRecorder> | null>(null)
const voiceMaxDuration = parseInt(__APP_CONFIG__.VOICE_MESSAGE_MAX_DURATION, 10)

// Draft-keyed gallery store: ImageUpload pushes the freshly uploaded image
// into store.images; the watcher below sends the message and resets the store.
const imageDraftKey = useId()
const imageStore = useUserContentImageStore({ draftKey: imageDraftKey })

watch(
  () => imageStore.images.map((i) => i.id).join(','),
  (ids) => {
    if (!ids) return
    void sendImageMessage(imageStore.images.map((i) => i.id))
  }
)

async function sendImageMessage(imageIds: string[]) {
  if (imageIds.length === 0) return
  isSending.value = true
  const result = await messageStore.sendMessage(props.recipientProfile.id, '', imageIds)
  isSending.value = false
  // Reset so the store is empty before the next upload — prevents the watcher
  // from re-firing on the same set of ids.
  imageStore.$reset()
  if (result.success) {
    emit('message:sent', result.data!)
  }
}

// Pasting an image into the textarea attaches it exactly like picking a file:
// it is uploaded into the draft store and the watcher above sends it.
const PASTEABLE_IMAGE_TYPES = ['image/jpeg', 'image/png']

async function handlePaste(event: ClipboardEvent) {
  const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
    PASTEABLE_IMAGE_TYPES.includes(f.type)
  )
  // No image on the clipboard — let the browser paste text as usual.
  if (!file) return
  event.preventDefault()
  // One attachment at a time: a second upload landing mid-send would be sent twice.
  if (imageStore.isLoading || isSending.value) return

  const res = await imageStore.upload(file, '')
  if (!res.success) {
    const code = res.message ?? 'unknown'
    toast.error(
      t(`profiles.image_upload.errors.${code}`, t('profiles.image_upload.errors.unknown'))
    )
  }
}

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
    localStore.setMessageDraft(props.recipientProfile.id, val)
  },
  {
    reducer: (_previous, val) => val,
    minQuietPeriodMs: 3000,
  }
)

// Watch message input field and save draft in localStore. While editing, the
// textarea holds the edited message, not the draft.
watch(content, (val) => {
  if (!isEditing.value) debouncer.call(val)
})

watchEffect(() => {
  // Load the draft message from local store when the component is mounted
  const draft = localStore.getMessageDraft(props.recipientProfile.id)
  if (draft) content.value = draft
})

const textarea = ref<InstanceType<typeof BFormTextarea>>()

// Give focus to textarea - expose method to parent which can call it
// when it's rendered or when needed
const focusTextarea = () => textarea.value?.focus()

defineExpose({
  focusTextarea,
})

// Send mode preference
const sendMode = computed(() => localStore.getSendMode)

// Editing reuses this textarea: entering edit mode puts the draft aside and
// loads the message text; leaving it brings the draft back.
const canEditHere = computed(
  () =>
    props.conversationId !== null &&
    props.conversationId === messageStore.activeConversation?.conversationId
)
const editingMessage = computed(() => (canEditHere.value ? messageStore.editingMessage : null))
const isEditing = computed(() => editingMessage.value !== null)
// Non-null exactly while this form is in edit mode.
const draftBeforeEdit = ref<string | null>(null)

watch(
  () => editingMessage.value?.id,
  async (id, previousId) => {
    if (id && !previousId) {
      draftBeforeEdit.value = content.value
      content.value = editingMessage.value!.content
      await nextTick()
      const el = textarea.value?.element
      el?.focus()
      el?.setSelectionRange(content.value.length, content.value.length)
    } else if (!id && previousId && draftBeforeEdit.value !== null) {
      // Edit mode ended without this form finishing it: someone wrote after
      // the message. Keep the typed text so it can be sent as a new message.
      draftBeforeEdit.value = null
      toast.info(t('messaging.edit_no_longer_possible'))
    }
  }
)

function exitEditMode() {
  content.value = draftBeforeEdit.value ?? ''
  draftBeforeEdit.value = null
  messageStore.cancelEditing()
  focusTextarea()
}

async function handleSaveEdit() {
  const message = editingMessage.value
  if (!message || !canSend.value) return
  const trimmedContent = content.value.trim()
  if (trimmedContent === message.content) return exitEditMode()

  const result = await messageStore.editMessage(message.id, trimmedContent)
  if (result.success) return exitEditMode()
  // The server no longer allows the edit (a reply landed first): drop out of
  // edit mode, the watcher above keeps the text.
  if (result.status === 404 || result.status === 409) messageStore.cancelEditing()
}

const handleKeyPress = (event: KeyboardEvent) => {
  if (sendMode.value === 'enter' && event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSendMessage()
  } else if (event.key === 'Escape' && isEditing.value) {
    // Esc cancels the edit only; the panel/modal around the conversation
    // listens for Esc on its own element and would close too.
    event.preventDefault()
    event.stopPropagation()
    exitEditMode()
  } else if (
    event.key === 'ArrowUp' &&
    !isEditing.value &&
    content.value === '' &&
    canEditHere.value &&
    messageStore.editableMessage
  ) {
    event.preventDefault()
    messageStore.startEditing()
  }
}

const canSend = computed(() => content.value.trim() !== '')

async function handleSendMessage() {
  if (isEditing.value) return handleSaveEdit()
  if (!canSend.value) return
  const trimmedContent = content.value.trim()
  isSending.value = true
  const result = await messageStore.sendMessage(props.recipientProfile.id, trimmedContent)
  isSending.value = false
  focusTextarea()
  if (result.success) {
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
            v-if="shouldShowLanguageList"
            :languages="commonLanguages"
            class="d-inline-block"
          />
        </div>
      </div>

      <!-- TODO(#1109): Elevate VoiceRecorder over the dimmed textarea as
           a focused overlay when recording. Current sibling-in-flow layout
           causes jumps with translateY/margin approaches. -->

      <div>
        <div
          v-if="isEditing"
          class="d-flex align-items-center justify-content-between small text-muted mb-1"
          data-testid="edit-banner"
        >
          <span>{{ $t('messaging.editing_message') }}</span>
          <button
            type="button"
            class="btn btn-link btn-sm p-0 text-muted"
            data-testid="edit-cancel"
            :title="$t('messaging.cancel_edit')"
            :aria-label="$t('messaging.cancel_edit')"
            @click="exitEditMode"
          >
            <IconCross class="svg-icon" />
          </button>
        </div>
        <BFormTextarea
          id="content-input"
          ref="textarea"
          v-model="content"
          rows="1"
          max-rows="5"
          :no-resize="noResize"
          class="mb-2"
          :class="{ 'opacity-25': isVoiceActive }"
          @keydown="handleKeyPress"
          @paste="handlePaste"
          :placeholder="$t('messaging.message_input_placeholder')"
          :disabled="messageStore.isSending || isVoiceActive"
        />
        <div class="d-flex justify-content-between align-items-start">
          <div
            v-if="!isEditing"
            class="d-flex align-items-center gap-2"
          >
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
              class="btn btn-secondary btn-rounded"
              role="button"
              :title="$t('calls.call_button_title')"
              @click="emit('call:start')"
            >
              <IconCall class="svg-icon" />
            </a>
            <ImageUpload
              :store="imageStore"
              :preview="false"
              :button-title="$t('messaging.attach_image')"
              button-class="btn btn-secondary btn-rounded"
            >
              <template #button>
                <IconPhoto class="svg-icon" />
              </template>
            </ImageUpload>
          </div>

          <div
            v-if="!isVoiceActive"
            data-testid="send-controls"
            class="d-flex align-items-center gap-2 ms-auto"
          >
            <BButton
              v-if="sendMode === 'click'"
              variant="primary"
              size="md"
              @click="handleSendMessage"
              :disabled="!canSend || isVoiceActive || isSending"
              :title="
                isEditing ? $t('messaging.save_edit_button') : $t('messaging.send_message_button')
              "
            >
              <IconSend class="svg-icon" />
              {{
                isEditing ? $t('messaging.save_edit_button') : $t('messaging.send_message_button')
              }}
            </BButton>
            <small
              v-else
              class="text-muted"
            >
              {{ $t('messaging.send_mode_press_enter') }}
            </small>
            <SendModeSelector />
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

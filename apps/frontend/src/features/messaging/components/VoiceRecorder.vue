<script setup lang="ts">
import { computed, watch } from 'vue'
import { useVoiceRecorder } from '@/features/shared/composables/useVoiceRecorder'

// Import icons
import MicIcon from '@/assets/icons/interface/mic.svg'
import Mic2Icon from '@/assets/icons/interface/mic-2.svg'

const props = defineProps<{
  disabled?: boolean
  maxDuration?: number
  hideIdleButton?: boolean
}>()

const emit = defineEmits<{
  (e: 'recording:started'): void
  (e: 'recording:completed', blob: Blob, duration: number): void
  (e: 'recording:cancelled'): void
  (e: 'recording:error', error: string): void
}>()

const {
  isSupported,
  state,
  duration,
  audioBlob,
  error,
  permissionDenied,
  startRecording,
  stopRecording,
  cancelRecording,
  reset,
  formatDuration,
  maxDuration: recorderMaxDuration,
} = useVoiceRecorder(props.maxDuration || 120)

// Computed properties
const isIdle = computed(() => state.value === 'idle')
const isRecording = computed(() => state.value === 'recording')
const isCompleted = computed(() => state.value === 'completed')
const isError = computed(() => state.value === 'error')
const canRecord = computed(() => isSupported.value && !props.disabled)

const buttonClass = computed(() => {
  if (isRecording.value) return 'btn-danger'
  if (isCompleted.value) return 'btn-success'
  if (isError.value) return 'btn-warning'
  return 'btn-outline-primary'
})

const progressPercentage = computed(() => {
  return Math.min((duration.value / recorderMaxDuration) * 100, 100)
})

// Watch for state changes and emit events
watch(state, (newState) => {
  if (newState === 'recording') {
    emit('recording:started')
  } else if (newState === 'completed' && audioBlob.value) {
    emit('recording:completed', audioBlob.value, duration.value)
  } else if (newState === 'error' && error.value) {
    emit('recording:error', error.value)
  }
})

// Methods
const handleRecordClick = async () => {
  if (isIdle.value) {
    await startRecording()
  } else if (isRecording.value) {
    stopRecording()
  } else if (isCompleted.value) {
    reset()
  }
}

const handleCancel = () => {
  cancelRecording()
  emit('recording:cancelled')
}

const handleRetryPermission = async () => {
  await startRecording()
}

defineExpose({ triggerStart: handleRecordClick })
</script>

<template>
  <div class="voice-recorder">
    <!-- Main record button -->
    <div class="d-flex align-items-center gap-2">
      <BButton
        v-if="canRecord && !(props.hideIdleButton && isIdle)"
        :class="buttonClass"
        size="sm"
        :disabled="props.disabled"
        @click="handleRecordClick"
        :title="isIdle ? $t('messaging.voice.start_recording') : 
               isRecording ? $t('messaging.voice.stop_recording') : 
               isCompleted ? $t('messaging.voice.record_again') : 
               $t('messaging.voice.record')"
      >
        <component :is="isRecording ? Mic2Icon : MicIcon" class="svg-icon" />
        <span class="ms-1" v-if="isRecording">{{ formatDuration() }}</span>
        <span class="ms-1" v-else-if="isCompleted">{{ formatDuration() }}</span>
      </BButton>

      <!-- Cancel button when recording or completed -->
      <BButton
        v-if="(isRecording || isCompleted) && canRecord"
        variant="outline-secondary"
        size="sm"
        @click="handleCancel"
        :title="$t('messaging.voice.cancel')"
      >
        <i class="fas fa-times"></i>
      </BButton>
    </div>

    <!-- Recording progress bar -->
    <div v-if="isRecording" class="mt-2">
      <BProgressBar
        :value="progressPercentage"
        variant="danger"
        :max="100"
        height="4px"
        class="recording-progress"
      />
      <small class="text-muted">
        {{ $t('messaging.voice.max_duration', { duration: recorderMaxDuration }) }}
      </small>
    </div>

    <!-- Permission denied message -->
    <div v-if="permissionDenied" class="mt-2 p-2 bg-warning-subtle border border-warning rounded">
      <small class="text-warning-emphasis">
        <i class="fas fa-exclamation-triangle me-1"></i>
        {{ $t('messaging.voice.permission_denied') }}
      </small>
      <div class="mt-1">
        <BButton size="sm" variant="outline-warning" @click="handleRetryPermission">
          {{ $t('messaging.voice.retry_permission') }}
        </BButton>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="isError && !permissionDenied && error" class="mt-2 p-2 bg-danger-subtle border border-danger rounded">
      <small class="text-danger-emphasis">
        <i class="fas fa-exclamation-circle me-1"></i>
        {{ error }}
      </small>
    </div>

    <!-- Unsupported browser message -->
    <div v-if="!isSupported" class="mt-2 p-2 bg-info-subtle border border-info rounded">
      <small class="text-info-emphasis">
        <i class="fas fa-info-circle me-1"></i>
        {{ $t('messaging.voice.unsupported_browser') }}
      </small>
    </div>
  </div>
</template>

<style scoped>
.voice-recorder {
  position: relative;
}

.recording-progress {
  border-radius: 2px;
  overflow: hidden;
}

.btn {
  transition: all 0.2s ease;
}

.btn-danger {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}
</style>

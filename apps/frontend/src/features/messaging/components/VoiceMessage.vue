<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { MessageAttachmentDTO } from '@zod/messaging/messaging.dto'

const props = defineProps<{
  attachment: MessageAttachmentDTO
  isMine?: boolean
}>()

const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Computed properties
const duration = computed(() => props.attachment.duration || 0)
const progress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)

// Format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Audio event handlers
const handleLoadedData = () => {
  isLoading.value = false
}

const handleTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

const handleEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
}

const handleError = () => {
  error.value = 'Failed to load voice message'
  isLoading.value = false
}

// Control methods
const togglePlayback = () => {
  if (!audioRef.value || error.value) return

  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
  } else {
    audioRef.value.play().catch((err) => {
      console.error('Failed to play audio:', err)
      error.value = 'Failed to play voice message'
    })
    isPlaying.value = true
  }
}

const seek = (event: Event) => {
  if (!audioRef.value || !duration.value) return
  
  const target = event.target as HTMLInputElement
  const seekTime = (parseFloat(target.value) / 100) * duration.value
  audioRef.value.currentTime = seekTime
  currentTime.value = seekTime
}

// Construct audio URL - this should match your backend media serving setup
const audioUrl = computed(() => {
  // Assuming the backend serves media files from a /media endpoint
  return `/api/media/${props.attachment.filePath}`
})

onMounted(() => {
  if (audioRef.value) {
    audioRef.value.addEventListener('loadeddata', handleLoadedData)
    audioRef.value.addEventListener('timeupdate', handleTimeUpdate)
    audioRef.value.addEventListener('ended', handleEnded)
    audioRef.value.addEventListener('error', handleError)
  }
})

onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.removeEventListener('loadeddata', handleLoadedData)
    audioRef.value.removeEventListener('timeupdate', handleTimeUpdate)
    audioRef.value.removeEventListener('ended', handleEnded)
    audioRef.value.removeEventListener('error', handleError)
  }
})
</script>

<template>
  <div class="voice-message" :class="{ 'voice-message--mine': isMine }">
    <!-- Hidden audio element -->
    <audio
      ref="audioRef"
      :src="audioUrl"
      preload="metadata"
      style="display: none"
    />

    <div class="voice-controls d-flex align-items-center gap-2">
      <!-- Play/Pause button -->
      <BButton
        size="sm"
        variant="link"
        class="p-1 text-white voice-play-btn"
        :disabled="isLoading || !!error"
        @click="togglePlayback"
      >
        <div v-if="isLoading" class="spinner-border spinner-border-sm" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <i v-else-if="error" class="fas fa-exclamation-triangle"></i>
        <i v-else-if="isPlaying" class="fas fa-pause"></i>
        <i v-else class="fas fa-play"></i>
      </BButton>

      <!-- Waveform/Progress container -->
      <div class="voice-progress-container flex-grow-1">
        <div class="voice-waveform position-relative">
          <!-- Progress bar -->
          <input
            type="range"
            min="0"
            max="100"
            :value="progress"
            class="voice-progress-slider"
            :disabled="isLoading || !!error || duration === 0"
            @input="seek"
          />
          
          <!-- Visual waveform placeholder -->
          <div class="waveform-bars d-flex align-items-center gap-1">
            <div 
              v-for="i in 20" 
              :key="i" 
              class="waveform-bar"
              :style="{ height: `${Math.random() * 16 + 4}px` }"
            ></div>
          </div>
        </div>

        <!-- Time display -->
        <div class="voice-time-display d-flex justify-content-between mt-1">
          <small class="text-white-50">{{ formatTime(currentTime) }}</small>
          <small class="text-white-50">{{ formatTime(duration) }}</small>
        </div>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="voice-error mt-1">
      <small class="text-danger">{{ error }}</small>
    </div>
  </div>
</template>

<style scoped>
.voice-message {
  min-width: 200px;
  max-width: 300px;
}

.voice-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none !important;
}

.voice-play-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.voice-progress-container {
  position: relative;
}

.voice-waveform {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
}

.voice-progress-slider {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.waveform-bars {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  height: 20px;
  z-index: 1;
  pointer-events: none;
}

.waveform-bar {
  background: rgba(255, 255, 255, 0.6);
  width: 2px;
  border-radius: 1px;
  transition: background-color 0.2s ease;
}

.voice-message--mine .waveform-bar {
  background: rgba(255, 255, 255, 0.8);
}

.voice-time-display small {
  font-size: 0.7rem;
}

.voice-error {
  text-align: center;
}

/* Custom range slider styles */
.voice-progress-slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.voice-waveform:hover .voice-progress-slider::-webkit-slider-thumb {
  opacity: 1;
}

.voice-progress-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.voice-waveform:hover .voice-progress-slider::-moz-range-thumb {
  opacity: 1;
}
</style>
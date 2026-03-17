import { ref, onUnmounted, readonly } from 'vue'
import { MediaRecorder, register, type IMediaRecorder } from 'extendable-media-recorder'
import { connect } from 'extendable-media-recorder-wav-encoder'
import voiceRecordingEndUrl from '@/assets/audio/voice-recording-end.mp3'

export type RecordingState = 'idle' | 'recording' | 'paused' | 'completed' | 'error'

// Register the WAV encoder once (idempotent — the library ignores duplicate registrations)
let encoderRegistered = false
async function ensureEncoder() {
  if (encoderRegistered) return
  await register(await connect())
  encoderRegistered = true
}

const endBeep = new Audio(voiceRecordingEndUrl)

export function useVoiceRecorder(maxDuration: number) {
  const isSupported = ref(false)
  const state = ref<RecordingState>('idle')
  const duration = ref(0)
  const audioBlob = ref<Blob | null>(null)
  const error = ref<string | null>(null)
  const permissionDenied = ref(false)
  const micNotFound = ref(false)
  const stoppedAtMax = ref(false)

  let recorder: IMediaRecorder | null = null
  let stream: MediaStream | null = null
  let durationTimer: number | null = null
  let dataChunks: Blob[] = []
  let cancelled = false

  // Check if recording is supported
  const checkSupport = () => {
    isSupported.value = !!(
      navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
    )
    return isSupported.value
  }

  // Request microphone permission and start recording
  const startRecording = async () => {
    if (!checkSupport()) {
      error.value = 'Voice recording not supported in this browser'
      state.value = 'error'
      return false
    }

    try {
      error.value = null
      permissionDenied.value = false
      duration.value = 0
      dataChunks = []
      cancelled = false
      stoppedAtMax.value = false

      // Ensure WAV encoder is registered before creating the recorder
      await ensureEncoder()

      // Get mic stream
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Create MediaRecorder that records WAV (PCM).
      // WAV is a raw format that cannot have container metadata issues,
      // unlike webm which breaks on QtWebEngine browsers.
      // The backend will transcode to MP3 after upload.
      recorder = new MediaRecorder(stream, { mimeType: 'audio/wav' })

      // Microphone access granted - now enter recording state
      state.value = 'recording'

      // Handle data available event
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          dataChunks.push(e.data)
        }
      }

      // Handle recording stop event
      recorder.onstop = () => {
        stopDurationTimer()
        cleanupStream()
        // If cancelled, don't overwrite the idle state set by cancelRecording
        if (cancelled) return
        audioBlob.value = new Blob(dataChunks, { type: 'audio/wav' })
        dataChunks = []
        state.value = 'completed'
      }

      // Handle errors
      recorder.onerror = () => {
        console.error('[VoiceRecorder] error')
        error.value = 'Recording failed'
        state.value = 'error'
        stopRecording()
      }

      // Start recording
      recorder.start(100) // Collect data every 100ms

      // Start duration timer
      startDurationTimer()

      return true
    } catch (err: any) {
      console.error('Failed to start recording:', err)

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        error.value =
          'Microphone permission denied. Please allow microphone access to record voice messages.'
        permissionDenied.value = true
      } else if (err.name === 'NotFoundError') {
        error.value = 'No microphone found. Please check your audio input device.'
        micNotFound.value = true
      } else {
        error.value = 'Failed to access microphone'
      }

      state.value = 'error'
      cleanupStream()
      return false
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    stopDurationTimer()
  }

  // Cancel recording and discard audio
  const cancelRecording = () => {
    cancelled = true
    stopRecording()
    audioBlob.value = null
    dataChunks = []
    duration.value = 0
    state.value = 'idle'
    error.value = null
    stoppedAtMax.value = false
  }

  // Reset to initial state
  const reset = () => {
    cancelRecording()
  }

  // Start duration timer
  const startDurationTimer = () => {
    durationTimer = window.setInterval(() => {
      duration.value += 1

      // Play warning beep 5 seconds before max duration
      if (duration.value === maxDuration - 5) {
        endBeep.play().catch(() => {})
      }

      // Auto-stop at max duration
      if (duration.value >= maxDuration) {
        stoppedAtMax.value = true
        stopRecording()
      }
    }, 1000)
  }

  // Stop duration timer
  const stopDurationTimer = () => {
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }
  }

  // Clean up media stream
  const cleanupStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      stream = null
    }
  }

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopDurationTimer()
    cleanupStream()
  })

  // Initialize support check
  checkSupport()

  return {
    // State
    isSupported: readonly(isSupported),
    state: readonly(state),
    duration: readonly(duration),
    audioBlob: readonly(audioBlob),
    error: readonly(error),
    permissionDenied: readonly(permissionDenied),
    micNotFound: readonly(micNotFound),
    stoppedAtMax: readonly(stoppedAtMax),

    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    reset,

    // Helpers
    formatDuration: (seconds?: number) => formatDuration(seconds ?? duration.value),
    maxDuration,
  }
}

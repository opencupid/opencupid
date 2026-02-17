import { ref, onUnmounted, readonly } from 'vue'

export type RecordingState = 'idle' | 'recording' | 'paused' | 'completed' | 'error'

export function useVoiceRecorder(maxDuration: number = 120) {
  const isSupported = ref(false)
  const state = ref<RecordingState>('idle')
  const duration = ref(0)
  const audioBlob = ref<Blob | null>(null)
  const error = ref<string | null>(null)
  const permissionDenied = ref(false)

  let mediaRecorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let durationTimer: number | null = null
  let chunks: BlobPart[] = []
  let cancelled = false

  // Check if MediaRecorder is supported
  const checkSupport = () => {
    isSupported.value = !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder === 'function'
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
      chunks = []
      cancelled = false

      // Request microphone access (may show permission prompt)
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Microphone access granted - now enter recording state
      state.value = 'recording'

      // Create MediaRecorder instance
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: getSupportedMimeType(),
      })

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      // Handle recording stop event
      mediaRecorder.onstop = () => {
        stopDurationTimer()
        cleanupStream()
        // If cancelled, don't overwrite the idle state set by cancelRecording
        if (cancelled) return
        // Use the recorder's actual mimeType (includes codec, e.g. "audio/webm;codecs=opus")
        // rather than re-querying getSupportedMimeType(), which strips codec info
        audioBlob.value = new Blob(chunks, {
          type: mediaRecorder!.mimeType || getSupportedMimeType(),
        })
        state.value = 'completed'
      }

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        error.value = 'Recording failed'
        state.value = 'error'
        stopRecording()
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms

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
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    stopDurationTimer()
  }

  // Cancel recording and discard audio
  const cancelRecording = () => {
    cancelled = true
    stopRecording()
    audioBlob.value = null
    chunks = []
    duration.value = 0
    state.value = 'idle'
    error.value = null
  }

  // Reset to initial state
  const reset = () => {
    cancelRecording()
  }

  // Start duration timer
  const startDurationTimer = () => {
    durationTimer = window.setInterval(() => {
      duration.value += 1

      // Auto-stop at max duration
      if (duration.value >= maxDuration) {
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

  // Get supported MIME type for recording
  const getSupportedMimeType = (): string => {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav']
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    return 'audio/webm' // Fallback
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

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('@/assets/audio/voice-recording-end.mp3', () => ({
  default: 'voice-recording-end.mp3',
}))

const mockRecorderInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  state: 'recording',
  ondataavailable: null as any,
  onstop: null as any,
  onerror: null as any,
  mimeType: 'audio/wav',
}

vi.mock('extendable-media-recorder', () => ({
  MediaRecorder: vi.fn(function () {
    return mockRecorderInstance
  }),
  register: vi.fn(),
}))

vi.mock('extendable-media-recorder-wav-encoder', () => ({
  connect: vi.fn(),
}))

const playMock = vi.fn().mockResolvedValue(undefined)
vi.stubGlobal(
  'Audio',
  vi.fn(function () {
    return { play: playMock, currentTime: 0 }
  })
)
afterAll(() => vi.unstubAllGlobals())

/** Mount a thin wrapper that calls the composable and exposes its return value. */
async function mountRecorder(maxDuration: number) {
  const mod = await import('../useVoiceRecorder')
  let result: ReturnType<typeof mod.useVoiceRecorder>
  const Wrapper = defineComponent({
    setup() {
      result = mod.useVoiceRecorder(maxDuration)
      return {}
    },
    render() {
      return null
    },
  })
  mount(Wrapper)
  return result!
}

/** Shared mock setup for recording start. */
async function startMockRecording(recorder: Awaited<ReturnType<typeof mountRecorder>>) {
  const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
  vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)
  // Reset recorder mock state
  mockRecorderInstance.state = 'recording'
  mockRecorderInstance.start.mockClear()
  mockRecorderInstance.stop.mockImplementation(() => {
    mockRecorderInstance.state = 'inactive' as any
  })
  await recorder.startRecording()
}

describe('useVoiceRecorder warning beep', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    playMock.mockResolvedValue(undefined)

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('plays warning beep 5 seconds before max duration', async () => {
    const recorder = await mountRecorder(10)
    await startMockRecording(recorder)

    // Advance to 4 seconds — no beep yet
    vi.advanceTimersByTime(4000)
    expect(playMock).not.toHaveBeenCalled()

    // Advance to 5 seconds (maxDuration - 5 = 5) — beep plays
    vi.advanceTimersByTime(1000)
    expect(recorder.duration.value).toBe(5)
    expect(playMock).toHaveBeenCalledOnce()
  })

  it('does not play beep if recording is stopped before threshold', async () => {
    const recorder = await mountRecorder(10)
    await startMockRecording(recorder)

    vi.advanceTimersByTime(3000)
    recorder.stopRecording()

    vi.advanceTimersByTime(5000)
    expect(playMock).not.toHaveBeenCalled()
  })

  it('does not play beep if recording is cancelled before threshold', async () => {
    const recorder = await mountRecorder(10)
    await startMockRecording(recorder)

    vi.advanceTimersByTime(2000)
    recorder.cancelRecording()

    vi.advanceTimersByTime(10000)
    expect(playMock).not.toHaveBeenCalled()
  })

  it('plays beep at correct time with custom maxDuration', async () => {
    const recorder = await mountRecorder(30)
    await startMockRecording(recorder)

    // Advance to 24 seconds — no beep
    vi.advanceTimersByTime(24000)
    expect(playMock).not.toHaveBeenCalled()

    // Advance to 25 seconds (30 - 5 = 25) — beep plays
    vi.advanceTimersByTime(1000)
    expect(recorder.duration.value).toBe(25)
    expect(playMock).toHaveBeenCalledOnce()
  })

  it('sets stoppedAtMax to true when auto-stopped at max duration', async () => {
    const recorder = await mountRecorder(10)
    await startMockRecording(recorder)

    expect(recorder.stoppedAtMax.value).toBe(false)

    // Advance to max duration — auto-stop triggers
    vi.advanceTimersByTime(10000)
    expect(recorder.stoppedAtMax.value).toBe(true)
  })

  it('keeps stoppedAtMax false when manually stopped', async () => {
    const recorder = await mountRecorder(10)
    await startMockRecording(recorder)

    vi.advanceTimersByTime(5000)
    recorder.stopRecording()

    expect(recorder.stoppedAtMax.value).toBe(false)
  })

  it('resets stoppedAtMax on reset', async () => {
    const recorder = await mountRecorder(10)
    await startMockRecording(recorder)

    vi.advanceTimersByTime(10000)
    expect(recorder.stoppedAtMax.value).toBe(true)

    recorder.reset()
    expect(recorder.stoppedAtMax.value).toBe(false)
  })
})

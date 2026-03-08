import { describe, it, expect, vi } from 'vitest'
import { promises as fsPromises } from 'fs'
import { execFileSync } from 'child_process'
import path from 'path'
import os from 'os'

const uploadTmpDirMock = vi.fn(() => os.tmpdir())

vi.mock('@/lib/media', () => ({
  uploadTmpDir: () => uploadTmpDirMock(),
}))

import { transcodeToMp3 } from '../../services/audioTranscoder'

function hasFfmpeg(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** Create a minimal valid WAV file (44-byte header, no audio data). */
function makeWavHeader(): Buffer {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(48000, 24)
  header.writeUInt32LE(96000, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(0, 40)
  return header
}

describe.skipIf(!hasFfmpeg())('transcodeToMp3', () => {
  it('transcodes WAV to MP3, returns path with .mp3 extension and size > 0', async () => {
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'transcode-mp3-'))
    uploadTmpDirMock.mockReturnValue(tmpDir)
    const wavPath = path.join(tmpDir, 'test.wav')
    await fsPromises.writeFile(wavPath, makeWavHeader())

    const result = await transcodeToMp3(wavPath)

    expect(result.path).toBe(path.join(tmpDir, 'test.mp3'))
    expect(result.size).toBeGreaterThan(0)

    // Output file exists
    await expect(fsPromises.access(result.path)).resolves.toBeUndefined()

    // Original WAV deleted
    await expect(fsPromises.access(wavPath)).rejects.toThrow()

    await fsPromises.rm(tmpDir, { recursive: true })
  })

  it('cleans up temp file and preserves WAV on ffmpeg failure', async () => {
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'transcode-fail-'))
    uploadTmpDirMock.mockReturnValue(tmpDir)
    const badPath = path.join(tmpDir, 'bad.wav')
    // Write garbage data that ffmpeg cannot decode
    await fsPromises.writeFile(badPath, 'not a wav file')

    await expect(transcodeToMp3(badPath)).rejects.toThrow('ffmpeg transcode failed')

    // Original file preserved
    await expect(fsPromises.access(badPath)).resolves.toBeUndefined()

    await fsPromises.rm(tmpDir, { recursive: true })
  })
})

import { promises as fsPromises } from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { uploadTmpDir } from '@/lib/media'

const execFileAsync = promisify(execFile)

/**
 * Transcodes a WAV file to MP3 using ffmpeg with loudnorm normalization.
 * Uses a temp directory on the same filesystem for atomic rename.
 * Returns the path and size of the transcoded file.
 * The original WAV file is deleted after successful transcode.
 */
export async function transcodeToMp3(inputPath: string): Promise<{ path: string; size: number }> {
  const finalPath = inputPath.replace(/\.wav$/i, '.mp3')
  const tmpDir = uploadTmpDir()
  await fsPromises.mkdir(tmpDir, { recursive: true })
  const tmpPath = path.join(tmpDir, path.basename(finalPath))

  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-af',
      'loudnorm=I=-24:LRA=11:TP=-1.5',
      '-ac',
      '1',
      '-ar',
      '48000',
      '-c:a',
      'libmp3lame',
      '-q:a',
      '4',
      tmpPath,
    ])
  } catch (err: any) {
    await fsPromises.unlink(tmpPath).catch(() => {})
    const stderr = err.stderr || ''
    throw new Error(`ffmpeg transcode failed: ${stderr}`)
  }

  try {
    await fsPromises.rename(tmpPath, finalPath)
  } catch (renameErr: any) {
    if (renameErr.code === 'EXDEV') {
      await fsPromises.copyFile(tmpPath, finalPath)
      await fsPromises.unlink(tmpPath)
    } else {
      throw renameErr
    }
  }
  const stats = await fsPromises.stat(finalPath)
  await fsPromises.unlink(inputPath)

  return { path: finalPath, size: stats.size }
}

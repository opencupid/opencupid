import path from 'path'
import fs from 'fs'

import cuid from 'cuid'
import { appConfig } from '@/lib/appconfig'
import { createHmac } from 'crypto'

export function uploadTmpDir() {
  return path.join(appConfig.MEDIA_UPLOAD_DIR, 'tmp')
}

export function getMediaRoot(): string {
  return appConfig.MEDIA_UPLOAD_DIR
}

/** Subdirectory names under the media root — single source of truth. */
export const MEDIA_SUBDIR = {
  TMP: 'tmp',
  IMAGES: 'images',
  VOICE: 'voice',
} as const

/** Resolve a DB storagePath to its on-disk path relative to mediaRoot. */
export function imageBasePath(storagePath: string): string {
  return path.posix.join(MEDIA_SUBDIR.IMAGES, storagePath)
}

/** Resolve a DB voice filePath to its on-disk path relative to mediaRoot. */
export function voiceBasePath(storagePath: string): string {
  return path.posix.join(MEDIA_SUBDIR.VOICE, storagePath)
}

export function checkUserContentRoot(): boolean {
  const root = getMediaRoot()
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  }
  try {
    fs.accessSync(root, fs.constants.W_OK)
  } catch (error) {
    return false
  }
  // Ensure subdirectories exist
  for (const sub of Object.values(MEDIA_SUBDIR)) {
    const dir = path.join(root, sub)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
  return true
}

export function signUrl(url: string): string {
  const exp = Math.floor(Date.now() / 1000) + appConfig.IMAGE_URL_HMAC_TTL_SECONDS
  // Sign only the relative path (strip MEDIA_URL_BASE prefix) to match nginx lua verification
  const prefix = appConfig.MEDIA_URL_BASE + '/'
  const pathToSign = url.startsWith(prefix) ? url.slice(prefix.length) : url
  const data = `${pathToSign}:${exp}`
  const h = createHmac('sha256', appConfig.AUTH_IMG_HMAC_SECRET).update(data).digest('hex')
  return `${url}?exp=${exp}&sig=${h}`
}

type ImageLocation = {
  base: string
  relPath: string
  absPath: string
}

export async function makeImageLocation(storagePrefix: string): Promise<ImageLocation> {
  // Generate a CUID for the ProfileImage
  const base = cuid.slug()

  const mediaRoot = getMediaRoot()
  // relPath is what gets stored in DB — no images/ prefix
  const relPath = storagePrefix
  // absPath is the filesystem location — under images/ subdirectory
  const absPath = path.join(mediaRoot, MEDIA_SUBDIR.IMAGES, relPath)
  await fs.promises.mkdir(absPath, { recursive: true })

  return {
    base,
    relPath,
    absPath,
  }
}

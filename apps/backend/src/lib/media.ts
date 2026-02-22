import path, { dirname } from 'path'
import fs from 'fs'

import cuid from 'cuid'
import { appConfig } from '@/lib/appconfig'
import { createHmac } from 'crypto'

export function uploadTmpDir() {
  return path.join(appConfig.MEDIA_UPLOAD_DIR, 'tmp')
}

export function getImageRoot(): string {
  // Get the directory where the uploads are stored
  return appConfig.MEDIA_UPLOAD_DIR
}

export function checkImageRoot(): boolean {
  // Check if the upload directory exists, and create it if it doesn't
  const uploadDir = getImageRoot()
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }
  // Check if the directory is writable
  try {
    fs.accessSync(uploadDir, fs.constants.W_OK)
  } catch (error) {
    return false
  }
  const tmpDir = uploadTmpDir()
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true })
  }
  return true
}

type UrlSignature = {
  exp: number
  sig: string
}

export function signUrl(url: string): string {
  const exp = Math.floor(Date.now() / 1000) + appConfig.IMAGE_URL_HMAC_TTL_SECONDS
  // Sign only the relative path (strip IMAGE_URL_BASE prefix) to match nginx lua verification
  const pathToSign = url.replace(new RegExp(`^${appConfig.IMAGE_URL_BASE}/`), '')
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

  const imageRoot = getImageRoot()
  const relPath = path.posix.join(storagePrefix)
  const absPath = path.join(imageRoot, relPath)
  await fs.promises.mkdir(dirname(absPath), { recursive: true })

  return {
    base,
    relPath,
    absPath,
  }
}

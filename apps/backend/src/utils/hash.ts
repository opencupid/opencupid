import { createReadStream } from 'fs'
import { createHash } from 'crypto'
import bcrypt from 'bcrypt'

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

/**
 * Streams the file at `filePath` through a SHA-256 hasher
 * and returns the hex digest.
 */
export async function generateContentHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)

    stream.on('error', err => reject(err))
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

import path from 'path'
import fs from 'fs'

/**
 * Walk up from cwd looking for a file by name.
 * Returns the absolute path of the first match, or undefined.
 */
export function findUpSync(name: string): string | undefined {
  let dir = process.cwd()
  while (true) {
    const candidate = path.join(dir, name)
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

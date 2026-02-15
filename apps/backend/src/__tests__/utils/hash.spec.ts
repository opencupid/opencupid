import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword, generateContentHash } from '../../utils/hash'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('hashPassword & comparePassword', () => {
  it('hashes a password and verifies it', async () => {
    const hashed = await hashPassword('secret123')
    expect(hashed).not.toBe('secret123')
    expect(await comparePassword('secret123', hashed)).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hashed = await hashPassword('secret123')
    expect(await comparePassword('wrong', hashed)).toBe(false)
  })

  it('produces different hashes for the same password', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    expect(h1).not.toBe(h2)
  })
})

describe('generateContentHash', () => {
  const tmpFile = join(tmpdir(), `test-hash-${Date.now()}.txt`)

  it('returns a hex SHA-256 digest', async () => {
    writeFileSync(tmpFile, 'hello world')
    const hash = await generateContentHash(tmpFile)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    unlinkSync(tmpFile)
  })

  it('returns same hash for same content', async () => {
    writeFileSync(tmpFile, 'deterministic')
    const h1 = await generateContentHash(tmpFile)
    const h2 = await generateContentHash(tmpFile)
    expect(h1).toBe(h2)
    unlinkSync(tmpFile)
  })

  it('rejects on missing file', async () => {
    await expect(generateContentHash('/nonexistent/file')).rejects.toThrow()
  })
})

import { test, expect, describe } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Version Generation', () => {
  test('version.json should exist and have correct structure', () => {
    const versionPath = path.join(process.cwd(), 'dist', 'version.json')
    
    expect(fs.existsSync(versionPath)).toBe(true)
    
    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'))
    
    // Check that required fields exist
    expect(versionData).toHaveProperty('version')
    expect(versionData).toHaveProperty('commit')
    expect(versionData).toHaveProperty('timestamp')
    expect(versionData).toHaveProperty('app')
    expect(versionData).toHaveProperty('frontend')
    expect(versionData).toHaveProperty('backend')
    
    // Check that versions are not 'unknown'
    expect(versionData.app).not.toBe('unknown')
    expect(versionData.frontend).not.toBe('unknown')
    expect(versionData.backend).not.toBe('unknown')
    
    // Check timestamp is valid ISO string
    expect(() => new Date(versionData.timestamp)).not.toThrow()
  })

  test('package versions should match package.json files', () => {
    const versionPath = path.join(process.cwd(), 'dist', 'version.json')
    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'))
    
    // Read actual package.json versions
    const repoRoot = path.join(process.cwd(), '..', '..')
    const appPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
    const frontendPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps', 'frontend', 'package.json'), 'utf8'))
    const backendPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
    
    expect(versionData.app).toBe(appPkg.version)
    expect(versionData.frontend).toBe(frontendPkg.version)
    expect(versionData.backend).toBe(backendPkg.version)
  })
})
#!/usr/bin/env node

/**
 * Updates the root package.json version to match the highest version
 * of frontend or backend packages after changesets version bump
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function compareVersions(a, b) {
  const aParts = a.split('.').map(Number)
  const bParts = b.split('.').map(Number)
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0
    const bPart = bParts[i] || 0
    
    if (aPart > bPart) return 1
    if (aPart < bPart) return -1
  }
  
  return 0
}

function updateRootVersion() {
  const repoRoot = join(__dirname, '..')
  
  // Read package versions
  const rootPkgPath = join(repoRoot, 'package.json')
  const frontendPkgPath = join(repoRoot, 'apps', 'frontend', 'package.json')
  const backendPkgPath = join(repoRoot, 'apps', 'backend', 'package.json')
  
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'))
  const frontendPkg = JSON.parse(readFileSync(frontendPkgPath, 'utf8'))
  const backendPkg = JSON.parse(readFileSync(backendPkgPath, 'utf8'))
  
  // Find the highest version
  const versions = [frontendPkg.version, backendPkg.version]
  const highestVersion = versions.reduce((highest, current) => 
    compareVersions(current, highest) > 0 ? current : highest
  )
  
  // Update root package version if necessary
  if (rootPkg.version !== highestVersion) {
    console.log(`Updating root package version from ${rootPkg.version} to ${highestVersion}`)
    rootPkg.version = highestVersion
    writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n')
  } else {
    console.log(`Root package version ${rootPkg.version} is already up to date`)
  }
}

updateRootVersion()
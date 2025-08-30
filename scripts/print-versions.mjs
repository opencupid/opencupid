#!/usr/bin/env node

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Reads package.json version from a given path
 */
function getPackageVersion(packagePath) {
  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
    return packageJson.version || 'unknown'
  } catch (err) {
    console.warn(`Warning: Could not read package version from ${packagePath}:`, err.message)
    return 'unknown'
  }
}

/**
 * Prints version information for all packages
 */
function printVersions() {
  const repoRoot = join(__dirname, '..')
  
  // Get package versions
  const appVersion = getPackageVersion(join(repoRoot, 'package.json'))
  const frontendVersion = getPackageVersion(join(repoRoot, 'apps', 'frontend', 'package.json'))
  const backendVersion = getPackageVersion(join(repoRoot, 'apps', 'backend', 'package.json'))
  const sharedVersion = getPackageVersion(join(repoRoot, 'packages', 'shared', 'package.json'))
  
  console.log('📋 Package Versions:')
  console.log(`   App (bundle):     ${appVersion}`)
  console.log(`   Frontend:         ${frontendVersion}`)
  console.log(`   Backend:          ${backendVersion}`)
  console.log(`   Shared:           ${sharedVersion}`)
  
  // Also output in a format useful for CI
  if (process.argv.includes('--ci')) {
    console.log('\n🤖 CI Format:')
    console.log(`APP_VERSION=${appVersion}`)
    console.log(`FRONTEND_VERSION=${frontendVersion}`)
    console.log(`BACKEND_VERSION=${backendVersion}`)
    console.log(`SHARED_VERSION=${sharedVersion}`)
  }
}

printVersions()
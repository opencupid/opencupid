#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

/**
 * Reads package.json version from a given path
 */
function getPackageVersion(packagePath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    return packageJson.version || 'unknown'
  } catch (err) {
    console.warn(`Warning: Could not read package version from ${packagePath}:`, err.message)
    return 'unknown'
  }
}

/**
 * Generates version.json file with build-time metadata
 */
function generateVersionInfo() {
  const outputPath = path.join(__dirname, '..', 'dist', 'version.json')
  const repoRoot = path.join(__dirname, '..', '..', '..')
  
  let version = 'unknown'
  let commit = 'unknown'
  
  try {
    // Try to get git version using describe
    version = execSync('git describe --tags --always', { encoding: 'utf8' }).trim()
  } catch (err) {
    console.warn('Warning: Could not get git version:', err.message)
    try {
      // Fallback to just commit hash
      version = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    } catch (err2) {
      console.warn('Warning: Git not available, using fallback version')
    }
  }
  
  try {
    // Try to get full commit hash
    commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch (err) {
    console.warn('Warning: Could not get git commit hash:', err.message)
  }
  
  // Get package versions
  const appVersion = getPackageVersion(path.join(repoRoot, 'package.json'))
  const frontendVersion = getPackageVersion(path.join(repoRoot, 'apps', 'frontend', 'package.json'))
  const backendVersion = getPackageVersion(path.join(repoRoot, 'apps', 'backend', 'package.json'))
  
  const timestamp = new Date().toISOString()
  
  const versionInfo = {
    version,
    commit,
    timestamp,
    app: appVersion,
    frontend: frontendVersion,
    backend: backendVersion
  }
  
  // Ensure dist directory exists
  const distDir = path.dirname(outputPath)
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }
  
  // Write version.json
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2))
  
  console.log('✅ Generated version.json:', versionInfo)
}

generateVersionInfo()
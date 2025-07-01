#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

/**
 * Generates version.json file with build-time metadata
 */
function generateVersionInfo() {
  const outputPath = path.join(__dirname, '..', 'dist', 'version.json')
  
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
  
  const timestamp = new Date().toISOString()
  
  const versionInfo = {
    version,
    commit,
    timestamp
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
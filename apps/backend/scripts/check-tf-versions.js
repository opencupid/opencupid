#!/usr/bin/env node

// This script verifies that TensorFlow versions are aligned correctly
// It helps prevent the "forwardFunc_1 is not a function" error

const fs = require('fs')
const path = require('path')

function checkTensorFlowVersions() {
  console.log('🔍 Checking TensorFlow version alignment...')
  
  const nodeModulesPath = path.join(__dirname, '../node_modules')
  
  // Look for all TensorFlow packages
  const tfPackages = []
  
  try {
    const packages = fs.readdirSync(nodeModulesPath)
    
    packages.forEach(pkg => {
      if (pkg.startsWith('@tensorflow') || pkg === 'face-api.js') {
        const pkgPath = path.join(nodeModulesPath, pkg)
        if (fs.statSync(pkgPath).isDirectory()) {
          const packageJsonPath = path.join(pkgPath, 'package.json')
          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
            tfPackages.push({
              name: packageJson.name,
              version: packageJson.version,
              dependencies: packageJson.dependencies || {},
              peerDependencies: packageJson.peerDependencies || {}
            })
          }
        }
      }
    })
    
    // Also check packages in .pnpm directory
    const pnpmPath = path.join(nodeModulesPath, '.pnpm')
    if (fs.existsSync(pnpmPath)) {
      const pnpmPackages = fs.readdirSync(pnpmPath)
      pnpmPackages.forEach(pkg => {
        if (pkg.includes('@tensorflow') || pkg.includes('face-api.js')) {
          const versionMatch = pkg.match(/(.+)@(.+)\//)
          if (versionMatch) {
            const [, name, version] = versionMatch
            if (name.startsWith('@tensorflow') || name === 'face-api.js') {
              tfPackages.push({ name, version, isFromPnpm: true })
            }
          }
        }
      })
    }
    
  } catch (error) {
    console.error('Error scanning packages:', error.message)
    return false
  }
  
  // Print findings
  console.log('\n📦 Found TensorFlow-related packages:')
  tfPackages.forEach(pkg => {
    console.log(`  ${pkg.name}@${pkg.version}${pkg.isFromPnpm ? ' (pnpm)' : ''}`)
    
    // Check for TensorFlow dependencies
    Object.entries({ ...pkg.dependencies, ...pkg.peerDependencies }).forEach(([dep, ver]) => {
      if (dep.startsWith('@tensorflow')) {
        console.log(`    └─ depends on ${dep}@${ver}`)
      }
    })
  })
  
  // Check for version conflicts
  const tfCoreVersions = tfPackages
    .filter(pkg => pkg.name === '@tensorflow/tfjs-core')
    .map(pkg => pkg.version)
  
  const uniqueVersions = [...new Set(tfCoreVersions)]
  
  if (uniqueVersions.length > 1) {
    console.log('\n❌ VERSION CONFLICT DETECTED!')
    console.log('Multiple @tensorflow/tfjs-core versions found:')
    uniqueVersions.forEach(version => {
      console.log(`  - ${version}`)
    })
    console.log('\nThis can cause the "forwardFunc_1 is not a function" error.')
    return false
  } else if (uniqueVersions.length === 1) {
    console.log(`\n✅ All @tensorflow/tfjs-core packages use version: ${uniqueVersions[0]}`)
    return true
  } else {
    console.log('\n⚠️  No @tensorflow/tfjs-core packages found')
    return true
  }
}

if (require.main === module) {
  const success = checkTensorFlowVersions()
  process.exit(success ? 0 : 1)
}

module.exports = { checkTensorFlowVersions }
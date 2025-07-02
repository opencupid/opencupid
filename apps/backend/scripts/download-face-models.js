#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const https = require('https')

const modelDir = path.join(__dirname, '../face-models')
const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'

// Models required for face detection
const models = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1'
]

async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath)
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', reject)
  })
}

async function downloadModels() {
  console.log('Downloading face-api.js models...')
  
  // Ensure directory exists
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true })
  }

  for (const model of models) {
    const url = `${baseUrl}/${model}`
    const filePath = path.join(modelDir, model)
    
    console.log(`Downloading ${model}...`)
    try {
      await downloadFile(url, filePath)
      console.log(`✅ Downloaded ${model}`)
    } catch (error) {
      console.error(`❌ Failed to download ${model}:`, error.message)
      throw error
    }
  }
  
  console.log('✅ All models downloaded successfully!')
}

if (require.main === module) {
  downloadModels().catch(error => {
    console.error('Failed to download models:', error)
    process.exit(1)
  })
}

module.exports = { downloadModels }
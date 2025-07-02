#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const path = require('path');

// Models needed for face detection with face-api.js
const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const modelsDir = path.join(__dirname, '../face-models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

async function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const url = baseUrl + filename;
    const filepath = path.join(modelsDir, filename);
    
    // Skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`Model ${filename} already exists, skipping...`);
      return resolve();
    }

    console.log(`Downloading ${filename}...`);
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (error) => {
      fs.unlink(filepath, () => {}); // Delete the file on error
      reject(error);
    });
  });
}

async function downloadModels() {
  try {
    console.log('Downloading face detection models...');
    
    for (const model of models) {
      await downloadFile(model);
    }
    
    console.log('✓ All models downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
    process.exit(1);
  }
}

downloadModels();
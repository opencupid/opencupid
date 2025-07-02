// Simple test to verify face detection compilation and basic functionality
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import * as canvas from 'canvas'
import * as tf from '@tensorflow/tfjs'
import * as faceapi from 'face-api.js'

console.log('Testing basic imports...')

try {
  console.log('✓ Sharp imported successfully')
  console.log('✓ Canvas imported successfully')
  console.log('✓ TensorFlow.js imported successfully')
  console.log('✓ Face-api.js imported successfully')
  
  // Test face-api.js monkey patch
  const { Canvas: FaceCanvas, Image: FaceImage, ImageData: FaceImageData } = canvas;
  (faceapi.env as any).monkeyPatch({ Canvas: FaceCanvas, Image: FaceImage, ImageData: FaceImageData });
  console.log('✓ Face-api.js monkey patch applied')
  
  // Check if models exist
  const modelsPath = path.join(__dirname, 'face-models')
  const manifestPath = path.join(modelsPath, 'tiny_face_detector_model-weights_manifest.json')
  
  if (fs.existsSync(manifestPath)) {
    console.log('✓ Face detection models found')
  } else {
    console.log('⚠ Face detection models not found')
  }
  
  console.log('✓ All basic imports and setup successful!')
  
} catch (error) {
  console.error('❌ Error in basic test:', error)
  process.exit(1)
}
import { FaceDetectionService } from './src/services/face-detection.service'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

async function createSimpleTestImage() {
  // Create a simple test image
  const testImage = await sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: { r: 200, g: 200, b: 200 }
    }
  })
  .png()
  .toBuffer()
  
  const outputPath = '/tmp/test-simple.png'
  await sharp(testImage).png().toFile(outputPath)
  
  return outputPath
}

async function testStandaloneFaceDetection() {
  console.log('Starting standalone face detection test...')
  
  try {
    // Create a simple test image
    const testImagePath = await createSimpleTestImage()
    console.log(`Created test image: ${testImagePath}`)
    
    // Test face detection service standalone
    const faceService = FaceDetectionService.getInstance()
    console.log('Testing face detection...')
    
    const result = await faceService.detectFaces(testImagePath)
    console.log('Face detection result:', result)
    
    if (result.hasFace) {
      console.log('✓ Face detected!')
      console.log('Crop box:', result.cropBox)
      
      // Test auto-crop
      const outputDir = '/tmp/test-output'
      fs.mkdirSync(outputDir, { recursive: true })
      const outputPath = path.join(outputDir, 'test-face-crop.jpg')
      
      const cropSuccess = await faceService.autoCrop(testImagePath, outputPath)
      console.log(`Auto-crop ${cropSuccess ? 'successful' : 'failed'}`)
      
    } else {
      console.log('No face detected (expected for simple geometric image)')
    }
    
    // Test with configuration changes
    console.log('\nTesting configuration changes...')
    const config = faceService.getConfig()
    console.log('Current config:', config)
    
    faceService.updateConfig({
      detectionThreshold: 0.3,  // Lower threshold
      minFaceSize: 0.1,         // Smaller minimum face size
    })
    
    const newConfig = faceService.getConfig()
    console.log('Updated config:', newConfig)
    
    console.log('✓ Standalone face detection test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error in standalone face detection test:', error)
    throw error
  }
}

testStandaloneFaceDetection()
  .then(() => console.log('Standalone test completed successfully'))
  .catch(error => {
    console.error('Standalone test failed:', error)
    process.exit(1)
  })
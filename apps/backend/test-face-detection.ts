import { FaceDetectionService } from '../src/services/face-detection.service'
import path from 'path'
import fs from 'fs'

async function testFaceDetection() {
  console.log('Starting face detection test...')
  
  try {
    const faceService = FaceDetectionService.getInstance()
    
    // Check if we have any test images
    const testImageDir = path.join(__dirname, '../test-data/images/avatar')
    
    if (!fs.existsSync(testImageDir)) {
      console.log('No test images found, creating a simple test...')
      return
    }
    
    const files = fs.readdirSync(testImageDir)
    const imageFiles = files.filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'))
    
    if (imageFiles.length === 0) {
      console.log('No test images found')
      return
    }
    
    console.log(`Found ${imageFiles.length} test images`)
    
    // Test with first image
    const testImage = path.join(testImageDir, imageFiles[0])
    console.log(`Testing with image: ${imageFiles[0]}`)
    
    const result = await faceService.detectFaces(testImage)
    console.log('Face detection result:', result)
    
    if (result.hasFace) {
      console.log('✓ Face detected successfully!')
      console.log('Crop box:', result.cropBox)
      
      // Test auto-crop
      const outputDir = '/tmp/test-output'
      fs.mkdirSync(outputDir, { recursive: true })
      const outputPath = path.join(outputDir, 'test-face-crop.jpg')
      
      const cropSuccess = await faceService.autoCrop(testImage, outputPath)
      console.log(`Auto-crop ${cropSuccess ? 'successful' : 'failed'}`)
      
      if (cropSuccess) {
        console.log(`Cropped image saved to: ${outputPath}`)
      }
    } else {
      console.log('No face detected in test image')
    }
    
  } catch (error) {
    console.error('Error in face detection test:', error)
  }
}

testFaceDetection()
  .then(() => console.log('Test completed'))
  .catch(error => console.error('Test failed:', error))
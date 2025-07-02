import { FaceDetectionService } from '../src/services/face-detection.service'
import { ImageService } from '../src/services/image.service'
import path from 'path'
import fs from 'fs'

async function testFaceDetection() {
  console.log('Starting face detection test...')
  
  try {
    const faceService = FaceDetectionService.getInstance()
    const imageService = ImageService.getInstance()
    
    // Use one of the sample images from the node_modules
    const testImage = path.join(__dirname, 'node_modules/@fastify/static/test/static/shallow/sample.jpg')
    
    if (!fs.existsSync(testImage)) {
      console.log('Sample test image not found, skipping test')
      return
    }
    
    console.log(`Testing with sample image: ${testImage}`)
    
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
      console.log('No face detected in test image (expected - it may not contain a face)')
    }
    
    // Test the ImageService integration
    console.log('\nTesting ImageService integration...')
    const outputDir = '/tmp/test-output'
    fs.mkdirSync(outputDir, { recursive: true })
    
    const processed = await imageService.processImage(testImage, outputDir, 'test-sample')
    console.log('Image processing result:', processed)
    console.log('Generated variants:', Object.keys(processed.variants))
    
    if (processed.variants.face) {
      console.log('✓ Face-cropped version generated!')
    } else {
      console.log('No face-cropped version (expected if no face detected)')
    }
    
  } catch (error) {
    console.error('Error in face detection test:', error)
  }
}

testFaceDetection()
  .then(() => console.log('Test completed'))
  .catch(error => console.error('Test failed:', error))
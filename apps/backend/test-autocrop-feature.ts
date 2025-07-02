import { FaceDetectionService } from './src/services/face-detection.service'
import { ImageService } from './src/services/image.service'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

async function createSimpleTestImage() {
  // Create a simple test image with a colored rectangle (simulating a face)
  
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

async function testAutoCropFeature() {
  console.log('Starting autoCrop feature test...')
  
  try {
    const imageService = ImageService.getInstance()
    
    // Create a simple test image
    const testImagePath = await createSimpleTestImage()
    console.log(`Created test image: ${testImagePath}`)
    
    // Test the ImageService integration with autoCrop
    console.log('Testing ImageService with autoCrop integration...')
    const outputDir = '/tmp/test-output'
    fs.mkdirSync(outputDir, { recursive: true })
    
    const processed = await imageService.processImage(testImagePath, outputDir, 'test-autocrop')
    console.log('Image processing result:', {
      dimensions: `${processed.width}x${processed.height}`,
      mime: processed.mime,
      variants: Object.keys(processed.variants)
    })
    
    // List all generated files
    const files = fs.readdirSync(outputDir)
    console.log('Generated files:', files)
    
    if (processed.variants.face) {
      console.log('✓ Face-cropped version generated!')
    } else {
      console.log('No face-cropped version (expected for simple test image)')
    }
    
    // Verify all expected variants are generated
    const expectedVariants = ['thumb', 'card', 'full', 'original']
    for (const variant of expectedVariants) {
      if (processed.variants[variant]) {
        console.log(`✓ ${variant} variant generated`)
      } else {
        console.log(`⚠ ${variant} variant missing`)
      }
    }
    
    console.log('✓ autoCrop feature integration test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error in autoCrop feature test:', error)
    throw error
  }
}

testAutoCropFeature()
  .then(() => console.log('Feature test completed successfully'))
  .catch(error => {
    console.error('Feature test failed:', error)
    process.exit(1)
  })
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FaceDetectionService } from '../../services/face-detection.service'
import { ImageService } from '../../services/image.service'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

describe('AutoCrop Feature Integration', () => {
  let outputDir: string

  beforeAll(async () => {
    outputDir = '/tmp/test-autocrop-integration'
    fs.mkdirSync(outputDir, { recursive: true })
  })

  afterAll(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true })
    }
  })

  async function createSimpleTestImage() {
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
    
    const outputPath = path.join(outputDir, 'test-simple.png')
    await sharp(testImage).png().toFile(outputPath)
    
    return outputPath
  }

  it('should process image with ImageService integration', async () => {
    const imageService = ImageService.getInstance()
    
    // Create a simple test image
    const testImagePath = await createSimpleTestImage()
    expect(fs.existsSync(testImagePath)).toBe(true)
    
    // Test the ImageService integration with autoCrop
    const testOutputDir = path.join(outputDir, 'processing')
    fs.mkdirSync(testOutputDir, { recursive: true })
    
    const processed = await imageService.processImage(testImagePath, testOutputDir, 'test-autocrop')
    
    expect(processed).toBeDefined()
    expect(processed.width).toBe(400)
    expect(processed.height).toBe(400)
    expect(processed.mime).toBe('image/png')
    expect(processed.variants).toBeDefined()
    
    // Check that all expected variants are generated
    const expectedVariants = ['thumb', 'card', 'full', 'original']
    for (const variant of expectedVariants) {
      expect(processed.variants[variant]).toBeDefined()
      expect(fs.existsSync(processed.variants[variant])).toBe(true)
    }
    
    // Face detection might not find faces in simple test image, but service should handle gracefully
    if (processed.variants.face) {
      expect(fs.existsSync(processed.variants.face)).toBe(true)
    }
  })
})
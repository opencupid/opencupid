import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

import { ImageProcessor } from '../../services/imageprocessor'
import { ImageService } from '../../services/image.service'

const TEST_IMAGE_PATH = path.resolve(__dirname, './fixtures/face.jpg')
const ROTATED_TEST_IMAGE_PATH = path.resolve(__dirname, './fixtures/face-rotated.jpg')
const TMP_DIR = path.resolve(__dirname, '/tmp/rotation-tests')

let initialized = false
let imageService: ImageService

describe('Image Rotation Bug', () => {
  beforeAll(async () => {
    if (!initialized) {
      await ImageProcessor.initialize()
      initialized = true
    }
    
    imageService = ImageService.getInstance()
    await fs.mkdir(TMP_DIR, { recursive: true })
    
    // Create a test image with EXIF orientation if it doesn't exist
    try {
      await fs.access(ROTATED_TEST_IMAGE_PATH)
    } catch {
      const buffer = await fs.readFile(TEST_IMAGE_PATH)
      // Create an image with EXIF orientation 6 (90 degrees CW rotation needed)
      await sharp(buffer)
        .rotate(90)
        .withMetadata({ orientation: 6 })
        .jpeg()
        .toFile(ROTATED_TEST_IMAGE_PATH)
    }
  })

  it('should apply consistent rotation across all image variants', async () => {
    const buffer = await fs.readFile(ROTATED_TEST_IMAGE_PATH)
    
    // Verify our test image has orientation data
    const metadata = await sharp(buffer).metadata()
    expect(metadata.orientation).toBe(6)
    
    const processor = new ImageProcessor(buffer)
    await processor.analyze()
    
    const baseName = 'rotation-test'
    
    // Test the current behavior
    const thumbPath = path.join(TMP_DIR, `${baseName}-thumb.webp`)
    const fullPath = path.join(TMP_DIR, `${baseName}-full.webp`)
    
    // Simulate extractAndResize behavior (used by thumb, card, profile)
    const crop = await processor.getCropRegion(150, 150)
    await processor.extractAndResize(crop, 150, 150, thumbPath)
    
    // Simulate resizeOriginal behavior (used by medium, full)
    await processor.resizeOriginal(400, undefined, 'inside', fullPath)
    
    // Check if both outputs have consistent orientation
    const thumbMeta = await sharp(thumbPath).metadata()
    const fullMeta = await sharp(fullPath).metadata()
    
    console.log('Thumb dimensions:', thumbMeta.width, 'x', thumbMeta.height)
    console.log('Full dimensions:', fullMeta.width, 'x', fullMeta.height)
    
    // After the fix, both methods should handle EXIF orientation consistently
    // Both should NOT apply EXIF rotation (consistent with original file behavior)
    expect(thumbMeta.width).toBe(150)
    expect(thumbMeta.height).toBe(150)
    
    // The full variant should now use the same orientation handling as cropped variants
    // For a landscape source image (2048x1536), resizing to max width 400 should give ~400x300
    expect(fullMeta.width).toBe(400)
    expect(fullMeta.height).toBe(300) // Consistent with no EXIF rotation applied
  })

  it('should demonstrate that rotation is now consistent', async () => {
    const buffer = await fs.readFile(ROTATED_TEST_IMAGE_PATH)
    
    // Test what happens when we use the two different approaches
    const testDir = path.join(TMP_DIR, 'consistency-test')
    await fs.mkdir(testDir, { recursive: true })
    
    // Method 1: Create new Sharp instance (extractAndResize approach)
    const method1Path = path.join(testDir, 'method1-new-instance.webp')
    await sharp(buffer)
      .resize(400, 400, { fit: 'inside' })
      .webp({ quality: 85 })
      .toFile(method1Path)
    
    // Method 2: Use ImageProcessor instance (resizeOriginal approach)  
    const method2Path = path.join(testDir, 'method2-processor-instance.webp')
    const processor = new ImageProcessor(buffer)
    await processor.resizeOriginal(400, 400, 'inside', method2Path)
    
    const method1Meta = await sharp(method1Path).metadata()
    const method2Meta = await sharp(method2Path).metadata()
    
    console.log('Method 1 (new instance):', method1Meta.width, 'x', method1Meta.height)
    console.log('Method 2 (processor instance):', method2Meta.width, 'x', method2Meta.height)
    
    // After the fix, both methods should produce the same dimensions
    // Both should ignore EXIF orientation and treat the image as 2048x1536 landscape
    expect(method1Meta.width).toBe(400)
    expect(method1Meta.height).toBe(300)
    expect(method2Meta.width).toBe(400)
    expect(method2Meta.height).toBe(300)
    
    // Verify they are now consistent
    expect(method1Meta.width).toBe(method2Meta.width)
    expect(method1Meta.height).toBe(method2Meta.height)
  })
})
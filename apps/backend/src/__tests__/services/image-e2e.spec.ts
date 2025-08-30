import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

import { ImageProcessor } from '../../services/imageprocessor'
import { ImageService } from '../../services/image.service'

const ROTATED_TEST_IMAGE_PATH = path.resolve(__dirname, './fixtures/face-rotated.jpg')
const TMP_DIR = path.resolve(__dirname, '/tmp/e2e-tests')

let initialized = false
let imageService: ImageService

describe('End-to-End Image Processing After Fix', () => {
  beforeAll(async () => {
    if (!initialized) {
      await ImageProcessor.initialize()
      initialized = true
    }
    
    imageService = ImageService.getInstance()
    await fs.mkdir(TMP_DIR, { recursive: true })
  })

  it('should process all image variants with consistent orientation handling', async () => {
    const baseName = 'e2e-test'
    
    // Process the image using the actual ImageService
    const result = await imageService.processImage(ROTATED_TEST_IMAGE_PATH, TMP_DIR, baseName)
    
    expect(result.variants).toBeDefined()
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
    
    // Verify all expected variants were created
    const expectedVariants = ['thumb', 'card', 'profile', 'medium', 'full', 'original']
    for (const variant of expectedVariants) {
      expect(result.variants[variant]).toBeDefined()
      expect(await fs.access(result.variants[variant]).then(() => true).catch(() => false)).toBe(true)
    }
    
    // Check dimensions and aspect ratios for consistency
    const variantMeta = {}
    for (const [name, filePath] of Object.entries(result.variants)) {
      const meta = await sharp(filePath).metadata()
      variantMeta[name] = { width: meta.width, height: meta.height, aspectRatio: meta.width / meta.height }
    }
    
    console.log('=== Variant Dimensions ===')
    for (const [name, meta] of Object.entries(variantMeta)) {
      console.log(`${name}: ${meta.width} x ${meta.height} (ratio: ${meta.aspectRatio.toFixed(3)})`)
    }
    
    // For the test image with orientation 6 (2048x1536 landscape), 
    // after our fix, all variants should treat it as landscape (no EXIF rotation)
    
    // Square variants should be square
    expect(variantMeta.thumb.width).toBe(150)
    expect(variantMeta.thumb.height).toBe(150)
    expect(variantMeta.card.width).toBe(400)
    expect(variantMeta.card.height).toBe(400)
    
    // Non-square variants should have consistent landscape aspect ratio (~1.33)
    const nonSquareVariants = ['profile', 'medium', 'full', 'original']
    const aspectRatios = nonSquareVariants.map(name => variantMeta[name].aspectRatio)
    const avgRatio = aspectRatios.reduce((a, b) => a + b, 0) / aspectRatios.length
    const maxDeviation = Math.max(...aspectRatios.map(r => Math.abs(r - avgRatio)))
    
    console.log(`Average aspect ratio: ${avgRatio.toFixed(3)}, max deviation: ${maxDeviation.toFixed(3)}`)
    
    // All non-square variants should have similar aspect ratios (within 0.1 tolerance)
    expect(maxDeviation).toBeLessThan(0.1)
    
    // Original should match the source image dimensions (no EXIF rotation applied)
    const sourceMeta = await sharp(ROTATED_TEST_IMAGE_PATH).metadata()
    expect(variantMeta.original.width).toBe(sourceMeta.width)
    expect(variantMeta.original.height).toBe(sourceMeta.height)
    
    // Profile variant should be 4:3 aspect ratio as specified
    expect(variantMeta.profile.width).toBe(720)
    expect(variantMeta.profile.height).toBe(540)
  })
})
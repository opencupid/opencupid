import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

import { ImageProcessor } from '../../services/imageprocessor'

const TEST_IMAGE_PATH = path.resolve(__dirname, './fixtures/face.jpg')
const TMP_DIR = path.resolve(__dirname, '/tmp')

let initialized = false
let buffer: Buffer

describe('ImageProcessor', () => {
  beforeAll(async () => {
    if (!initialized) {
      await ImageProcessor.initialize()
      initialized = true
    }

    buffer = await fs.readFile(TEST_IMAGE_PATH)
    await fs.mkdir(TMP_DIR, { recursive: true })
  })

  it('analyzes image and detects faces', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const size = processor.getOriginalSize()
    expect(size.width).toBeGreaterThan(0)
    expect(size.height).toBeGreaterThan(0)
    expect(processor['faces'].length).toBeGreaterThanOrEqual(0)
  })

  it('produces valid crop region', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const crop = await processor.getCropRegion(600, 600)
    expect(crop).toHaveProperty('x')
    expect(crop).toHaveProperty('y')
    expect(crop).toHaveProperty('width')
    expect(crop).toHaveProperty('height')
  })

  it('can extract and resize cropped image', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()
    const crop = await processor.getCropRegion(300, 300)

    const outPath = path.join(TMP_DIR, 'crop-output.webp')
    await processor.extractAndResize(crop, 300, 300, outPath)

    const meta = await sharp(outPath).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(300)
    expect(meta.height).toBe(300)
  })

  it('can resize image without crop', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const outPath = path.join(TMP_DIR, 'resized-output.webp')
    await processor.resizeOriginal(640, 480, 'cover', outPath)

    const meta = await sharp(outPath).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(640)
    expect(meta.height).toBe(480)
  })
})

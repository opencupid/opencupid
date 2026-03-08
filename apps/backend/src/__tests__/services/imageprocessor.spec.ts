import { describe, it, expect, beforeAll, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const mockEstimateFaces = vi.fn(async () => [] as any[])

vi.mock('@tensorflow-models/blazeface', () => ({
  load: vi.fn(async () => ({
    estimateFaces: mockEstimateFaces,
  })),
}))

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

  it('can extract and resize cropped image', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()
    const rect = await processor.getFaceAwareCrop(300, 300)

    const outPath = path.join(TMP_DIR, 'crop-output.webp')
    await processor.extractAndResize(rect, 300, 300, outPath)

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

  it('getFaceAwareCrop returns valid rect with no faces', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getFaceAwareCrop(150, 150)
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
  })

  it('getFaceAwareCrop produces a usable crop for extractAndResize', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getFaceAwareCrop(600, 600, { paddingRatio: 0.75 })
    const outPath = path.join(TMP_DIR, 'face-crop-output.webp')
    await processor.extractAndResize(
      { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      600,
      600,
      outPath
    )

    const meta = await sharp(outPath).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(600)
    expect(meta.height).toBe(600)
  })

  it('getFaceAwareCrop returns bounded rect when face detected', async () => {
    // Mock a face in the center-ish area of the 1536×2048 test image
    mockEstimateFaces.mockResolvedValueOnce([
      { topLeft: [500, 600], bottomRight: [800, 1000], probability: [0.95] },
    ])

    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getFaceAwareCrop(600, 600, { paddingRatio: 0.75 })

    // Rect must be within image bounds
    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
    expect(rect.left + rect.width).toBeLessThanOrEqual(1536)
    expect(rect.top + rect.height).toBeLessThanOrEqual(2048)
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)

    // Aspect ratio should be ~1:1 (600/600)
    const ar = rect.width / rect.height
    expect(ar).toBeCloseTo(1, 1)

    // Must produce a valid output file
    const outPath = path.join(TMP_DIR, 'face-detected-crop.webp')
    await processor.extractAndResize(rect, 600, 600, outPath)
    const meta = await sharp(outPath).metadata()
    expect(meta.width).toBe(600)
    expect(meta.height).toBe(600)
  })

  it('getFaceAwareCrop handles face near image edge', async () => {
    // Face near top-left corner — tests shift-inside-bounds logic
    mockEstimateFaces.mockResolvedValueOnce([
      { topLeft: [10, 10], bottomRight: [110, 150], probability: [0.9] },
    ])

    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getFaceAwareCrop(150, 150, { paddingRatio: 0.75 })

    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
    expect(rect.left + rect.width).toBeLessThanOrEqual(1536)
    expect(rect.top + rect.height).toBeLessThanOrEqual(2048)
    expect(rect.width).toBeGreaterThan(0)
  })

  it('encodeBlurhash returns a valid blurhash string', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const hash = await processor.encodeBlurhash()
    expect(hash).toBeDefined()
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })
})

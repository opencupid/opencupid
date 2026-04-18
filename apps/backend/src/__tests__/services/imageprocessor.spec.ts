import { describe, it, expect, beforeAll, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const { mockEstimateFaces, mockSmartcrop } = vi.hoisted(() => ({
  mockEstimateFaces: vi.fn(async () => [] as any[]),
  mockSmartcrop: vi.fn(async (_img: any, opts: any) => ({
    topCrop: { x: 100, y: 50, width: opts.width, height: opts.height },
  })),
}))

vi.mock('@tensorflow-models/face-detection', () => ({
  SupportedModels: { MediaPipeFaceDetector: 'MediaPipeFaceDetector' },
  createDetector: vi.fn(async () => ({
    estimateFaces: mockEstimateFaces,
  })),
}))

vi.mock('smartcrop-sharp', () => ({
  default: { crop: mockSmartcrop },
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
    const rect = await processor.getSmartCrop(300, 300)

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

  it('getSmartCrop returns valid rect with no faces', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getSmartCrop(150, 150)
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
  })

  it('getSmartCrop produces a usable crop for extractAndResize', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getSmartCrop(600, 600)
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

  it('getSmartCrop passes face boosts to smartcrop', async () => {
    mockEstimateFaces.mockResolvedValueOnce([
      {
        box: { xMin: 500, yMin: 600, xMax: 800, yMax: 1000, width: 300, height: 400 },
        keypoints: [],
      },
    ])

    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getSmartCrop(600, 600)

    // Verify smartcrop was called with the face as a boost using a heavy
    // weight — small faces in large frames need this to outscore high-detail
    // non-face regions (clothing, saturated backgrounds).
    expect(mockSmartcrop).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        width: 600,
        height: 600,
        boost: [
          {
            x: 500,
            y: 600,
            width: 300,
            height: 400,
            weight: 10,
          },
        ],
      })
    )

    // Rect comes from the mock topCrop
    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
    expect(rect.width).toBe(600)
    expect(rect.height).toBe(600)
  })

  it('getSmartCrop calls smartcrop without boost when no faces detected', async () => {
    mockEstimateFaces.mockResolvedValueOnce([])
    mockSmartcrop.mockClear()

    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    await processor.getSmartCrop(150, 150)

    expect(mockSmartcrop).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        width: 150,
        height: 150,
        boost: undefined,
      })
    )
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

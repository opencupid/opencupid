import { describe, it, expect, beforeAll, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

const mockEstimateFaces = vi.fn(async () => [] as any[])

vi.mock('@tensorflow-models/face-detection', () => ({
  SupportedModels: { MediaPipeFaceDetector: 'MediaPipeFaceDetector' },
  createDetector: vi.fn(async () => ({
    estimateFaces: mockEstimateFaces,
  })),
}))

// smartcrop-sharp is NOT mocked — this tests the real integration
import { ImageProcessor } from '../../services/imageprocessor'

const TEST_IMAGE_PATH = path.resolve(__dirname, './fixtures/face.jpg')

let buffer: Buffer

describe('ImageProcessor smartcrop integration', () => {
  beforeAll(async () => {
    await ImageProcessor.initialize()
    buffer = await fs.readFile(TEST_IMAGE_PATH)
  })

  it('getSmartCrop returns a valid rect from real smartcrop-sharp', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getSmartCrop(600, 450) // 4:3 aspect

    // Rect must have positive dimensions
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)

    // Rect must be within image bounds (1536x2048 fixture)
    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
    expect(rect.left + rect.width).toBeLessThanOrEqual(1536)
    expect(rect.top + rect.height).toBeLessThanOrEqual(2048)

    // Aspect ratio should approximate 4:3
    const ar = rect.width / rect.height
    expect(ar).toBeCloseTo(4 / 3, 0)
  })
})

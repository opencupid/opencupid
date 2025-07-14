import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { ImageService } from '../../services/image.service'
import { FaceDetectionService } from '../../services/face-detection.service'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

const imageService = ImageService.getInstance()
const faceService = FaceDetectionService.getInstance()
let outputDir: string
let inputDir: string

beforeAll(async () => {
  process.env.FACEAPI_ENABLED = 'true'
  vi.spyOn(faceService, 'autoCrop').mockImplementation(async (input, output) => {
    // simple center crop to simulate face detection success
    const img = sharp(input)
    const { width, height } = await img.metadata()
    if (!width || !height) return false
    const size = Math.min(width, height) / 2
    await img
      .extract({ left: Math.floor((width - size) / 2), top: Math.floor((height - size) / 2), width: Math.floor(size), height: Math.floor(size) })
      .jpeg({ quality: 90 })
      .toFile(output)
    return true
  })
  outputDir = '/tmp/test-generate-variants'
  inputDir = '/tmp/test-generate-variants-input'
  fs.mkdirSync(outputDir, { recursive: true })
  fs.mkdirSync(inputDir, { recursive: true })

  await Promise.all([
    sharp({ create: { width: 100, height: 100, channels: 3, background: 'white' } })
      .png()
      .toFile(path.join(inputDir, 'blank.png')),
    sharp({ create: { width: 300, height: 600, channels: 3, background: 'red' } })
      .jpeg({ quality: 90 })
      .toFile(path.join(inputDir, 'tall.jpg')),
    sharp({ create: { width: 600, height: 300, channels: 3, background: 'blue' } })
      .jpeg({ quality: 90 })
      .toFile(path.join(inputDir, 'wide.jpg')),
    sharp({ create: { width: 200, height: 200, channels: 3, background: 'green' } })
      .jpeg({ quality: 90 })
      .toFile(path.join(inputDir, 'face.jpg')),
  ])
})

afterAll(() => {
  vi.restoreAllMocks()
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true })
  }
  if (fs.existsSync(inputDir)) {
    fs.rmSync(inputDir, { recursive: true, force: true })
  }
})

const cases = ['blank.png', 'tall.jpg', 'wide.jpg', 'face.jpg']

describe('ImageService.generateVariants', () => {
  for (const file of cases) {
    it(`generates variants for ${file}`, async () => {
      const inputPath = path.join(inputDir, file)
      const baseName = path.parse(file).name
      const res = await imageService.generateVariants(inputPath, outputDir, baseName)

      expect(res.width).toBeGreaterThan(0)
      expect(res.height).toBeGreaterThan(0)

      expect(res.variants.thumb).toBeDefined()
      expect(res.variants.card).toBeDefined()
      expect(res.variants.full).toBeDefined()
      expect(res.variants.original).toBeUndefined()

      for (const variant of ['thumb', 'card', 'full']) {
        expect(fs.existsSync(res.variants[variant])).toBe(true)
      }

      if (file === 'face.jpg') {
        expect(res.variants.face).toBeDefined()
        if (res.variants.face) {
          expect(fs.existsSync(res.variants.face)).toBe(true)
        }
      }
    })
  }
})

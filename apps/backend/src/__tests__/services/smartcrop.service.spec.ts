import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { smartcropImage } from '../../services/smartcrop.service'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

describe('smartcrop.service', () => {
  let outputDir: string
  let testImage: string

  beforeAll(async () => {
    outputDir = '/tmp/test-smartcrop'
    fs.mkdirSync(outputDir, { recursive: true })
    testImage = path.join(outputDir, 'simple.jpg')
    await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 150, g: 150, b: 150 } }
    }).jpeg().toFile(testImage)
  })

  afterAll(() => {
    fs.rmSync(outputDir, { recursive: true, force: true })
  })

  it('returns crop coordinates', async () => {
    const crop = await smartcropImage(await fs.promises.readFile(testImage), { width: 96, height: 96 })
    expect(crop).toHaveProperty('x')
    expect(crop).toHaveProperty('y')
    expect(crop).toHaveProperty('width')
    expect(crop).toHaveProperty('height')
  })
})

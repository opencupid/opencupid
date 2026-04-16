import sharp from 'sharp'
import { encode as encodeBlurhashRaw } from 'blurhash'
import smartcrop from 'smartcrop-sharp'

import * as tf from '@tensorflow/tfjs'
// Suppress "install tfjs-node for speed" console warning — we intentionally use the CPU backend
tf.env().set('IS_NODE', false)
import '@tensorflow/tfjs-backend-cpu'
import * as blazeface from '@tensorflow-models/blazeface'

type FaceBox = { x: number; y: number; width: number; height: number }
type Rect = { left: number; top: number; width: number; height: number }

function toIntRect(r: Rect, iw: number, ih: number): sharp.Region {
  const left = Math.floor(r.left)
  const top = Math.floor(r.top)
  const right = Math.ceil(r.left + r.width)
  const bottom = Math.ceil(r.top + r.height)

  const clLeft = Math.max(0, Math.min(left, iw - 1))
  const clTop = Math.max(0, Math.min(top, ih - 1))
  const clRight = Math.max(clLeft + 1, Math.min(right, iw))
  const clBottom = Math.max(clTop + 1, Math.min(bottom, ih))

  return { left: clLeft, top: clTop, width: clRight - clLeft, height: clBottom - clTop }
}


export class ImageProcessor {
  private buffer: Buffer
  private sharpInstance: sharp.Sharp
  private metadata?: sharp.Metadata
  private faces: FaceBox[] = []
  private static detector: blazeface.BlazeFaceModel | null = null

  constructor(buffer: Buffer) {
    this.buffer = buffer
    this.sharpInstance = sharp(buffer, { failOn: 'error' })
    if (!ImageProcessor.detector) {
      throw new Error('BlazeFace detector not initialized. Call ImageProcessor.initialize() first.')
    }
  }

  static async initialize() {
    try {
      await tf.ready()
      this.detector = await blazeface.load()
    } catch (err) {
      console.error('Failed to load BlazeFace model:', err)
    }
  }

  private get detector() {
    if (!ImageProcessor.detector) throw new Error('Detector not initialized')
    return ImageProcessor.detector
  }

  async analyze(): Promise<void> {
    this.metadata = await this.sharpInstance.metadata()
    this.faces = await this.detectFaces()
  }

  private async detectFaces(): Promise<FaceBox[]> {
    const { data, info } = await sharp(this.buffer, { failOn: 'error' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3])
    try {
      const preds = await this.detector.estimateFaces(tensor, false)
      return preds.map((p) => {
        const [x1, y1] = p.topLeft as [number, number]
        const [x2, y2] = p.bottomRight as [number, number]
        return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
      })
    } finally {
      tensor.dispose()
    }
  }

  /**
   * Content-aware crop using smartcrop-sharp with face detection boosts.
   * Smartcrop scores candidate regions by skin tone, saturation, edges,
   * and rule-of-thirds composition. Detected faces are passed as boost
   * regions so they are prioritized in the scoring.
   */
  async getSmartCrop(targetW: number, targetH: number): Promise<Rect> {
    const boosts = this.faces.map((f) => ({
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      weight: 1.0,
    }))

    const result = await smartcrop.crop(this.buffer, {
      width: targetW,
      height: targetH,
      boost: boosts.length > 0 ? boosts : undefined,
    })

    const c = result.topCrop
    return { left: c.x, top: c.y, width: c.width, height: c.height }
  }

  async extractAndResize(
    crop: { x: number; y: number; width: number; height: number } | Rect,
    width: number,
    height: number,
    outputPath: string
  ) {
    const iw = this.metadata?.width ?? 0
    const ih = this.metadata?.height ?? 0

    const r: Rect =
      'x' in crop ? { left: crop.x, top: crop.y, width: crop.width, height: crop.height } : crop

    const rect =
      iw > 0 && ih > 0 && r.width > 0 && r.height > 0
        ? toIntRect(r, iw, ih)
        : { left: 0, top: 0, width: Math.max(1, iw), height: Math.max(1, ih) }

    await this.sharpInstance
      .clone()
      .extract(rect)
      .resize(width, height, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 85 })
      .toFile(outputPath)
  }

  async resizeOriginal(
    width: number,
    height: number | undefined,
    fit: keyof sharp.FitEnum,
    outputPath: string
  ) {
    await this.sharpInstance
      .clone()
      .resize({ width, height, fit })
      .webp({ quality: 85 })
      .toFile(outputPath)
  }

  getMime(): string {
    return `image/${this.metadata?.format ?? 'jpeg'}`
  }

  getOriginalSize(): { width?: number; height?: number } {
    return {
      width: this.metadata?.width,
      height: this.metadata?.height,
    }
  }

  async encodeBlurhash(componentX = 4, componentY = 3): Promise<string> {
    const { data, info } = await sharp(this.buffer, { failOn: 'error' })
      .resize(32, 32, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    return encodeBlurhashRaw(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      componentX,
      componentY
    )
  }
}

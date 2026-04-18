import sharp from 'sharp'
import { encode as encodeBlurhashRaw } from 'blurhash'
import smartcrop from 'smartcrop-sharp'

import * as tf from '@tensorflow/tfjs'
// Suppress "install tfjs-node for speed" console warning — we intentionally use the CPU backend
tf.env().set('IS_NODE', false)
import '@tensorflow/tfjs-backend-cpu'
import * as faceDetection from '@tensorflow-models/face-detection'

type FaceBox = { x: number; y: number; width: number; height: number }
type Rect = { left: number; top: number; width: number; height: number }

// Smartcrop boost weight for detected faces. Values ≥ 1 strongly bias crops
// toward faces; small faces in large frames need a high weight to outscore
// high-detail regions like clothing texture or saturated backgrounds.
const FACE_BOOST_WEIGHT = 10

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
  private static detector: faceDetection.FaceDetector | null = null

  constructor(buffer: Buffer) {
    this.buffer = buffer
    this.sharpInstance = sharp(buffer, { failOn: 'error' })
    if (!ImageProcessor.detector) {
      throw new Error('Face detector not initialized. Call ImageProcessor.initialize() first.')
    }
  }

  static async initialize() {
    try {
      await tf.ready()
      // MediaPipe FaceDetector full-range model: 192×192 input, trained on
      // wider scenes (up to ~5m). Unlike BlazeFace's selfie-tuned short-range
      // variant, it reliably detects smaller faces in full-body portraits.
      this.detector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        { runtime: 'tfjs', modelType: 'full' }
      )
    } catch (err) {
      console.error('Failed to load face detector:', err)
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
      const preds = await this.detector.estimateFaces(tensor, { flipHorizontal: false })
      return preds.map((p) => ({
        x: p.box.xMin,
        y: p.box.yMin,
        width: p.box.width,
        height: p.box.height,
      }))
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
      weight: FACE_BOOST_WEIGHT,
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

    // The extracted rect is already at the target aspect ratio, so resize
    // is a pure scale. Use a fixed centre position instead of attention to
    // avoid sharp's content-aware crop silently overriding our smartcrop
    // choice when toIntRect rounding shifts the aspect by a pixel.
    await this.sharpInstance
      .clone()
      .extract(rect)
      .resize(width, height, { fit: 'cover', position: 'centre' })
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

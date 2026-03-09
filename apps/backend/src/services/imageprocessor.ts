import sharp from 'sharp'
import { encode as encodeBlurhashRaw } from 'blurhash'

import * as tf from '@tensorflow/tfjs'
// Suppress "install tfjs-node for speed" console warning — we intentionally use the CPU backend
tf.env().set('IS_NODE', false)
import '@tensorflow/tfjs-backend-cpu'
import * as blazeface from '@tensorflow-models/blazeface'

type FaceBox = { x: number; y: number; width: number; height: number }
type Rect = { left: number; top: number; width: number; height: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function clampRect(r: Rect, iw: number, ih: number): Rect {
  const left = clamp(r.left, 0, iw)
  const top = clamp(r.top, 0, ih)
  const right = clamp(r.left + r.width, 0, iw)
  const bottom = clamp(r.top + r.height, 0, ih)
  return {
    left,
    top,
    width: clamp(right - left, 0, iw),
    height: clamp(bottom - top, 0, ih),
  }
}

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

function expandRect(r: Rect, paddingRatio: number): Rect {
  const padW = r.width * paddingRatio
  const padH = r.height * paddingRatio
  return {
    left: r.left - padW,
    top: r.top - padH,
    width: r.width + 2 * padW,
    height: r.height + 2 * padH,
  }
}

function ensureAspect(r: Rect, targetW: number, targetH: number): Rect {
  const targetAR = targetW / targetH
  const rAR = r.width / r.height
  if (Math.abs(rAR - targetAR) < 1e-6) return r

  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2

  if (rAR > targetAR) {
    const newH = r.width / targetAR
    return { left: cx - r.width / 2, top: cy - newH / 2, width: r.width, height: newH }
  } else {
    const newW = r.height * targetAR
    return { left: cx - newW / 2, top: cy - r.height / 2, width: newW, height: r.height }
  }
}

function maximizeWithinBounds(r: Rect, iw: number, ih: number): Rect {
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const halfW = r.width / 2
  const halfH = r.height / 2

  const scaleX = Math.min(cx, iw - cx) / halfW
  const scaleY = Math.min(cy, ih - cy) / halfH
  const scale = Math.max(1, Math.min(scaleX, scaleY))

  const newW = r.width * scale
  const newH = r.height * scale
  return { left: cx - newW / 2, top: cy - newH / 2, width: newW, height: newH }
}

function shiftInsideBounds(r: Rect, iw: number, ih: number): Rect {
  let { left, top } = r
  const w = Math.min(r.width, iw)
  const h = Math.min(r.height, ih)
  left = clamp(left, 0, iw - w)
  top = clamp(top, 0, ih - h)
  return { left, top, width: w, height: h }
}

export class ImageProcessor {
  private buffer: Buffer
  private sharpInstance: sharp.Sharp
  private metadata?: sharp.Metadata
  private faces: FaceBox[] = []
  private static detector: blazeface.BlazeFaceModel | null = null

  constructor(buffer: Buffer) {
    this.buffer = buffer
    this.sharpInstance = sharp(buffer)
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

  private pickPrimaryFace(): FaceBox | null {
    if (!this.faces.length) return null
    return this.faces.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b))
  }

  private async detectFaces(): Promise<FaceBox[]> {
    const { data, info } = await sharp(this.buffer)
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
   * Face-aware crop: builds a padded rect around the primary face, adjusted to the
   * target aspect ratio and maximized within image bounds. Falls back to full-image
   * (letting sharp.strategy.attention pick the crop) when no face is detected.
   */
  async getFaceAwareCrop(
    targetW: number,
    targetH: number,
    opts?: { paddingRatio?: number }
  ): Promise<Rect> {
    const paddingRatio = opts?.paddingRatio ?? 0.25
    const iw = this.metadata?.width ?? 0
    const ih = this.metadata?.height ?? 0
    if (iw <= 0 || ih <= 0) {
      return { left: 0, top: 0, width: Math.max(1, iw), height: Math.max(1, ih) }
    }

    const face = this.pickPrimaryFace()
    if (face) {
      const faceRect: Rect = { left: face.x, top: face.y, width: face.width, height: face.height }

      let r = expandRect(faceRect, paddingRatio)
      r = clampRect(r, iw, ih)
      r = ensureAspect(r, targetW, targetH)
      r = maximizeWithinBounds(r, iw, ih)
      r = shiftInsideBounds(r, iw, ih)

      const minAcceptable = Math.min(iw, ih) * 0.1
      if (r.width >= minAcceptable && r.height >= minAcceptable) {
        return r
      }
    }

    // No face or degenerate result — return full image and let
    // sharp.strategy.attention pick the best crop during resize
    return { left: 0, top: 0, width: iw, height: ih }
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
    const { data, info } = await sharp(this.buffer)
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

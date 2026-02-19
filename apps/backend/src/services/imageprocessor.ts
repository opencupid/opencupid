import sharp from 'sharp'
import { encode as encodeBlurhashRaw } from 'blurhash'

import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-cpu'
import * as blazeface from '@tensorflow-models/blazeface'
import smartcrop from 'smartcrop-sharp'
import { type Crop } from 'smartcrop'

type FaceBox = { x: number; y: number; width: number; height: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

type Rect = { left: number; top: number; width: number; height: number }
type IntRect = { left: number; top: number; width: number; height: number }

function toValidExtractRect(r: Rect, iw: number, ih: number): IntRect {
  // floor left/top, ceil right/bottom, then clamp to image box and enforce >= 1px
  const left = Math.floor(r.left)
  const top = Math.floor(r.top)
  const right = Math.ceil(r.left + r.width)
  const bottom = Math.ceil(r.top + r.height)

  const clLeft = Math.max(0, Math.min(left, iw - 1))
  const clTop = Math.max(0, Math.min(top, ih - 1))
  const clRight = Math.max(clLeft + 1, Math.min(right, iw))
  const clBottom = Math.max(clTop + 1, Math.min(bottom, ih))

  return {
    left: clLeft,
    top: clTop,
    width: clRight - clLeft,
    height: clBottom - clTop,
  }
}

function intersectClampToImage(r: Rect, iw: number, ih: number): Rect {
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

function rectFromCenterSize(cx: number, cy: number, w: number, h: number): Rect {
  return { left: cx - w / 2, top: cy - h / 2, width: w, height: h }
}

function ensureAspectEnclosing(r: Rect, targetW: number, targetH: number): Rect {
  const targetAR = targetW / targetH
  const rAR = r.width / r.height
  if (Math.abs(rAR - targetAR) < 1e-6) return r

  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2

  if (rAR > targetAR) {
    // too wide -> increase height
    const newH = r.width / targetAR
    return rectFromCenterSize(cx, cy, r.width, newH)
  } else {
    // too tall -> increase width
    const newW = r.height * targetAR
    return rectFromCenterSize(cx, cy, newW, r.height)
  }
}

function maximizeInsideImageKeepingCenter(r: Rect, iw: number, ih: number): Rect {
  // Try to grow r uniformly until it hits image bounds.
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const halfW = r.width / 2
  const halfH = r.height / 2

  // Distances to image edge from center
  const maxLeft = cx
  const maxRight = iw - cx
  const maxUp = cy
  const maxDown = ih - cy

  const scaleX = Math.min(maxLeft, maxRight) / halfW
  const scaleY = Math.min(maxUp, maxDown) / halfH
  const scale = Math.max(1, Math.min(scaleX, scaleY)) // only grow, never shrink

  const newW = r.width * scale
  const newH = r.height * scale
  return rectFromCenterSize(cx, cy, newW, newH)
}

function area(r: Rect) {
  return r.width * r.height
}

// ImageProcessor.ts
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
    await tf.ready()
    this.detector = await blazeface.load()
    console.log('✅ BlazeFace model loaded')
  }

  private get detector() {
    if (!ImageProcessor.detector) throw new Error('Detector not initialized')
    return ImageProcessor.detector
  }

  async analyze(): Promise<void> {
    this.metadata = await this.sharpInstance.metadata()
    this.faces = await this.detectFaces()
    console.log(`Detected ${this.faces.length} faces`, this.faces)
  }

  // pick the largest face (you can swap to "closest to center" if you prefer)
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
    const preds = await this.detector.estimateFaces(tensor, false)

    return preds.map((p) => {
      const [x1, y1] = p.topLeft as [number, number]
      const [x2, y2] = p.bottomRight as [number, number]
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
    })
  }

  async getCropRegion(width: number, height: number): Promise<Crop> {
    const boosts = this.faces.map((f) => ({ ...f, weight: 1 }))
    const result = await smartcrop.crop(this.buffer, {
      width,
      height,
      boost: boosts,
    })
    return result.topCrop
  }

  async extractAndResize(
    crop: { x: number; y: number; width: number; height: number } | Rect,
    width: number,
    height: number,
    outputPath: string
  ) {
    const iw = this.metadata?.width ?? 0
    const ih = this.metadata?.height ?? 0

    // normalize incoming crop
    const r: Rect =
      'x' in crop ? { left: crop.x, top: crop.y, width: crop.width, height: crop.height } : crop

    const rect =
      iw > 0 && ih > 0 && r.width > 0 && r.height > 0
        ? toValidExtractRect(r, iw, ih)
        : { left: 0, top: 0, width: Math.max(1, iw), height: Math.max(1, ih) }

    await this.sharpInstance
      .clone()
      .extract(rect) // ✅ integers within bounds
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

  /**
   * Face-aware crop for thumbnails.
   * - Expands by paddingRatio around face
   * - Adjusts to target aspect
   * - Maximizes inside image bounds to reduce upscaling
   * - Fallback: smartcrop with boost region (or plain smartcrop)
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
      // safest fallback: full image
      return { left: 0, top: 0, width: 0, height: 0 }
    }

    // If we have a face, build a crop around it
    const face = this.pickPrimaryFace()
    if (face) {
      // Start from face rect
      const faceRect: Rect = {
        left: face.x,
        top: face.y,
        width: face.width,
        height: face.height,
      }

      // Expand by padding
      let r = expandRect(faceRect, paddingRatio)

      // Clamp after expansion
      r = intersectClampToImage(r, iw, ih)

      // Ensure target aspect while enclosing the expanded face
      r = ensureAspectEnclosing(r, targetW, targetH)

      // Maximize inside the image bounds (reduce upscaling)
      r = maximizeInsideImageKeepingCenter(r, iw, ih)

      // Final clamp
      r = intersectClampToImage(r, iw, ih)

      // If the resulting crop is unreasonably tiny (e.g., bad detection),
      // fall back to smartcrop with boost.
      const minAcceptable = Math.min(iw, ih) * 0.1
      if (r.width < minAcceptable || r.height < minAcceptable) {
        const sc = await this.smartcropWithBoost(targetW, targetH, faceRect)
        return sc
      }

      return r
    }

    // No faces: use smartcrop default
    return await this.smartcropDefault(targetW, targetH)
  }

  private async smartcropDefault(targetW: number, targetH: number): Promise<Rect> {
    const result = await (smartcrop as any).crop(this.buffer, {
      width: targetW,
      height: targetH,
    })
    const { x, y, width, height } = result.topCrop
    return { left: x, top: y, width, height }
  }

  private async smartcropWithBoost(
    targetW: number,
    targetH: number,
    boostRect: Rect
  ): Promise<Rect> {
    const result = await (smartcrop as any).crop(this.buffer, {
      width: targetW,
      height: targetH,
      // Guide smartcrop toward the face area
      boost: [
        {
          x: Math.max(0, boostRect.left),
          y: Math.max(0, boostRect.top),
          width: Math.max(1, boostRect.width),
          height: Math.max(1, boostRect.height),
          weight: 1.0,
        },
      ],
    })
    const { x, y, width, height } = result.topCrop
    return { left: x, top: y, width, height }
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

import path from 'path'
import fs from 'fs'
import { createHmac } from 'crypto'

import { prisma } from '../lib/prisma'
import { getImageRoot, makeImageLocation } from '@/lib/media'
import { appConfig } from '@/lib/appconfig'

import { generateContentHash } from '@/utils/hash'
import { ProfileImagePosition } from '@zod/profile/profileimage.dto'
import sharp from 'sharp'
import type { ProfileImage } from '@zod/generated'

import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-cpu'
import * as blazeface from '@tensorflow-models/blazeface'
import smartcrop from 'smartcrop-sharp'
import { type Crop } from 'smartcrop'

type FaceBox = { x: number; y: number; width: number; height: number }



// ImageProcessor.ts
export class ImageProcessor {
  private buffer: Buffer
  private sharpInstance: sharp.Sharp
  private metadata?: sharp.Metadata
  private faces: FaceBox[] = []
  private static detector: blazeface.BlazeFaceModel | null = null

  constructor(buffer: Buffer) {
    this.buffer = buffer
    this.sharpInstance = sharp(buffer).rotate()
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
    console.log(`Detected ${this.faces.length} faces`)
  }

  private async detectFaces(): Promise<FaceBox[]> {
    const { data, info } = await sharp(this.buffer)
      .removeAlpha().raw().toBuffer({ resolveWithObject: true })

    const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3])
    const preds = await this.detector.estimateFaces(tensor, false)

    return preds.map(p => {
      const [x1, y1] = p.topLeft as [number, number]
      const [x2, y2] = p.bottomRight as [number, number]
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
    })
  }

  async getCropRegion(width: number, height: number): Promise<Crop> {
    const boosts = this.faces.map(f => ({ ...f, weight: 1 }))
    const result = await smartcrop.crop(this.buffer, {
      width,
      height,
      boost: boosts,
    })
    return result.topCrop
  }

  async extractAndResize(
    crop: Crop,
    width: number,
    height: number,
    outputPath: string
  ) {
    await sharp(this.buffer)
      .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
      .resize(width, height)
      .webp({ quality: 85 })
      .toFile(outputPath)
  }

  async resizeOriginal(width: number, height: number | undefined, fit: keyof sharp.FitEnum, outputPath: string) {
    await this.sharpInstance
      .clone()
      .resize({ width, height, fit })
      .webp({ quality: 85 })
      .toFile(outputPath)
  }

  getMime(): string {
    return `image/${this.metadata?.format ?? 'jpeg'}`
  }

  getOriginalSize(): { width?: number, height?: number } {
    return {
      width: this.metadata?.width,
      height: this.metadata?.height,
    }
  }
}

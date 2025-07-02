import * as faceapi from 'face-api.js'
import * as tf from '@tensorflow/tfjs-node'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

// Use a lightweight approach without Canvas for Node.js
let Canvas: any, Image: any, ImageData: any
try {
  const canvas = require('canvas')
  Canvas = canvas.Canvas
  Image = canvas.Image
  ImageData = canvas.ImageData
  // Monkey patch for face-api.js compatibility with Node.js
  // @ts-ignore
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
} catch (error) {
  console.warn('Canvas not available, face detection will be disabled:', error.message)
}

export interface FaceDetectionResult {
  faces: Array<{
    x: number
    y: number
    width: number
    height: number
    confidence: number
  }>
  cropBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export class FaceDetectionService {
  private static instance: FaceDetectionService
  private isInitialized = false

  private constructor() {}

  public static getInstance(): FaceDetectionService {
    if (!FaceDetectionService.instance) {
      FaceDetectionService.instance = new FaceDetectionService()
    }
    return FaceDetectionService.instance
  }

  /**
   * Initialize face-api.js with the required models
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    // Check if Canvas is available
    if (!Canvas) {
      throw new Error('Canvas not available - face detection requires canvas library to be properly installed')
    }

    try {
      const modelPath = path.join(process.cwd(), '..', '..', 'face-models')
      
      // Check if model files exist
      if (!fs.existsSync(modelPath)) {
        throw new Error(`Face models directory not found: ${modelPath}`)
      }

      // Load the face detection model
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath)
      
      this.isInitialized = true
      console.log('Face detection service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize face detection service:', error)
      throw error
    }
  }

  /**
   * Detect faces in an image and return crop suggestions
   */
  async detectFaces(imagePath: string): Promise<FaceDetectionResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!Canvas) {
      throw new Error('Canvas not available - face detection disabled')
    }

    try {
      // Load image using sharp first to get buffer
      const imageBuffer = fs.readFileSync(imagePath)
      const image = await Canvas.loadImage ? Canvas.loadImage(imageBuffer) : await Image.load(imageBuffer)
      
      // Create canvas for processing
      const canvas = new Canvas(image.width, image.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0, image.width, image.height)

      // Detect faces
      const detections = await faceapi.detectAllFaces(canvas as any)
      
      const faces = detections.map(detection => ({
        x: detection.box.x,
        y: detection.box.y,
        width: detection.box.width,
        height: detection.box.height,
        confidence: detection.score
      }))

      let cropBox: FaceDetectionResult['cropBox']

      // Generate crop suggestion based on detected faces
      if (faces.length > 0) {
        cropBox = this.calculateOptimalCrop(faces, image.width, image.height)
      }

      return {
        faces,
        cropBox
      }
    } catch (error) {
      console.error('Face detection failed:', error)
      throw error
    }
  }

  /**
   * Calculate optimal crop box that includes all faces with proper framing
   */
  private calculateOptimalCrop(
    faces: Array<{ x: number; y: number; width: number; height: number }>,
    imageWidth: number,
    imageHeight: number
  ): { x: number; y: number; width: number; height: number } {
    // Find bounding box that contains all faces
    const minX = Math.min(...faces.map(f => f.x))
    const minY = Math.min(...faces.map(f => f.y))
    const maxX = Math.max(...faces.map(f => f.x + f.width))
    const maxY = Math.max(...faces.map(f => f.y + f.height))

    // Add padding around faces (20% of face area)
    const faceWidth = maxX - minX
    const faceHeight = maxY - minY
    const padding = Math.max(faceWidth, faceHeight) * 0.2

    // Calculate crop box with padding
    let cropX = Math.max(0, minX - padding)
    let cropY = Math.max(0, minY - padding)
    let cropWidth = Math.min(imageWidth - cropX, maxX - minX + 2 * padding)
    let cropHeight = Math.min(imageHeight - cropY, maxY - minY + 2 * padding)

    // Ensure square crop for profile photos (common requirement)
    const cropSize = Math.min(cropWidth, cropHeight)
    
    // Center the square crop on the faces
    const facesCenterX = (minX + maxX) / 2
    const facesCenterY = (minY + maxY) / 2
    
    cropX = Math.max(0, Math.min(imageWidth - cropSize, facesCenterX - cropSize / 2))
    cropY = Math.max(0, Math.min(imageHeight - cropSize, facesCenterY - cropSize / 2))
    cropWidth = cropSize
    cropHeight = cropSize

    return {
      x: Math.round(cropX),
      y: Math.round(cropY),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight)
    }
  }

  /**
   * Check if the service is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!Canvas
  }

  /**
   * Check if face detection capabilities are available
   */
  isAvailable(): boolean {
    return !!Canvas
  }
}
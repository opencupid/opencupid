import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';
import { Canvas, Image, ImageData } from 'canvas';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Monkey patch for face-api.js in Node.js environment
(faceapi.env as any).monkeyPatch({ Canvas, Image, ImageData });

export interface FaceDetectionResult {
  hasFace: boolean;
  cropBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AutoCropConfig {
  // Minimum face size as percentage of image (0.25 = 25%)
  minFaceSize: number;
  // Maximum face size as percentage of image (0.5 = 50%)
  maxFaceSize: number;
  // Detection threshold (0-1, higher = more confident detections)
  detectionThreshold: number;
  // Model to use for face detection ('tiny' or 'ssd')
  model: 'tiny' | 'ssd';
}

export class FaceDetectionService {
  private static instance: FaceDetectionService;
  private modelsLoaded = false;
  private availableModels: Set<string> = new Set();
  private config: AutoCropConfig = {
    minFaceSize: 0.25,
    maxFaceSize: 0.5,
    detectionThreshold: 0.5,
    model: 'tiny',
  };

  private constructor() {}

  public static getInstance(): FaceDetectionService {
    if (!FaceDetectionService.instance) {
      FaceDetectionService.instance = new FaceDetectionService();
      // Initialize models at startup if face API is enabled
      if (process.env.FACEAPI_ENABLED === 'true') {
        FaceDetectionService.instance.loadModels().catch((error) => {
          console.error('Failed to load face detection models at startup:', error);
        });
      }
    }
    return FaceDetectionService.instance;
  }

  /**
   * Load face detection models
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    try {
      const modelsPath = path.join(process.cwd(), 'face-models');
      
      // Load the tiny face detector model (always available)
      await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
      this.availableModels.add('tiny');
      console.log('TinyFaceDetector model loaded');
      
      // Try to load SSD MobileNetV1 model
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
        this.availableModels.add('ssd');
        console.log('SSD MobileNetV1 model loaded');
      } catch (ssdError) {
        console.log('SSD MobileNetV1 model not available');
      }
      
      this.modelsLoaded = true;
      console.log(`Face detection models loaded. Available models: ${Array.from(this.availableModels).join(', ')}`);
    } catch (error) {
      console.error('Error loading face detection models:', error);
      throw new Error('Failed to load face detection models');
    }
  }

  /**
   * Detect faces in an image and return crop information
   */
  async detectFaces(imagePath: string): Promise<FaceDetectionResult> {
    if (!this.modelsLoaded) {
      throw new Error('Face detection models not loaded. Make sure FACEAPI_ENABLED=true and models are available.');
    }

    // Check if the requested model is available
    if (!this.availableModels.has(this.config.model)) {
      throw new Error(`Requested face detection model '${this.config.model}' is not available. Available models: ${Array.from(this.availableModels).join(', ')}`);
    }

    try {
      // Load image using sharp to get metadata and convert to RGBA
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions');
      }

      // Convert image to RGBA buffer for canvas
      const { data, info } = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Create a canvas and load the image
      const canvas = new Canvas(info.width, info.height);
      const ctx = canvas.getContext('2d');
      
      // Create ImageData from the RGBA buffer
      const imageData = ctx.createImageData(info.width, info.height);
      for (let i = 0; i < data.length; i++) {
        imageData.data[i] = data[i];
      }
      ctx.putImageData(imageData, 0, 0);
      
      // Detect faces using the selected model
      let detections;
      if (this.config.model === 'ssd') {
        detections = await faceapi
          .detectAllFaces(canvas as any, new faceapi.SsdMobilenetv1Options({
            minConfidence: this.config.detectionThreshold,
          }));
      } else {
        detections = await faceapi
          .detectAllFaces(canvas as any, new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: this.config.detectionThreshold,
          }));
      }

      if (detections.length === 0) {
        return { hasFace: false };
      }

      // Get the largest face (most prominent)
      const largestDetection = detections.reduce((prev, current) => {
        const prevArea = prev.box.width * prev.box.height;
        const currentArea = current.box.width * current.box.height;
        return currentArea > prevArea ? current : prev;
      });

      const faceBox = largestDetection.box;
      const imageArea = metadata.width! * metadata.height!;
      const faceArea = faceBox.width * faceBox.height;
      const faceRatio = faceArea / imageArea;

      // Check if face is within acceptable size range
      if (faceRatio < this.config.minFaceSize || faceRatio > this.config.maxFaceSize) {
        console.log(`Face size ratio ${faceRatio.toFixed(3)} outside acceptable range (${this.config.minFaceSize}-${this.config.maxFaceSize})`);
      }

      // Calculate 1:1 crop box centered on face
      const faceCenterX = faceBox.x + faceBox.width / 2;
      const faceCenterY = faceBox.y + faceBox.height / 2;

      // Size the crop box so face takes up 25-50% of the image
      const targetFaceRatio = Math.max(this.config.minFaceSize, Math.min(this.config.maxFaceSize, faceRatio));
      const cropSize = Math.sqrt(faceArea / targetFaceRatio);

      // Ensure crop box is square and within image bounds
      const halfCropSize = cropSize / 2;
      let cropX = Math.max(0, faceCenterX - halfCropSize);
      let cropY = Math.max(0, faceCenterY - halfCropSize);
      
      // Adjust if crop box extends beyond image
      if (cropX + cropSize > metadata.width!) {
        cropX = metadata.width! - cropSize;
      }
      if (cropY + cropSize > metadata.height!) {
        cropY = metadata.height! - cropSize;
      }

      // Final crop size might be smaller if image is too small
      const finalCropSize = Math.min(cropSize, metadata.width! - cropX, metadata.height! - cropY);

      return {
        hasFace: true,
        cropBox: {
          x: Math.round(cropX),
          y: Math.round(cropY),
          width: Math.round(finalCropSize),
          height: Math.round(finalCropSize),
        },
      };
    } catch (error) {
      console.error('Error in face detection:', error);
      return { hasFace: false };
    }
  }

  /**
   * Auto-crop an image based on detected face
   */
  async autoCrop(inputPath: string, outputPath: string): Promise<boolean> {
    try {
      const detection = await this.detectFaces(inputPath);
      
      if (!detection.hasFace || !detection.cropBox) {
        console.log('No suitable face detected for auto-crop');
        return false;
      }

      const { x, y, width, height } = detection.cropBox;
      
      // Crop the image using sharp
      await sharp(inputPath)
        .extract({ left: x, top: y, width, height })
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      console.log(`Auto-crop successful: face detected and cropped to ${width}x${height} at (${x}, ${y})`);
      return true;
    } catch (error) {
      console.error('Error in auto-crop:', error);
      return false;
    }
  }

  /**
   * Update configuration for face detection
   */
  updateConfig(config: Partial<AutoCropConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoCropConfig {
    return { ...this.config };
  }

  /**
   * Check if face API is enabled via environment variable
   */
  isEnabled(): boolean {
    return process.env.FACEAPI_ENABLED === 'true';
  }

  /**
   * Check if the service is ready (models loaded)
   */
  isReady(): boolean {
    return this.modelsLoaded;
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Array.from(this.availableModels);
  }
}
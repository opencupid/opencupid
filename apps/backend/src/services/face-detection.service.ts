import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as blazeface from '@tensorflow-models/blazeface';
import { Canvas, Image, ImageData } from 'canvas';
import sharp from 'sharp';

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
  // Model to use for face detection
  model: 'BlazeFace' | 'MediaPipeFaceDetector';
}

export class FaceDetectionService {
  private static instance: FaceDetectionService;
  private detector: faceDetection.FaceDetector | blazeface.BlazeFaceModel | null = null;
  private modelsLoaded = false;
  private config: AutoCropConfig = {
    minFaceSize: 0.25,
    maxFaceSize: 0.5,
    detectionThreshold: 0.5,
    model: 'BlazeFace',
  };

  private constructor() {}

  public static getInstance(): FaceDetectionService {
    if (!FaceDetectionService.instance) {
      FaceDetectionService.instance = new FaceDetectionService();
      // Initialize models at startup if face API is enabled
      if (process.env.FACEAPI_ENABLED === 'true') {
        FaceDetectionService.instance.loadModels().catch(() => {
          // Silently fail model loading at startup
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
      if (this.config.model === 'BlazeFace') {
        // Use BlazeFace model (simpler and more stable)
        this.detector = await blazeface.load();
      } else {
        // Use MediaPipe Face Detection (more advanced)
        const modelConfig: faceDetection.MediaPipeFaceDetectorTfjsModelConfig = {
          runtime: 'tfjs' as const,
          modelType: 'short' as const, // 'short' for faster inference, 'full' for better accuracy
          maxFaces: 1, // We only need to detect one face for cropping
          detectorModelUrl: undefined, // Use default model
          landmarkModelUrl: undefined, // Use default model
        };

        this.detector = await faceDetection.createDetector(
          faceDetection.SupportedModels.MediaPipeFaceDetector,
          modelConfig
        );
      }
      
      this.modelsLoaded = true;
    } catch (error) {
      throw new Error('Failed to load face detection models');
    }
  }

  /**
   * Detect faces in an image and return crop information
   */
  async detectFaces(imagePath: string): Promise<FaceDetectionResult> {
    if (!this.modelsLoaded || !this.detector) {
      throw new Error('Face detection models not loaded. Make sure FACEAPI_ENABLED=true and models are available.');
    }

    try {
      // Load image using sharp to get metadata and convert to ImageData
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions');
      }

      // Convert image to RGBA buffer for TensorFlow
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
      
      // Detect faces using the appropriate model
      let predictions: any[];
      
      if (this.config.model === 'BlazeFace') {
        // BlazeFace uses a different API
        predictions = await (this.detector as blazeface.BlazeFaceModel).estimateFaces(canvas as any, false);
      } else {
        // MediaPipe Face Detection
        predictions = await (this.detector as faceDetection.FaceDetector).estimateFaces(canvas as any);
      }

      if (predictions.length === 0) {
        return { hasFace: false };
      }

      // Get the face with highest confidence score
      let bestFace;
      let box;
      let confidence;

      if (this.config.model === 'BlazeFace') {
        // BlazeFace returns different format
        bestFace = predictions.reduce((prev, current) => {
          const prevScore = prev.probability ? prev.probability[0] : 0;
          const currentScore = current.probability ? current.probability[0] : 0;
          return currentScore > prevScore ? current : prev;
        });
        
        confidence = bestFace.probability ? bestFace.probability[0] : 0;
        
        // BlazeFace returns topLeft and bottomRight
        const topLeft = bestFace.topLeft;
        const bottomRight = bestFace.bottomRight;
        box = {
          xMin: topLeft[0],
          yMin: topLeft[1],
          width: bottomRight[0] - topLeft[0],
          height: bottomRight[1] - topLeft[1]
        };
      } else {
        // MediaPipe format
        bestFace = predictions.reduce((prev, current) => {
          const prevScore = prev.score || 0;
          const currentScore = current.score || 0;
          return currentScore > prevScore ? current : prev;
        });
        
        confidence = bestFace.score || 0;
        box = bestFace.box;
      }

      // Check confidence threshold
      if (confidence < this.config.detectionThreshold) {
        return { hasFace: false };
      }

      // Extract bounding box measurements
      const imageArea = metadata.width! * metadata.height!;
      const faceArea = box.width * box.height;
      const faceRatio = faceArea / imageArea;

      // Check if face is within acceptable size range
      if (faceRatio < this.config.minFaceSize || faceRatio > this.config.maxFaceSize) {
        return { hasFace: false };
      }

      // Calculate 1:1 crop box centered on face
      const faceCenterX = box.xMin + box.width / 2;
      const faceCenterY = box.yMin + box.height / 2;

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
        return false;
      }

      const { x, y, width, height } = detection.cropBox;
      
      // Crop the image using sharp
      await sharp(inputPath)
        .extract({ left: x, top: y, width, height })
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update configuration for face detection
   */
  updateConfig(config: Partial<AutoCropConfig>): void {
    this.config = { ...this.config, ...config };
    
    // If model changed, reload models
    if (config.model && config.model !== this.config.model) {
      this.modelsLoaded = false;
      this.detector = null;
      if (this.isEnabled()) {
        this.loadModels().catch(() => {
          // Silently fail model loading
        });
      }
    }
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
    return this.modelsLoaded && this.detector !== null;
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return ['BlazeFace', 'MediaPipeFaceDetector'];
  }
}
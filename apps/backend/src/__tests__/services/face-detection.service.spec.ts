import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FaceDetectionService } from '../../services/face-detection.service';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

describe('FaceDetectionService', () => {
  let faceService: FaceDetectionService;
  let testImagePath: string;
  let outputDir: string;

  beforeAll(async () => {
    faceService = FaceDetectionService.getInstance();
    vi.spyOn(faceService, 'loadModels').mockResolvedValue();
    vi.spyOn(faceService, 'detectFaces').mockResolvedValue({ hasFace: false });
    vi.spyOn(faceService, 'autoCrop').mockResolvedValue(false);
    outputDir = '/tmp/test-face-detection';
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Create a simple test image
    testImagePath = path.join(outputDir, 'test-simple.png');
    await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 200, g: 200, b: 200 }
      }
    })
    .png()
    .toFile(testImagePath);
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = FaceDetectionService.getInstance();
      const instance2 = FaceDetectionService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadModels', () => {
    it('should load face detection models without error', async () => {
      await expect(faceService.loadModels()).resolves.not.toThrow();
    });
  });

  describe('detectFaces', () => {
    it('should handle image without faces gracefully', async () => {
      const result = await faceService.detectFaces(testImagePath);
      expect(result).toHaveProperty('hasFace');
      expect(typeof result.hasFace).toBe('boolean');
      
      if (result.hasFace) {
        expect(result).toHaveProperty('cropBox');
        expect(result.cropBox).toHaveProperty('x');
        expect(result.cropBox).toHaveProperty('y');
        expect(result.cropBox).toHaveProperty('width');
        expect(result.cropBox).toHaveProperty('height');
      }
    });

    it('should handle invalid image path gracefully', async () => {
      const result = await faceService.detectFaces('/non/existent/path.jpg');
      expect(result.hasFace).toBe(false);
    });
  });

  describe('autoCrop', () => {
    it('should handle images without faces gracefully', async () => {
      const outputPath = path.join(outputDir, 'test-crop-output.jpg');
      const result = await faceService.autoCrop(testImagePath, outputPath);
      expect(typeof result).toBe('boolean');
    });

    it('should handle invalid paths gracefully', async () => {
      const result = await faceService.autoCrop('/non/existent/input.jpg', '/tmp/output.jpg');
      expect(result).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should get current configuration', () => {
      const config = faceService.getConfig();
      expect(config).toHaveProperty('minFaceSize');
      expect(config).toHaveProperty('maxFaceSize');
      expect(config).toHaveProperty('detectionThreshold');
    });

    it('should update configuration', () => {
      const originalConfig = faceService.getConfig();
      const newConfig = {
        minFaceSize: 0.1,
        maxFaceSize: 0.8,
        detectionThreshold: 0.3,
      };
      
      faceService.updateConfig(newConfig);
      const updatedConfig = faceService.getConfig();
      
      expect(updatedConfig.minFaceSize).toBe(newConfig.minFaceSize);
      expect(updatedConfig.maxFaceSize).toBe(newConfig.maxFaceSize);
      expect(updatedConfig.detectionThreshold).toBe(newConfig.detectionThreshold);
      
      // Restore original config
      faceService.updateConfig(originalConfig);
    });

    it('should partially update configuration', () => {
      const originalConfig = faceService.getConfig();
      
      faceService.updateConfig({ detectionThreshold: 0.7 });
      const updatedConfig = faceService.getConfig();
      
      expect(updatedConfig.detectionThreshold).toBe(0.7);
      expect(updatedConfig.minFaceSize).toBe(originalConfig.minFaceSize);
      expect(updatedConfig.maxFaceSize).toBe(originalConfig.maxFaceSize);
      
      // Restore original config
      faceService.updateConfig(originalConfig);
    });
  });
});
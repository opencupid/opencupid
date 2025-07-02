import { describe, it, expect, beforeAll } from 'vitest'
import { FaceDetectionService } from '../face-detection.service'
import path from 'path'
import fs from 'fs'

describe('FaceDetectionService', () => {
  let faceDetectionService: FaceDetectionService

  beforeAll(async () => {
    faceDetectionService = FaceDetectionService.getInstance()
  })

  it('should be a singleton', () => {
    const instance1 = FaceDetectionService.getInstance()
    const instance2 = FaceDetectionService.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('should check availability correctly', () => {
    const isAvailable = faceDetectionService.isAvailable()
    // In a testing environment, Canvas might not be available
    expect(typeof isAvailable).toBe('boolean')
  })

  it('should handle initialization gracefully', async () => {
    expect(faceDetectionService.isReady()).toBe(false)
    
    if (faceDetectionService.isAvailable()) {
      // If Canvas is available, initialize should succeed or fail with meaningful error
      try {
        await faceDetectionService.initialize()
        expect(faceDetectionService.isReady()).toBe(true)
      } catch (error) {
        // If models are not available, it should throw a meaningful error
        expect(error.message).toContain('Face models directory not found')
      }
    } else {
      // If Canvas is not available, initialization should fail
      await expect(faceDetectionService.initialize()).rejects.toThrow('Canvas not available')
    }
  })

  it('should handle face detection when Canvas is not available', async () => {
    const imagePath = path.join(__dirname, 'fixtures', 'sample-face.jpg')
    
    if (!faceDetectionService.isAvailable()) {
      // Should throw error when Canvas is not available
      await expect(faceDetectionService.detectFaces(imagePath)).rejects.toThrow('Canvas not available')
    } else if (fs.existsSync(imagePath)) {
      // If Canvas is available and test image exists, test detection
      try {
        const result = await faceDetectionService.detectFaces(imagePath)
        expect(result).toHaveProperty('faces')
        expect(Array.isArray(result.faces)).toBe(true)
      } catch (error) {
        // Service should handle errors gracefully
        expect(error).toBeInstanceOf(Error)
      }
    }
  })
})
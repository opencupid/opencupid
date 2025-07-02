// Simple test to verify face detection compilation and basic functionality
import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import * as canvas from 'canvas'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-node'
import * as faceDetection from '@tensorflow-models/face-detection'

describe('TensorFlow.js face detection basic functionality', () => {
  it('should import all required modules successfully', () => {
    expect(sharp).toBeDefined()
    expect(canvas).toBeDefined()
    expect(tf).toBeDefined()
    expect(faceDetection).toBeDefined()
  })

  it('should create and dispose tensors correctly', () => {
    const tensor = tf.tensor2d([[1, 2], [3, 4]])
    expect(tensor).toBeDefined()
    expect(tensor.shape).toEqual([2, 2])
    tensor.dispose()
  })

  it('should list supported face detection models', () => {
    const supportedModels = Object.values(faceDetection.SupportedModels)
    expect(supportedModels).toBeDefined()
    expect(supportedModels.length).toBeGreaterThan(0)
    expect(supportedModels).toContain('MediaPipeFaceDetector')
  })
})
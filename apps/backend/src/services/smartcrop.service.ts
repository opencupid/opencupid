import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-cpu'
import * as faceDetection from '@tensorflow-models/face-detection'
import * as blazeface from '@tensorflow-models/blazeface'
import smartcrop, { CropResult } from 'smartcrop'
import { createCanvas, loadImage, Canvas } from 'canvas'

export interface SmartCropOptions {
  width: number
  height: number
}

type FaceBox = { x: number; y: number; width: number; height: number }

let detector: faceDetection.FaceDetector | blazeface.BlazeFaceModel | null = null
let modelsLoaded = false

async function loadModels() {
  if (modelsLoaded) return
  if (process.env.SMARTCROP_MODEL === 'MediaPipeFaceDetector') {
    const modelConfig: faceDetection.MediaPipeFaceDetectorTfjsModelConfig = {
      runtime: 'tfjs',
      modelType: 'short',
      maxFaces: 1,
    }
    detector = await faceDetection.createDetector(
      faceDetection.SupportedModels.MediaPipeFaceDetector,
      modelConfig
    )
  } else {
    detector = await blazeface.load()
  }
  modelsLoaded = true
}

async function detectFaces(canvas: Canvas): Promise<FaceBox[]> {
  await loadModels()
  if (!detector) return []
  await tf.ready()

  let predictions: any[]
  if ('estimateFaces' in detector && (detector as any).estimateFaces.length === 2) {
    predictions = await (detector as blazeface.BlazeFaceModel).estimateFaces(canvas as any, false)
    return predictions.map(p => {
      const [x1, y1] = p.topLeft as [number, number]
      const [x2, y2] = p.bottomRight as [number, number]
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
    })
  }
  predictions = await (detector as faceDetection.FaceDetector).estimateFaces(canvas as any)
  return predictions.map(p => ({
    x: p.box.xMin,
    y: p.box.yMin,
    width: p.box.width,
    height: p.box.height,
  }))
}

export async function smartcropImage(
  image: Buffer | CanvasImageSource,
  options: SmartCropOptions
): Promise<CropResult['topCrop']> {
  const img = Buffer.isBuffer(image) ? await loadImage(image) : (image as CanvasImageSource)

  const canvas = createCanvas((img as any).width, (img as any).height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img as any, 0, 0)

  const faces = await detectFaces(canvas)
  const boosts = faces.map(b => ({ ...b, weight: 1 }))

  const result = await smartcrop.crop(canvas, {
    width: options.width,
    height: options.height,
    boost: boosts,
    canvasFactory: createCanvas,
  })

  return result.topCrop
}

export default { smartcrop: smartcropImage }


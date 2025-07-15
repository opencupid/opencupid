
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-cpu'
import * as blazeface from '@tensorflow-models/blazeface'
import smartcrop from 'smartcrop-sharp'
import sharp from 'sharp'

export interface SmartCropOptions {
  width: number
  height: number
}


type FaceBox = { x: number; y: number; width: number; height: number }

let detector: blazeface.BlazeFaceModel

export async function initialize() {
  await tf.ready()
  detector = await blazeface.load()
  console.log('✅ Face detection model loaded:', process.env.SMARTCROP_MODEL) // <-- executes
}


async function detectFaces(buffer: Buffer): Promise<FaceBox[]> {
  if (!detector) return []
  await tf.ready()

  // const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })

  const { data, info } = await sharp(buffer)
    .removeAlpha() // TFJS needs 3 channels (RGB)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const imageTensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3])

  const predictions = await detector.estimateFaces(imageTensor as any, false)
  // imageTensor.dispose()
  return predictions.map(p => {
    const [x1, y1] = p.topLeft as [number, number]
    const [x2, y2] = p.bottomRight as [number, number]
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
  })
}

export async function smartcropImage(
  image: Buffer,
  options: SmartCropOptions
) {
  // const metadata = await sharp(image).metadata()
  const faces = await detectFaces(image)
  console.log(`Found ${faces.length} faces for cropping`, faces)

  const boosts = faces.map(f => ({ ...f, weight: 1 }))

  const result = await smartcrop.crop(image, {
    width: options.width,
    height: options.height,
    boost: boosts
  })

  return result.topCrop
}

export default { smartcrop: smartcropImage }


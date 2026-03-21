import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

import { ImageProcessor } from './imageprocessor'
import { ImageService, type Variant } from './image.service'
import { getMediaRoot, MEDIA_SUBDIR } from '@/lib/media'

const MESSAGE_IMAGE_VARIANTS: Variant[] = [
  { name: 'inline', width: 600, fit: sharp.fit.inside },
  { name: 'full', width: 1280, fit: sharp.fit.inside },
]

export class MessageImageService {
  private static instance: MessageImageService

  private constructor() {}

  public static getInstance(): MessageImageService {
    if (!MessageImageService.instance) {
      MessageImageService.instance = new MessageImageService()
    }
    return MessageImageService.instance
  }

  /**
   * Process an uploaded image buffer into inline and full WebP variants.
   * No face detection, no blurhash, no original.jpg.
   *
   * @param buffer - Raw image buffer
   * @param profileId - Sender profile ID (used as subdirectory)
   * @param slug - Unique slug for the base filename
   * @returns paths to the inline and full variants, and total file size
   */
  async processMessageImage(
    buffer: Buffer,
    profileId: string,
    slug: string
  ): Promise<{
    inlinePath: string
    fullPath: string
    inlineSize: number
    fullSize: number
  }> {
    const outputDir = path.join(
      getMediaRoot(),
      MEDIA_SUBDIR.MESSAGE_IMAGES,
      profileId
    )
    await fs.promises.mkdir(outputDir, { recursive: true })

    // Auto-orient by EXIF rotation before processing
    const orientedBuffer = await sharp(buffer).rotate().toBuffer()

    const processor = new ImageProcessor(orientedBuffer)

    const imageService = ImageService.getInstance()
    const outputPaths = await imageService.generateAllVariants(
      processor,
      outputDir,
      slug,
      MESSAGE_IMAGE_VARIANTS
    )

    const [inlineStat, fullStat] = await Promise.all([
      fs.promises.stat(outputPaths['inline']!),
      fs.promises.stat(outputPaths['full']!),
    ])

    return {
      inlinePath: outputPaths['inline']!,
      fullPath: outputPaths['full']!,
      inlineSize: inlineStat.size,
      fullSize: fullStat.size,
    }
  }
}

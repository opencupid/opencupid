import path from 'path'
import fs from 'fs'

import { prisma } from '../lib/prisma'
import { getImageRoot, makeImageLocation, signUrl } from '@/lib/media'
import { appConfig } from '@/lib/appconfig'

import { generateContentHash } from '@/utils/hash'
import { ProfileImagePosition } from '@zod/profile/profileimage.dto'
import type { ProfileImage } from '@zod/generated'

import sharp from 'sharp'

import { ImageProcessor } from './imageprocessor'


type Variant = {
  name: string
  width: number
  height?: number
  fit?: keyof sharp.FitEnum
}

const variants: Variant[] = [
  { name: 'thumb', width: 150, height: 150, fit: sharp.fit.cover }, // square crop
  { name: 'card', width: 600, height: 600, fit: sharp.fit.cover }, // optional black bars or pad
  { name: 'profile', width: 1200, height: 900, fit: sharp.fit.contain }, // 4:3 aspect ratio
  { name: 'full', width: 1280, fit: sharp.fit.contain },
]
export class ImageService {
  private static instance: ImageService

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() { }

  /**
   * Get singleton instance
   */
  public static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService()
    }
    return ImageService.instance
  }


  /**
   * Get a single image by ID for the authenticated user
   */
  async getImage(id: string, userId: string): Promise<ProfileImage | null> {
    return prisma.profileImage.findFirst({ where: { id, userId } })
  }

  /**
   * List all images for a given user, most recent last
   */
  async listImages(userId: string): Promise<ProfileImage[]> {
    return prisma.profileImage.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    })
  }

  /**
   * Generate signed URLs for all variants of an image
   */
  getSignedUrls(image: { storagePath: string }): { size: string; url: string }[] {
    const urlBase = appConfig.IMAGE_URL_BASE
    const base = image.storagePath
    const imgSet = variants.map(s => ({ size: s.name, url: signUrl(`${urlBase}/${base}-${s.name}.webp`) }))
    imgSet.push({ size: 'original', url: signUrl(`${urlBase}/${base}-original.jpg`) })
    return imgSet
  }

  /**
   * Store an image uploaded by the user
   * @param userId - ID of the user uploading the image
   * @param fileUpload - The uploaded file object
   * @param captionText - Optional caption or alt text for the image
   * Returns the created ProfileImage record
   */
  async storeImage(
    userId: string,
    tmpImagePath: string,
    captionText: string
  ): Promise<ProfileImage> {
    let imageLocation

    // create image subdir, generate basename
    try {
      imageLocation = await makeImageLocation(userId)
    } catch (err: any) {
      console.error('Failed to create dest dir', err)
      throw new Error('Failed to create dest dir')
    }

    console.log(`Storing image for user ${userId}`, imageLocation)

    try {
      // Process the image and save resized variants
      const processed = await this.processImage(
        tmpImagePath,
        imageLocation.absPath,
        imageLocation.base
      )
      console.log('Image processed successfully', processed)

      // compute the content hash of the original
      const contentHash = await generateContentHash(processed.variants.original)
      // set position to be the last position
      const position = await prisma.profileImage.count({ where: { userId } })

      // Create a new ProfileImage record
      return await prisma.profileImage.create({
        data: {
          userId: userId,
          mimeType: processed.mime,
          altText: captionText,
          storagePath: path.join(imageLocation.relPath, imageLocation.base),
          isModerated: false,
          contentHash: contentHash,
          position: position,
        },
      })
    } catch (err: any) {
      console.error('Failed to process image', err)
      throw new Error(`Failed to process image ${tmpImagePath}: ${err.message}`)
    }
  }
  async processImage(filePath: string, outputDir: string, baseName: string) {
    await fs.promises.mkdir(outputDir, { recursive: true })

    const buffer = await fs.promises.readFile(filePath)

    const originalPath = path.join(outputDir, `${baseName}-original.jpg`)

    const orientFix = await sharp(buffer)
      .rotate()                // auto-orient pixels

    await orientFix.keepIccProfile()
      .jpeg({ quality: 100 })
      .toFile(originalPath)

    const processor = new ImageProcessor(await orientFix.toBuffer())
    await processor.analyze()

    const outputPaths = await this.generateAllVariants(processor, outputDir, baseName)
    outputPaths.original = originalPath

    return {
      ...processor.getOriginalSize(),
      mime: processor.getMime(),
      variants: outputPaths,
    }
  }

  async reprocessImage(filePath: string, outputDir: string, baseName: string) {
    await fs.promises.mkdir(outputDir, { recursive: true })

    const buffer = await fs.promises.readFile(filePath)
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const outputPaths = await this.generateAllVariants(processor, outputDir, baseName)
    return outputPaths
  }

  private async generateAllVariants(
    processor: ImageProcessor,
    outputDir: string,
    baseName: string
  ): Promise<Record<string, string>> {
    const outputPaths: Record<string, string> = {}

    for (const v of variants) {
      const outputPath = path.join(outputDir, `${baseName}-${v.name}.webp`)
      const width = v.width
      const height = v.height ?? v.width
      const fit = v.fit ?? sharp.fit.inside

      if (['card', 'thumb'].includes(v.name)) {
        // Face-aware crop with +25% padding, target aspect maintained
        const rect = await processor.getFaceAwareCrop(width, height, { paddingRatio: 0.75 })
        const crop = { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
        await processor.extractAndResize(crop, width, height, outputPath)
      } else if (['profile'].includes(v.name)) {
        const crop = await processor.getCropRegion(width, height)
        await processor.extractAndResize(crop, width, height, outputPath)
      } else {
        await processor.resizeOriginal(width, height, fit, outputPath)
      }

      outputPaths[v.name] = outputPath
    }

    return outputPaths
  }


  /**
   * Update an existing ProfileImage's metadata
   * @param image - The ProfileImage object with updated fields
   * Returns number of records updated (0 or 1)
   */
  async updateImage(image: ProfileImage): Promise<ProfileImage> {
    return prisma.profileImage.update({
      where: { id: image.id },
      data: {
        altText: image.altText,
      },
    })
  }

  /**
   * Delete a ProfileImage record
   * @param userId - ID of the user who owns the image
   * @param imageId - ID of the image to delete
   * Returns true if successful, false if not
   */
  async deleteImage(userId: string, imageId: string): Promise<boolean> {
    const image = await prisma.profileImage.findUnique({
      where: { id: imageId, userId },
    })
    if (!image) {
      console.error('Image not found or does not belong to user')
      return false
    }
    try {
      await prisma.profileImage.delete({
        where: { id: image.id },
      })
    } catch (err) {
      console.error('Error deleting image from database:', err)
      return false
    }

    // Delete all generated image files from the filesystem
    const baseFile = path.join(getImageRoot(), image.storagePath)
    const filesToDelete = [
      `${baseFile}-original.jpg`,
      `${baseFile}-face.jpg`,
      ...variants.map(size => `${baseFile}-${size.name}.webp`),
    ]

    for (const f of filesToDelete) {
      try {
        await fs.promises.unlink(f)
      } catch (err) {
        // Log but continue deleting other variants
        console.error('Error deleting file:', err)
      }
    }
    return true
  }

  /**
   * Reorder images by updating their positions
   * @param userId - ID of the user whose images are being reordered
   * @param items - Array of image IDs and their new positions
   * Returns the updated images sorted by position
   */
  async reorderImages(userId: string, items: ProfileImagePosition[]) {
    const valid = await prisma.profileImage.findMany({
      where: { userId, id: { in: items.map(i => i.id) } },
      select: { id: true },
    })

    const validIds = new Set(valid.map((v: any) => v.id))
    if (items.some(i => !validIds.has(i.id))) {
      throw new Error('Invalid image ID')
    }

    // Bulk‐update positions in a single transaction
    const ops = items.map(item =>
      prisma.profileImage.update({
        where: { id: item.id },
        data: { position: item.position },
      })
    )
    const updated = await prisma.$transaction(ops)

    // Return them sorted by position
    return updated.sort((a: any, b: any) => a.position - b.position)
  }




}

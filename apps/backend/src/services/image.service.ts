import path from 'path'
import fs from 'fs'

import { prisma } from '../lib/prisma'
import { getMediaRoot, imageBasePath, makeImageLocation, mediaUrl } from '@/lib/media'

import { generateContentHash } from '@/utils/hash'
import { ProfileImagePosition } from '@zod/profile/profileimage.dto'
import type { ProfileImage } from '@zod/generated'

import sharp from 'sharp'

import { ImageProcessor } from './imageprocessor'
import { syncProfileHasFace } from './profile.service'

type Variant = {
  name: string
  width: number
  height?: number
  fit?: keyof sharp.FitEnum
}

const variants: Variant[] = [
  { name: 'thumb', width: 128, height: 128, fit: sharp.fit.cover }, // square crop
  { name: 'card', width: 600, height: 600, fit: sharp.fit.cover }, // optional black bars or pad
  { name: 'profile', width: 1200, height: 900, fit: sharp.fit.contain }, // 4:3 aspect ratio
  { name: 'full', width: 1280, fit: sharp.fit.inside },
]
export class ImageService {
  private static instance: ImageService

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {}

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
   * List all images for a profile, ordered by position
   */
  async listImages(profileId: string): Promise<ProfileImage[]> {
    return prisma.profileImage.findMany({
      where: { profileId },
      orderBy: { position: 'asc' },
    })
  }

  /**
   * Build URLs for all variants of an image.
   */
  getImageUrls(image: { storagePath: string }): { size: string; url: string }[] {
    const base = imageBasePath(image.storagePath)
    const imgSet = variants.map((s) => ({
      size: s.name,
      url: mediaUrl(`${base}-${s.name}.webp`),
    }))
    imgSet.push({ size: 'original', url: mediaUrl(`${base}-original.jpg`) })
    return imgSet
  }

  /**
   * Store an image uploaded for a profile.
   * Creates the ProfileImage row and re-syncs Profile.hasFace in one transaction,
   * so the invariant Profile.hasFace == position-0 image's hasFace always holds.
   */
  async storeImage(
    profileId: string,
    tmpImagePath: string,
    captionText: string
  ): Promise<ProfileImage> {
    let imageLocation

    try {
      imageLocation = await makeImageLocation(profileId)
    } catch (err: any) {
      console.error('Failed to create dest dir', err)
      throw new Error('Failed to create dest dir')
    }

    try {
      const processed = await this.processImage(
        tmpImagePath,
        imageLocation.absPath,
        imageLocation.base
      )
      const contentHash = await generateContentHash(processed.variants.original)

      return await prisma.$transaction(async (tx) => {
        const position = await tx.profileImage.count({ where: { profileId } })
        const created = await tx.profileImage.create({
          data: {
            profileId,
            mimeType: processed.mime,
            altText: captionText,
            storagePath: path.join(imageLocation.relPath, imageLocation.base),
            isModerated: false,
            contentHash,
            blurhash: processed.blurhash,
            hasFace: processed.hasFace,
            position,
          },
        })
        await syncProfileHasFace(tx, profileId)
        return created
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

    const orientFix = await sharp(buffer, { failOn: 'error' }).rotate() // auto-orient pixels

    await orientFix.keepIccProfile().jpeg({ quality: 100 }).toFile(originalPath)

    const processor = new ImageProcessor(await orientFix.toBuffer())
    await processor.analyze()

    const blurhash = await processor.encodeBlurhash()

    const outputPaths = await this.generateAllVariants(processor, outputDir, baseName)
    outputPaths.original = originalPath

    return {
      ...processor.getOriginalSize(),
      mime: processor.getMime(),
      variants: outputPaths,
      blurhash,
      hasFace: processor.hasFaces(),
    }
  }

  async reprocessImage(filePath: string, outputDir: string, baseName: string) {
    await fs.promises.mkdir(outputDir, { recursive: true })

    const buffer = await fs.promises.readFile(filePath)
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const blurhash = await processor.encodeBlurhash()
    const outputPaths = await this.generateAllVariants(processor, outputDir, baseName)

    return {
      ...processor.getOriginalSize(),
      variants: outputPaths,
      blurhash,
      hasFace: processor.hasFaces(),
    }
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
      const height = v.height
      const fit = v.fit ?? sharp.fit.inside

      if (['card', 'thumb', 'profile'].includes(v.name)) {
        const rect = await processor.getSmartCrop(width, height!)
        await processor.extractAndResize(rect, width, height!, outputPath)
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
   * @param profileId - ID of the profile that owns the image
   * @param imageId - ID of the image to delete
   * Returns true if successful, false if not
   */
  async deleteImage(profileId: string, imageId: string): Promise<boolean> {
    const image = await prisma.profileImage.findUnique({
      where: { id: imageId, profileId },
    })
    if (!image) {
      console.warn('Image not found or does not belong to profile')
      return false
    }
    try {
      await prisma.$transaction(async (tx) => {
        await tx.profileImage.delete({ where: { id: image.id } })
        await syncProfileHasFace(tx, profileId)
      })
    } catch (err) {
      console.error('Error deleting image from database:', err)
      return false
    }

    // Delete all generated image files from the filesystem
    const baseFile = path.join(getMediaRoot(), imageBasePath(image.storagePath))
    const filesToDelete = [
      `${baseFile}-original.jpg`,
      `${baseFile}-face.jpg`,
      ...variants.map((size) => `${baseFile}-${size.name}.webp`),
    ]

    for (const f of filesToDelete) {
      try {
        await fs.promises.unlink(f)
      } catch (err) {
        // Log but continue deleting other variants
        console.warn('Error deleting file:', err)
      }
    }
    return true
  }

  /**
   * Reorder images by updating their positions
   * @param profileId - ID of the profile whose images are being reordered
   * @param items - Array of image IDs and their new positions
   * Returns the updated images sorted by position
   */
  async reorderImages(profileId: string, items: ProfileImagePosition[]) {
    const valid = await prisma.profileImage.findMany({
      where: { profileId, id: { in: items.map((i) => i.id) } },
      select: { id: true },
    })

    const validIds = new Set(valid.map((v) => v.id))
    if (items.some((i) => !validIds.has(i.id))) {
      throw new Error('Invalid image ID')
    }

    return prisma.$transaction(async (tx) => {
      const updated = []
      for (const item of items) {
        updated.push(
          await tx.profileImage.update({
            where: { id: item.id },
            data: { position: item.position },
          })
        )
      }
      await syncProfileHasFace(tx, profileId)
      return updated.sort((a, b) => a.position - b.position)
    })
  }
}

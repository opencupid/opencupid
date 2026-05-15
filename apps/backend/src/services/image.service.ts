import path from 'path'
import fs from 'fs'

import { prisma } from '../lib/prisma'
import { getMediaRoot, imageBasePath, makeImageLocation, mediaUrl } from '@/lib/media'

import { generateContentHash } from '@/utils/hash'
import { ImagePosition } from '@zod/image/image.dto'
import type { Image, ProfileImage } from '@zod/generated'

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
   * Create an Image row for a freshly uploaded file. Does NOT attach it to any gallery —
   * the caller (route handler) composes createImage + attachTo* in one transaction.
   *
   * @param opts.detectFace  When false, skips OpenCV face detection (~100ms saved).
   *                         Use true for profile uploads, false for UserContent uploads.
   */
  async createImage(
    ownerProfileId: string,
    tmpImagePath: string,
    altText: string,
    opts: { detectFace: boolean }
  ): Promise<Image> {
    const imageLocation = await makeImageLocation(ownerProfileId)
    const processed = await this.processImage(
      tmpImagePath,
      imageLocation.absPath,
      imageLocation.base,
      { detectFace: opts.detectFace }
    )
    const contentHash = await generateContentHash(processed.variants.original)

    return prisma.image.create({
      data: {
        ownerProfileId,
        mimeType: processed.mime,
        altText,
        storagePath: path.join(imageLocation.relPath, imageLocation.base),
        contentHash,
        blurhash: processed.blurhash,
        hasFace: processed.hasFace,
        width: processed.width ?? null,
        height: processed.height ?? null,
        position: 0,
      },
    })
  }

  /**
   * Attach an existing Image to a Profile gallery. Validates ownership, computes the new
   * position, and re-syncs Profile.hasFace in one transaction.
   */
  async attachToProfile(imageId: string, profileId: string): Promise<void> {
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { profileGallery: true, userContentGallery: true },
    })
    if (!image) throw new Error('Image not found')
    if (image.ownerProfileId !== profileId) {
      throw new Error('Image owner mismatch')
    }
    if (image.profileGallery || image.userContentGallery) {
      throw new Error('Image already attached')
    }

    await prisma.$transaction(async (tx) => {
      const position = await tx.profileImage.count({ where: { profileId } })
      await tx.profileImage.create({ data: { imageId, profileId } })
      await tx.image.update({ where: { id: imageId }, data: { position } })
      await syncProfileHasFace(tx, profileId)
    })
  }

  async processImage(
    filePath: string,
    outputDir: string,
    baseName: string,
    opts: { detectFace: boolean } = { detectFace: true }
  ) {
    await fs.promises.mkdir(outputDir, { recursive: true })

    const buffer = await fs.promises.readFile(filePath)

    const originalPath = path.join(outputDir, `${baseName}-original.jpg`)

    const orientFix = await sharp(buffer, { failOn: 'error' }).rotate() // auto-orient pixels

    await orientFix.keepIccProfile().jpeg({ quality: 100 }).toFile(originalPath)

    const processor = new ImageProcessor(await orientFix.toBuffer())
    await processor.analyze({ detectFace: opts.detectFace })

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
  async reorderImages(profileId: string, items: ImagePosition[]) {
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

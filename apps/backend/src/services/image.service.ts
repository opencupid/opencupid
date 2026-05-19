import path from 'path'
import fs from 'fs'

import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { getMediaRoot, imageBasePath, makeImageLocation, mediaUrl } from '@/lib/media'

import { generateContentHash } from '@/utils/hash'
import { ImagePosition } from '@zod/image/image.dto'
import type { Image } from '@zod/generated'

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

export type ImageServiceErrorCode =
  | 'NOT_FOUND'
  | 'OWNER_MISMATCH'
  | 'ALREADY_ATTACHED'
  | 'INVALID_REORDER'

export class ImageServiceError extends Error {
  constructor(
    public readonly code: ImageServiceErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'ImageServiceError'
  }
}

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
   * List all images attached to a Profile gallery, ordered by Image.position.
   */
  async listProfileGallery(profileId: string): Promise<Image[]> {
    const rows = await prisma.profileImage.findMany({
      where: { profileId },
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
    })
    return rows.map((r) => r.image)
  }

  /**
   * List all images attached to a UserContent gallery, ordered by Image.position.
   */
  async listUserContentGallery(userContentId: string): Promise<Image[]> {
    const rows = await prisma.userContentImage.findMany({
      where: { userContentId },
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
    })
    return rows.map((r) => r.image)
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
   * the caller (route handler) composes createImage + attachTo* sequentially. If the
   * subsequent attach fails the route is responsible for compensating delete (atomicity is
   * not provided here; createImage opens its own write).
   */
  async createImage(ownerProfileId: string, tmpImagePath: string, altText: string): Promise<Image> {
    const imageLocation = await makeImageLocation(ownerProfileId)
    const processed = await this.processImage(
      tmpImagePath,
      imageLocation.absPath,
      imageLocation.base
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
    if (!image) throw new ImageServiceError('NOT_FOUND', 'Image not found')
    if (image.ownerProfileId !== profileId) {
      throw new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
    }
    if (image.profileGallery || image.userContentGallery) {
      throw new ImageServiceError('ALREADY_ATTACHED', 'Image already attached')
    }

    await prisma.$transaction(
      async (tx) => {
        const position = await tx.profileImage.count({ where: { profileId } })
        await tx.profileImage.create({ data: { imageId, profileId } })
        await tx.image.update({ where: { id: imageId }, data: { position } })
        await syncProfileHasFace(tx, profileId)
      },
      { isolationLevel: 'Serializable' }
    )
  }

  /**
   * Attach an existing Image to a UserContent gallery. Validates that the content's
   * author matches the image owner, computes the new position, and inserts the join
   * row in one transaction. Profile.hasFace is intentionally NOT touched here.
   */
  async attachToUserContent(imageId: string, userContentId: string): Promise<void> {
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { profileGallery: true, userContentGallery: true },
    })
    if (!image) throw new ImageServiceError('NOT_FOUND', 'Image not found')

    const content = await prisma.userContent.findUnique({ where: { id: userContentId } })
    if (!content) throw new ImageServiceError('NOT_FOUND', 'UserContent not found')
    if (content.postedById !== image.ownerProfileId) {
      throw new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch with content author')
    }

    if (image.profileGallery || image.userContentGallery) {
      throw new ImageServiceError('ALREADY_ATTACHED', 'Image already attached')
    }

    await prisma.$transaction(
      async (tx) => {
        const position = await tx.userContentImage.count({ where: { userContentId } })
        await tx.userContentImage.create({ data: { imageId, userContentId } })
        await tx.image.update({ where: { id: imageId }, data: { position } })
      },
      { isolationLevel: 'Serializable' }
    )
  }

  /**
   * Bulk-attach images to a freshly-created UserContent inside a caller-supplied
   * transaction. Pre-validates that every imageId exists, is owned by
   * `ownerProfileId`, and is not yet attached to any gallery. Inserts join rows
   * and assigns sequential positions in the order of `imageIds`.
   */
  async attachManyToUserContentTx(
    tx: Prisma.TransactionClient,
    imageIds: string[],
    userContentId: string,
    ownerProfileId: string
  ): Promise<void> {
    if (imageIds.length === 0) return

    const images = await tx.image.findMany({
      where: { id: { in: imageIds } },
      include: { profileGallery: true, userContentGallery: true },
    })

    if (images.length !== imageIds.length) {
      throw new ImageServiceError('NOT_FOUND', 'One or more images not found')
    }
    for (const img of images) {
      if (img.ownerProfileId !== ownerProfileId) {
        throw new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
      }
      if (img.profileGallery || img.userContentGallery) {
        throw new ImageServiceError('ALREADY_ATTACHED', `Image ${img.id} already attached`)
      }
    }

    // Writes iterate `imageIds` (input order) — not the validated `images` set, which
    // Prisma may return in arbitrary order — so positions follow caller-supplied order.
    const startPos = await tx.userContentImage.count({ where: { userContentId } })
    for (let i = 0; i < imageIds.length; i++) {
      const id = imageIds[i]
      await tx.userContentImage.create({ data: { imageId: id, userContentId } })
      await tx.image.update({ where: { id }, data: { position: startPos + i } })
    }
  }

  /**
   * Drop a profile-gallery join row without deleting the underlying Image.
   * Re-syncs Profile.hasFace inside the same transaction.
   */
  async detachFromProfile(imageId: string, requesterProfileId: string): Promise<void> {
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { profileGallery: true, userContentGallery: true },
    })
    if (!image) throw new ImageServiceError('NOT_FOUND', 'Image not found')
    if (image.ownerProfileId !== requesterProfileId) {
      throw new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
    }
    if (!image.profileGallery) {
      throw new ImageServiceError('NOT_FOUND', 'Image is not attached to a profile gallery')
    }

    const profileId = image.profileGallery.profileId
    await prisma.$transaction(
      async (tx) => {
        await tx.profileImage.delete({ where: { imageId } })
        await syncProfileHasFace(tx, profileId)
      },
      { isolationLevel: 'Serializable' }
    )
  }

  /**
   * Drop a content-gallery join row without deleting the underlying Image.
   * Profile.hasFace is intentionally NOT touched here (symmetry with attach).
   */
  async detachFromUserContent(imageId: string, requesterProfileId: string): Promise<void> {
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { userContentGallery: true },
    })
    if (!image) throw new ImageServiceError('NOT_FOUND', 'Image not found')
    if (image.ownerProfileId !== requesterProfileId) {
      throw new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
    }
    if (!image.userContentGallery) {
      throw new ImageServiceError('NOT_FOUND', 'Image is not attached to a content gallery')
    }

    await prisma.userContentImage.delete({ where: { imageId } })
  }

  async processImage(filePath: string, outputDir: string, baseName: string) {
    await fs.promises.mkdir(outputDir, { recursive: true })

    const buffer = await fs.promises.readFile(filePath)

    const originalPath = path.join(outputDir, `${baseName}-original.jpg`)

    const orientFix = sharp(buffer, { failOn: 'error' }).rotate() // auto-orient pixels

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
   * Patch an Image's editable metadata. Owner-checked; works for images attached
   * to either a Profile or a UserContent gallery (or unattached).
   */
  async updateImage(
    imageId: string,
    requesterProfileId: string,
    patch: { altText?: string }
  ): Promise<Image> {
    const image = await prisma.image.findUnique({ where: { id: imageId } })
    if (!image) throw new ImageServiceError('NOT_FOUND', 'Image not found')
    if (image.ownerProfileId !== requesterProfileId) {
      throw new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
    }
    return prisma.image.update({
      where: { id: imageId },
      data: { altText: patch.altText ?? image.altText },
    })
  }

  /**
   * Delete an Image. Detects whether it lives in a Profile or UserContent gallery
   * (or is unattached), drops the matching join, drops the Image, re-syncs
   * Profile.hasFace when applicable, then unlinks the on-disk variants.
   */
  async deleteImage(imageId: string, requesterProfileId: string): Promise<void> {
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { profileGallery: true, userContentGallery: true },
    })
    if (!image) throw new ImageServiceError('NOT_FOUND', 'Image not found')
    if (image.ownerProfileId !== requesterProfileId) {
      throw new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
    }

    await prisma.$transaction(async (tx) => {
      if (image.profileGallery) {
        await tx.profileImage.delete({ where: { imageId } })
      } else if (image.userContentGallery) {
        await tx.userContentImage.delete({ where: { imageId } })
      }
      await tx.image.delete({ where: { id: imageId } })
      if (image.profileGallery) {
        await syncProfileHasFace(tx, image.profileGallery.profileId)
      }
    })

    // File cleanup, post-commit, best-effort.
    const baseFile = path.join(getMediaRoot(), imageBasePath(image.storagePath))
    const filesToDelete = [
      `${baseFile}-original.jpg`,
      ...variants.map((size) => `${baseFile}-${size.name}.webp`),
    ]
    for (const f of filesToDelete) {
      try {
        await fs.promises.unlink(f)
      } catch (err) {
        console.warn('Error deleting file:', err)
      }
    }
  }

  /**
   * Reorder images in a Profile gallery by updating Image.position via the join.
   * Re-syncs Profile.hasFace and returns the gallery sorted by position.
   */
  async reorderProfileGallery(profileId: string, items: ImagePosition[]): Promise<Image[]> {
    const galleryCount = await prisma.profileImage.count({ where: { profileId } })
    if (items.length !== galleryCount) {
      throw new ImageServiceError(
        'INVALID_REORDER',
        'Reorder must include every image in the gallery exactly once'
      )
    }

    const valid = await prisma.profileImage.findMany({
      where: { profileId, imageId: { in: items.map((i) => i.id) } },
      select: { imageId: true },
    })
    const validIds = new Set(valid.map((v) => v.imageId))
    if (items.some((i) => !validIds.has(i.id))) {
      throw new ImageServiceError('INVALID_REORDER', 'Invalid image ID')
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.image.update({ where: { id: item.id }, data: { position: item.position } })
      }
      await syncProfileHasFace(tx, profileId)
    })
    return this.listProfileGallery(profileId)
  }

  /**
   * Reorder images in a UserContent gallery by updating Image.position via the join.
   * Profile.hasFace is intentionally NOT touched here.
   */
  async reorderUserContentGallery(userContentId: string, items: ImagePosition[]): Promise<Image[]> {
    const galleryCount = await prisma.userContentImage.count({ where: { userContentId } })
    if (items.length !== galleryCount) {
      throw new ImageServiceError(
        'INVALID_REORDER',
        'Reorder must include every image in the gallery exactly once'
      )
    }

    const valid = await prisma.userContentImage.findMany({
      where: { userContentId, imageId: { in: items.map((i) => i.id) } },
      select: { imageId: true },
    })
    const validIds = new Set(valid.map((v) => v.imageId))
    if (items.some((i) => !validIds.has(i.id))) {
      throw new ImageServiceError('INVALID_REORDER', 'Invalid image ID')
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.image.update({ where: { id: item.id }, data: { position: item.position } })
      }
    })
    return this.listUserContentGallery(userContentId)
  }
}

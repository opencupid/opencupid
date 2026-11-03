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

type GalleryRef = { profileId: string } | { userContentId: string }

/**
 * Serialize mutations of one gallery by row-locking its owner (Profile or
 * UserContent) until the transaction ends. Must be the first statement of every
 * transaction that changes gallery membership or positions: under READ COMMITTED
 * the later transaction then reads the earlier one's committed result, and taking
 * the lock before any Image row writes keeps lock order consistent (no deadlocks).
 */
export async function lockGallery(
  tx: Prisma.TransactionClient,
  gallery: GalleryRef
): Promise<void> {
  if ('profileId' in gallery) {
    await tx.$queryRaw`SELECT 1 FROM "Profile" WHERE id = ${gallery.profileId} FOR UPDATE`
  } else {
    await tx.$queryRaw`SELECT 1 FROM "UserContent" WHERE id = ${gallery.userContentId} FOR UPDATE`
  }
}

/**
 * Row-lock images (in id order) and load them with their gallery memberships,
 * failing unless every one exists, belongs to `ownerProfileId` (when given) and
 * is in no gallery. Every attach path calls this inside its transaction, after
 * lockGallery(), so two attaches of the same image into different galleries
 * cannot both pass the membership check: the second waits for the first to
 * commit and then sees the image as attached.
 */
async function lockUnattachedImages(
  tx: Prisma.TransactionClient,
  imageIds: string[],
  ownerProfileId?: string
) {
  await tx.$queryRaw`
    SELECT id FROM "Image" WHERE id IN (${Prisma.join(imageIds)}) ORDER BY id FOR UPDATE`
  const images = await tx.image.findMany({
    where: { id: { in: imageIds } },
    include: { profileGallery: true, userContentGallery: true, messageGallery: true },
  })
  if (images.length !== imageIds.length) {
    throw new ImageServiceError('NOT_FOUND', 'Image not found')
  }
  for (const img of images) {
    if (ownerProfileId !== undefined && img.ownerProfileId !== ownerProfileId) {
      throw new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
    }
    if (img.profileGallery || img.userContentGallery || img.messageGallery) {
      throw new ImageServiceError('ALREADY_ATTACHED', `Image ${img.id} already attached`)
    }
  }
  return images
}

/**
 * Renumber a gallery's Image.position to a contiguous 0..n-1, preserving the
 * current order (ties broken by createdAt, then id). Every gallery mutation runs
 * this inside its transaction, after lockGallery(), so position 0 is always the primary image and
 * `position = count(gallery)` on attach always appends. Galleries left with gaps
 * or duplicates by earlier code are repaired by their owner's next mutation.
 */
export async function compactGalleryPositions(
  tx: Prisma.TransactionClient,
  gallery: GalleryRef
): Promise<void> {
  const where: Prisma.ImageWhereInput =
    'profileId' in gallery
      ? { profileGallery: { profileId: gallery.profileId } }
      : { userContentGallery: { userContentId: gallery.userContentId } }
  const images = await tx.image.findMany({
    where,
    select: { id: true, position: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })
  for (const [index, image] of images.entries()) {
    if (image.position !== index) {
      await tx.image.update({ where: { id: image.id }, data: { position: index } })
    }
  }
}

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
    await prisma.$transaction(async (tx) => {
      await lockGallery(tx, { profileId })
      await lockUnattachedImages(tx, [imageId], profileId)
      // Compact first so count() is the end of the gallery even if it held gaps.
      await compactGalleryPositions(tx, { profileId })
      const position = await tx.profileImage.count({ where: { profileId } })
      await tx.profileImage.create({ data: { imageId, profileId } })
      await tx.image.update({ where: { id: imageId }, data: { position } })
      await syncProfileHasFace(tx, profileId)
    })
  }

  /**
   * Attach an existing Image to a UserContent gallery. Validates that the content's
   * author matches the image owner, computes the new position, and inserts the join
   * row in one transaction. Profile.hasFace is intentionally NOT touched here.
   */
  async attachToUserContent(imageId: string, userContentId: string): Promise<void> {
    const content = await prisma.userContent.findUnique({ where: { id: userContentId } })
    if (!content) throw new ImageServiceError('NOT_FOUND', 'UserContent not found')

    await prisma.$transaction(async (tx) => {
      await lockGallery(tx, { userContentId })
      // The image must belong to the content's author.
      await lockUnattachedImages(tx, [imageId], content.postedById)
      // Compact first so count() is the end of the gallery even if it held gaps.
      await compactGalleryPositions(tx, { userContentId })
      const position = await tx.userContentImage.count({ where: { userContentId } })
      await tx.userContentImage.create({ data: { imageId, userContentId } })
      await tx.image.update({ where: { id: imageId }, data: { position } })
    })
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

    // De-dupe caller input; downstream length checks and writes assume uniqueness.
    const uniqueIds = Array.from(new Set(imageIds))

    await lockGallery(tx, { userContentId })
    await lockUnattachedImages(tx, uniqueIds, ownerProfileId)

    // Writes iterate `uniqueIds` (deduped input order) so positions follow
    // caller-supplied order.
    const startPos = await tx.userContentImage.count({ where: { userContentId } })
    for (let i = 0; i < uniqueIds.length; i++) {
      const id = uniqueIds[i]
      await tx.userContentImage.create({ data: { imageId: id, userContentId } })
      await tx.image.update({ where: { id }, data: { position: startPos + i } })
    }
  }

  /**
   * Bulk-attach images to a freshly-created Message inside a caller-supplied
   * transaction. Pre-validates that every imageId exists, is owned by
   * `ownerProfileId`, and is not yet attached to any gallery. Inserts join
   * rows and assigns sequential `Image.position` values in caller-supplied
   * order so the bubble renders in the order the user picked.
   */
  async attachManyToMessageTx(
    tx: Prisma.TransactionClient,
    imageIds: string[],
    messageId: string,
    ownerProfileId: string
  ): Promise<void> {
    if (imageIds.length === 0) return

    // De-dupe caller input; downstream length checks and writes assume uniqueness.
    const uniqueIds = Array.from(new Set(imageIds))

    await lockUnattachedImages(tx, uniqueIds, ownerProfileId)

    // Writes iterate `uniqueIds` (deduped input order) so the bubble renders in
    // the order the user picked.
    for (let i = 0; i < uniqueIds.length; i++) {
      const id = uniqueIds[i]
      await tx.messageImage.create({ data: { imageId: id, messageId } })
      await tx.image.update({ where: { id }, data: { position: i } })
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
    await prisma.$transaction(async (tx) => {
      await lockGallery(tx, { profileId })
      await tx.profileImage.delete({ where: { imageId } })
      await compactGalleryPositions(tx, { profileId })
      await syncProfileHasFace(tx, profileId)
    })
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

    const { userContentId } = image.userContentGallery
    await prisma.$transaction(async (tx) => {
      await lockGallery(tx, { userContentId })
      await tx.userContentImage.delete({ where: { imageId } })
      await compactGalleryPositions(tx, { userContentId })
    })
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
        const { profileId } = image.profileGallery
        await lockGallery(tx, { profileId })
        await tx.profileImage.delete({ where: { imageId } })
        await tx.image.delete({ where: { id: imageId } })
        await compactGalleryPositions(tx, { profileId })
        await syncProfileHasFace(tx, profileId)
      } else if (image.userContentGallery) {
        const { userContentId } = image.userContentGallery
        await lockGallery(tx, { userContentId })
        await tx.userContentImage.delete({ where: { imageId } })
        await tx.image.delete({ where: { id: imageId } })
        await compactGalleryPositions(tx, { userContentId })
      } else {
        await tx.image.delete({ where: { id: imageId } })
      }
    })

    await this.unlinkImageFiles(image.storagePath)
  }

  /**
   * Delete an Image only if it is not in any gallery, regardless of owner.
   * Takes the same image row lock as every attach path, so an attach cannot
   * commit between the check and the delete: either the attach lands first and
   * this refuses, or this lands first and the attach finds no image.
   */
  async deleteUnattachedImage(imageId: string): Promise<void> {
    const image = await prisma.$transaction(async (tx) => {
      const [found] = await lockUnattachedImages(tx, [imageId])
      await tx.image.delete({ where: { id: imageId } })
      return found
    })

    await this.unlinkImageFiles(image.storagePath)
  }

  /** Post-commit, best-effort removal of an image's on-disk variants. */
  private async unlinkImageFiles(storagePath: string): Promise<void> {
    const baseFile = path.join(getMediaRoot(), imageBasePath(storagePath))
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
    if (items.length !== galleryCount || new Set(items.map((i) => i.id)).size !== items.length) {
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
      await lockGallery(tx, { profileId })
      for (const item of items) {
        await tx.image.update({ where: { id: item.id }, data: { position: item.position } })
      }
      await compactGalleryPositions(tx, { profileId })
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
    if (items.length !== galleryCount || new Set(items.map((i) => i.id)).size !== items.length) {
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
      await lockGallery(tx, { userContentId })
      for (const item of items) {
        await tx.image.update({ where: { id: item.id }, data: { position: item.position } })
      }
      await compactGalleryPositions(tx, { userContentId })
    })
    return this.listUserContentGallery(userContentId)
  }
}

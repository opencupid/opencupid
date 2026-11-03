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

/*
 * Locking. Row writes are the locks: in Postgres an UPDATE holds its row lock
 * until commit, so two transactions writing the same row run one after another,
 * and everything the later one reads afterwards includes the earlier one's
 * committed result. The writes only bump updatedAt. They are plain Prisma; no
 * raw SQL is needed.
 *
 * Lock order (always): the Profile row (profile-gallery work only), then Image
 * rows in id order, then ImageAttachment rows. Post galleries take no
 * gallery-level lock.
 */

/** Serialize work on one Profile gallery (keeps Profile.hasFace consistent). */
async function lockProfileGallery(tx: Prisma.TransactionClient, profileId: string) {
  await tx.profile.update({ where: { id: profileId }, data: { updatedAt: new Date() } })
}

/**
 * Serialize work on these images and load them with their memberships, read
 * under the lock. Images are locked in id order so multi-image callers cannot
 * deadlock each other. Throws NOT_FOUND if any image does not exist.
 */
async function lockImages(tx: Prisma.TransactionClient, imageIds: string[]) {
  const images = []
  for (const id of [...imageIds].sort()) {
    try {
      images.push(
        await tx.image.update({
          where: { id },
          data: { updatedAt: new Date() },
          include: { attachment: true, messageGallery: true },
        })
      )
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new ImageServiceError('NOT_FOUND', 'Image not found')
      }
      throw err
    }
  }
  return images
}

/** An image may be attached only by its owner, and only while it is in no gallery or message. */
function assertAttachable(
  image: { id: string; ownerProfileId: string; attachment: unknown; messageGallery: unknown },
  ownerProfileId: string
) {
  if (image.ownerProfileId !== ownerProfileId) {
    throw new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
  }
  if (image.attachment || image.messageGallery) {
    throw new ImageServiceError('ALREADY_ATTACHED', `Image ${image.id} already attached`)
  }
}

/**
 * Rewrite a gallery's order to `items` order. Positions come only from the
 * sequence: the gallery's rows are deleted and re-created in the new order, so
 * new positions never collide with existing ones. Images attached later still
 * land last. The images are locked first: re-inserting rows checks the Image
 * foreign key, which would otherwise wait on a concurrent deleteImage.
 */
async function reorderGallery(
  tx: Prisma.TransactionClient,
  gallery: { profileId: string } | { userContentId: string },
  items: ImagePosition[]
) {
  const ids = items.map((i) => i.id)
  if (new Set(ids).size !== ids.length) {
    throw new ImageServiceError('INVALID_REORDER', 'Reorder must include every image exactly once')
  }
  try {
    await lockImages(tx, ids)
  } catch (err) {
    if (err instanceof ImageServiceError && err.code === 'NOT_FOUND') {
      throw new ImageServiceError('INVALID_REORDER', 'Invalid image ID')
    }
    throw err
  }

  // Validated under the locks: these images cannot join or leave the gallery meanwhile.
  const members = await tx.imageAttachment.findMany({ where: gallery, select: { imageId: true } })
  const memberIds = new Set(members.map((m) => m.imageId))
  if (members.length !== ids.length || ids.some((id) => !memberIds.has(id))) {
    throw new ImageServiceError(
      'INVALID_REORDER',
      'Reorder must include every image in the gallery exactly once'
    )
  }

  // Scoped to the reordered images: a post gallery takes no gallery-level lock,
  // so an image attached after the check above must keep its row.
  await tx.imageAttachment.deleteMany({ where: { ...gallery, imageId: { in: ids } } })
  for (const imageId of ids) {
    await tx.imageAttachment.create({ data: { imageId, ...gallery } })
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
   * List the images in a Profile gallery, primary (lowest position) first.
   */
  async listProfileGallery(profileId: string): Promise<Image[]> {
    const rows = await prisma.imageAttachment.findMany({
      where: { profileId },
      include: { image: true },
      orderBy: { position: 'asc' },
    })
    return rows.map((r) => r.image)
  }

  /**
   * List the images in a UserContent gallery, first (lowest position) first.
   */
  async listUserContentGallery(userContentId: string): Promise<Image[]> {
    const rows = await prisma.imageAttachment.findMany({
      where: { userContentId },
      include: { image: true },
      orderBy: { position: 'asc' },
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
   * Attach an existing, unattached Image to its owner's Profile gallery. The new
   * attachment draws its position from the sequence, so it lands last.
   */
  async attachToProfile(imageId: string, profileId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await lockProfileGallery(tx, profileId)
      const [image] = await lockImages(tx, [imageId])
      assertAttachable(image, profileId)
      await tx.imageAttachment.create({ data: { imageId, profileId } })
      await syncProfileHasFace(tx, profileId)
    })
  }

  /**
   * Attach an existing, unattached Image to a UserContent gallery. The image must
   * belong to the content's author. Profile.hasFace is not involved.
   */
  async attachToUserContent(imageId: string, userContentId: string): Promise<void> {
    const content = await prisma.userContent.findUnique({ where: { id: userContentId } })
    if (!content) throw new ImageServiceError('NOT_FOUND', 'UserContent not found')

    await prisma.$transaction(async (tx) => {
      const [image] = await lockImages(tx, [imageId])
      assertAttachable(image, content.postedById)
      await tx.imageAttachment.create({ data: { imageId, userContentId } })
    })
  }

  /**
   * Bulk-attach images to a freshly-created UserContent inside a caller-supplied
   * transaction. Every image must exist, belong to `ownerProfileId` and be
   * unattached. Rows are created in `imageIds` order so the sequence-drawn
   * positions follow the order the user picked.
   */
  async attachManyToUserContentTx(
    tx: Prisma.TransactionClient,
    imageIds: string[],
    userContentId: string,
    ownerProfileId: string
  ): Promise<void> {
    if (imageIds.length === 0) return
    // De-dupe caller input; writes below assume uniqueness.
    const uniqueIds = Array.from(new Set(imageIds))

    for (const image of await lockImages(tx, uniqueIds)) assertAttachable(image, ownerProfileId)
    for (const imageId of uniqueIds) {
      await tx.imageAttachment.create({ data: { imageId, userContentId } })
    }
  }

  /**
   * Bulk-attach images to a freshly-created Message inside a caller-supplied
   * transaction. Every image must exist, belong to `ownerProfileId` and be in no
   * gallery or message. Image.position records the order the user picked, so the
   * bubble renders in that order.
   */
  async attachManyToMessageTx(
    tx: Prisma.TransactionClient,
    imageIds: string[],
    messageId: string,
    ownerProfileId: string
  ): Promise<void> {
    if (imageIds.length === 0) return
    // De-dupe caller input; writes below assume uniqueness.
    const uniqueIds = Array.from(new Set(imageIds))

    for (const image of await lockImages(tx, uniqueIds)) assertAttachable(image, ownerProfileId)
    for (const [position, imageId] of uniqueIds.entries()) {
      await tx.messageImage.create({ data: { imageId, messageId } })
      await tx.image.update({ where: { id: imageId }, data: { position } })
    }
  }

  /**
   * Remove an image from its owner's Profile gallery without deleting the Image.
   */
  async detachFromProfile(imageId: string, requesterProfileId: string): Promise<void> {
    await this.assertOwner(imageId, requesterProfileId)

    await prisma.$transaction(async (tx) => {
      await lockProfileGallery(tx, requesterProfileId)
      await lockImages(tx, [imageId])
      const { count } = await tx.imageAttachment.deleteMany({
        where: { imageId, profileId: requesterProfileId },
      })
      if (count === 0) {
        throw new ImageServiceError('NOT_FOUND', 'Image is not attached to a profile gallery')
      }
      await syncProfileHasFace(tx, requesterProfileId)
    })
  }

  /**
   * Remove an image from a UserContent gallery without deleting the Image.
   */
  async detachFromUserContent(
    imageId: string,
    requesterProfileId: string,
    userContentId: string
  ): Promise<void> {
    await this.assertOwner(imageId, requesterProfileId)

    await prisma.$transaction(async (tx) => {
      await lockImages(tx, [imageId])
      const { count } = await tx.imageAttachment.deleteMany({ where: { imageId, userContentId } })
      if (count === 0) {
        throw new ImageServiceError('NOT_FOUND', 'Image is not attached to this content gallery')
      }
    })
  }

  /** NOT_FOUND / OWNER_MISMATCH guard. Image.ownerProfileId never changes, so an unlocked read is enough. */
  private async assertOwner(imageId: string, requesterProfileId: string) {
    const image = await prisma.image.findUnique({ where: { id: imageId } })
    if (!image) throw new ImageServiceError('NOT_FOUND', 'Image not found')
    if (image.ownerProfileId !== requesterProfileId) {
      throw new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
    }
    return image
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
   * Delete an Image together with whatever gallery or message membership it has,
   * then unlink its files. The image can only be in its owner's Profile gallery,
   * so the owner's gallery is locked and Profile.hasFace re-synced every time.
   */
  async deleteImage(imageId: string, requesterProfileId: string): Promise<void> {
    const image = await this.assertOwner(imageId, requesterProfileId)

    await prisma.$transaction(async (tx) => {
      await lockProfileGallery(tx, image.ownerProfileId)
      await lockImages(tx, [imageId])
      await tx.image.delete({ where: { id: imageId } }) // cascades its attachment
      await syncProfileHasFace(tx, image.ownerProfileId)
    })

    await this.unlinkImageFiles(image.storagePath)
  }

  /**
   * Delete an Image only if it is in no gallery or message, regardless of owner.
   * Every attach path locks the image row first, so an attach either committed
   * before this check (and this refuses) or runs after this delete (and finds no
   * image).
   */
  async deleteUnattachedImage(imageId: string): Promise<void> {
    const image = await prisma.$transaction(async (tx) => {
      const [locked] = await lockImages(tx, [imageId])
      if (locked.attachment || locked.messageGallery) {
        throw new ImageServiceError('ALREADY_ATTACHED', 'Image is attached')
      }
      await tx.image.delete({ where: { id: imageId } })
      return locked
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
   * Reorder a Profile gallery to the order of `items` (their `position` values are
   * ignored; array order wins). Re-syncs Profile.hasFace and returns the gallery.
   */
  async reorderProfileGallery(profileId: string, items: ImagePosition[]): Promise<Image[]> {
    await prisma.$transaction(async (tx) => {
      await lockProfileGallery(tx, profileId)
      await reorderGallery(tx, { profileId }, items)
      await syncProfileHasFace(tx, profileId)
    })
    return this.listProfileGallery(profileId)
  }

  /**
   * Reorder a UserContent gallery to the order of `items` (array order wins).
   */
  async reorderUserContentGallery(userContentId: string, items: ImagePosition[]): Promise<Image[]> {
    await prisma.$transaction(async (tx) => {
      await reorderGallery(tx, { userContentId }, items)
    })
    return this.listUserContentGallery(userContentId)
  }
}

import path from 'path'
import fs from 'fs'

import { prisma } from '../lib/prisma'
import { getMediaRoot, imageBasePath, makeImageLocation, mediaUrl } from '@/lib/media'

import { generateContentHash } from '@/utils/hash'
import { ProfileImagePosition } from '@zod/profile/profileimage.dto'
import type { Image } from '@zod/generated'
import type { ImageOwner } from '@zod/image/image.dto'

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

/**
 * Owner-to-join-table descriptor used by every owner-scoped query in this
 * service. Local to the file — callers pass an `ImageOwner`, not this helper.
 */
type JoinDescriptor =
  | { kind: 'profile'; accessor: 'profileImage'; ownerKey: 'profileId'; ownerVal: string }
  | {
      kind: 'userContent'
      accessor: 'userContentImage'
      ownerKey: 'userContentId'
      ownerVal: string
    }

function ownerToJoin(owner: ImageOwner): JoinDescriptor {
  if (owner.type === 'profile') {
    return {
      kind: 'profile',
      accessor: 'profileImage',
      ownerKey: 'profileId',
      ownerVal: owner.profileId,
    }
  }
  return {
    kind: 'userContent',
    accessor: 'userContentImage',
    ownerKey: 'userContentId',
    ownerVal: owner.userContentId,
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
   * Get a single image by ID for the authenticated user
   */
  async getImage(id: string, userId: string): Promise<Image | null> {
    return prisma.image.findFirst({ where: { id, userId } })
  }

  /**
   * List all images for a given owner, ordered by position ascending.
   * Returns the flat Image rows (join rows are unwrapped).
   */
  async listImages(owner: ImageOwner): Promise<Image[]> {
    const join = ownerToJoin(owner)
    const rows = await (prisma[join.accessor] as any).findMany({
      where: { [join.ownerKey]: join.ownerVal },
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
    })
    return rows.map((r: { image: Image }) => r.image)
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
   * Store an image uploaded by the user.
   *
   * Creates the Image asset row and the matching owner-join row in a single
   * transaction. Position is scoped to the owner's gallery (count of siblings
   * within this owner's join table), not across all images uploaded by the
   * user.
   *
   * @param userId       ID of the user uploading the image (asset uploader)
   * @param tmpImagePath Path to the temporary uploaded file
   * @param captionText  Caption / alt text for the image
   * @param owner        Tagged owner — `profile` or `userContent`
   * @returns The created Image row and its owner-join row
   */
  async storeImage(
    userId: string,
    tmpImagePath: string,
    captionText: string,
    owner: ImageOwner
  ): Promise<{ image: Image; ownerRow: unknown }> {
    let imageLocation

    try {
      imageLocation = await makeImageLocation(userId)
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

      const join = ownerToJoin(owner)
      // Position scoped to the owner's gallery, not the user's total uploads.
      const position = await (prisma[join.accessor] as any).count({
        where: { [join.ownerKey]: join.ownerVal },
      })

      return await prisma.$transaction(async (tx) => {
        const image = (await tx.image.create({
          data: {
            userId,
            mimeType: processed.mime,
            altText: captionText,
            storagePath: path.join(imageLocation.relPath, imageLocation.base),
            isModerated: false,
            contentHash,
            blurhash: processed.blurhash,
            hasFace: processed.hasFace,
            position,
          },
        })) as Image

        const ownerRow =
          join.kind === 'profile'
            ? await tx.profileImage.create({
                data: { imageId: image.id, profileId: join.ownerVal },
              })
            : await tx.userContentImage.create({
                data: { imageId: image.id, userContentId: join.ownerVal },
              })

        return { image, ownerRow }
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
   * Update an Image asset row's metadata (altText only).
   */
  async updateImage(image: Image): Promise<Image> {
    return prisma.image.update({
      where: { id: image.id },
      data: {
        altText: image.altText,
      },
    })
  }

  /**
   * Delete an image owned by the given owner.
   *
   * Verifies a join row exists for this owner pointing at `imageId`. Returns
   * `false` when the image is not found or belongs to a different owner.
   * Otherwise removes the join row, the Image row, and (for profile owners)
   * syncs `Profile.hasFace`, all in one transaction. After the transaction
   * commits, deletes the on-disk variant files.
   */
  async deleteImage(owner: ImageOwner, imageId: string): Promise<boolean> {
    const join = ownerToJoin(owner)
    const joinRow = await (prisma[join.accessor] as any).findUnique({
      where: { imageId },
      include: { image: true },
    })

    if (!joinRow) {
      console.warn('Image not found')
      return false
    }
    if (joinRow[join.ownerKey] !== join.ownerVal) {
      console.warn('Image does not belong to owner')
      return false
    }

    const image = joinRow.image as Image
    try {
      await prisma.$transaction(async (tx) => {
        if (join.kind === 'profile') {
          await tx.profileImage.delete({ where: { id: joinRow.id } })
        } else {
          await tx.userContentImage.delete({ where: { id: joinRow.id } })
        }
        await tx.image.delete({ where: { id: image.id } })
        if (join.kind === 'profile') {
          await syncProfileHasFace(tx, join.ownerVal)
        }
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
        console.warn('Error deleting file:', err)
      }
    }
    return true
  }

  /**
   * Reorder an owner's images by updating each Image's `position`.
   *
   * Validates every requested image id is owned by this owner. Throws
   * `Error('Invalid image ID')` if any id is foreign. For profile owners,
   * syncs `Profile.hasFace` inside the same transaction. Returns the updated
   * Image rows sorted by position ascending.
   */
  async reorderImages(owner: ImageOwner, items: ProfileImagePosition[]): Promise<Image[]> {
    const join = ownerToJoin(owner)
    const requestedIds = items.map((i) => i.id)

    const valid = await (prisma[join.accessor] as any).findMany({
      where: { [join.ownerKey]: join.ownerVal, imageId: { in: requestedIds } },
      select: { imageId: true },
    })

    const validIds = new Set<string>(valid.map((v: { imageId: string }) => v.imageId))
    if (items.some((i) => !validIds.has(i.id))) {
      throw new Error('Invalid image ID')
    }

    return prisma.$transaction(async (tx) => {
      const updated: Image[] = []
      for (const item of items) {
        updated.push(
          (await tx.image.update({
            where: { id: item.id },
            data: { position: item.position },
          })) as Image
        )
      }
      if (join.kind === 'profile') {
        await syncProfileHasFace(tx, join.ownerVal)
      }
      return updated.sort((a, b) => a.position - b.position)
    })
  }
}

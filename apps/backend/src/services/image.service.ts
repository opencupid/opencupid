import path from 'path'
import fs from 'fs'

import { prisma } from '../lib/prisma'
import { getImageRoot, makeImageLocation } from '@/lib/media'

import { generateContentHash } from '@/utils/hash'
import { ProfileImagePosition } from '@zod/profile/profileimage.dto'
import sharp from 'sharp'
import type { ProfileImage } from '@zod/generated'
import { FaceDetectionService } from './face-detection.service'

const sizes = [
  { name: 'thumb', width: 150, height: 150, fit: sharp.fit.cover }, // square crop
  { name: 'card', width: 480 }, // keep aspect ratio
  { name: 'full', width: 1280 }, // max width
]
export class ImageService {
  private static instance: ImageService
  private faceDetectionService: FaceDetectionService

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    this.faceDetectionService = FaceDetectionService.getInstance()
  }

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
      imageLocation = await makeImageLocation()
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
    // Note: Temporary file cleanup is handled automatically by @fastify/multipart
    // No manual cleanup needed to avoid ENOENT errors
  }

  /**
   * Auto-crop an image based on face detection
   * @param filePath - Path to the image file
   * @param outputDir - Directory to save the cropped image
   * @param baseName - Base name for the output file
   * Returns path to the cropped image if successful, null otherwise
   */
  async autoCrop(filePath: string, outputDir: string, baseName: string): Promise<string | null> {
    // Check if face API is enabled
    if (!this.faceDetectionService.isEnabled()) {
      return null;
    }

    const outputPath = path.join(outputDir, `${baseName}-face.jpg`)
    
    try {
      const success = await this.faceDetectionService.autoCrop(filePath, outputPath)
      return success ? outputPath : null
    } catch (error) {
      console.error('Error in autoCrop:', error)
      return null
    }
    // Note: Temporary file cleanup is handled automatically by @fastify/multipart
    // No manual cleanup needed to avoid ENOENT errors
  }

  /**
   * Process an uploaded image file, resizing and saving variants
   * @param filePath - Path to the uploaded image file
   * @param outputDir - Directory to save processed images
   * @param baseName - Base name for the output files
   * Returns an object with metadata and paths to resized images
   */
  async processImage(filePath: string, outputDir: string, baseName: string) {
    await fs.promises.mkdir(outputDir, { recursive: true })

    const original = sharp(filePath).rotate()

    const metadata = await original.metadata()
    const format = metadata.format ?? 'jpeg'

    const outputPaths: Record<string, string> = {}

    // Try to generate a face-cropped version first
    const faceCroppedPath = await this.autoCrop(filePath, outputDir, baseName)
    
    // If face detection succeeded, use face-cropped version for card and thumb
    const sourceForCropVersions = faceCroppedPath || filePath
    const sourceForCropVersionsSharp = sharp(sourceForCropVersions).rotate()

    for (const size of sizes) {
      let resizedSource = original.clone()
      
      // Use face-cropped version for card and thumb sizes if available
      if (faceCroppedPath && (size.name === 'card' || size.name === 'thumb')) {
        resizedSource = sourceForCropVersionsSharp.clone()
      }

      const resized = resizedSource.resize({
        width: size.width,
        height: size.height,
        fit: size.fit ?? sharp.fit.inside,
      })

      const outputWebP = path.join(outputDir, `${baseName}-${size.name}.webp`)
      await resized.webp({ quality: 85 }).toFile(outputWebP)

      outputPaths[size.name] = outputWebP
    }

    // Optionally save cleaned original as JPEG
    const originalCleaned = path.join(outputDir, `${baseName}-original.jpg`)
    await original.jpeg({ quality: 90 }).toFile(originalCleaned)

    outputPaths.original = originalCleaned

    // Include face-cropped version in outputs if generated
    if (faceCroppedPath) {
      outputPaths.face = faceCroppedPath
    }

    return {
      width: metadata.width,
      height: metadata.height,
      mime: `image/${format}`,
      variants: outputPaths,
    }
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
      ...sizes.map(size => `${baseFile}-${size.name}.webp`),
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

import path from 'path'
import fs from 'fs'
import '@tensorflow/tfjs-node'
import * as faceapi from 'face-api.js'
import * as canvas from 'canvas'
import { appConfig } from '../lib/appconfig'

import { prisma } from '../lib/prisma'
import { ProfileImage } from '@prisma/client'
import { getImageRoot, makeImageLocation } from 'src/lib/media'

import { generateContentHash } from '@/utils/hash'
import { ProfileImagePosition } from '@zod/profile/profileimage.dto'
import sharp from 'sharp'

const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({
  Canvas: Canvas as unknown as typeof HTMLCanvasElement,
  Image: Image as unknown as typeof HTMLImageElement,
  ImageData: ImageData as any
})

const MODEL_PATH = path.resolve(appConfig.MODEL_PATH)

const sizes = [
  { name: 'thumb', width: 150, height: 150, fit: sharp.fit.cover }, // square crop
  { name: 'card', width: 480 }, // keep aspect ratio
  { name: 'full', width: 1280 }, // max width
]
export class ImageService {
  private static instance: ImageService
  private faceModelsLoaded = false

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

  private async loadFaceModels() {
    if (!this.faceModelsLoaded) {
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH)
      this.faceModelsLoaded = true
    }
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

  private async autoCrop(filePath: string, outputDir: string, baseName: string) {
    try {
      await this.loadFaceModels()
    } catch (err) {
      console.error('Failed to load face models', err)
      return null
    }

    const buffer = await sharp(filePath).rotate().toBuffer()
    const img = await canvas.loadImage(buffer)
    const detection = await faceapi.detectSingleFace(img)
    if (!detection) {
      return null
    }

    const imgWidth = img.width
    const imgHeight = img.height
    const box = detection.box
    const faceSize = Math.max(box.width, box.height)
    let cropSize = Math.min(Math.max(faceSize * 2, faceSize * 1.5), Math.min(imgWidth, imgHeight))

    cropSize = Math.min(cropSize, imgWidth, imgHeight)
    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2
    let left = Math.round(centerX - cropSize / 2)
    let top = Math.round(centerY - cropSize / 2)
    if (left < 0) left = 0
    if (top < 0) top = 0
    if (left + cropSize > imgWidth) left = imgWidth - cropSize
    if (top + cropSize > imgHeight) top = imgHeight - cropSize

    const out = path.join(outputDir, `${baseName}-face.jpg`)
    await sharp(buffer)
      .extract({
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(cropSize),
        height: Math.round(cropSize),
      })
      .jpeg({ quality: 90 })
      .toFile(out)

    return out
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
    } finally {
      // Ensure the temporary file is deleted regardless of success or failure
      try {
        await fs.promises.unlink(tmpImagePath)
      } catch (unlinkErr) {
        // console.error('Failed to delete temporary file after processing', unlinkErr);
      }
    }
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
    const facePath = await this.autoCrop(filePath, outputDir, baseName)

    const metadata = await original.metadata()
    const format = metadata.format ?? 'jpeg'

    const outputPaths: Record<string, string> = {}

    for (const size of sizes) {
      const source =
        facePath && (size.name === 'thumb' || size.name === 'card')
          ? sharp(facePath)
          : original.clone()
      const resized = source.resize({
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
    if (facePath) {
      outputPaths.face = facePath
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

    const validIds = new Set(valid.map(v => v.id))
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
    return updated.sort((a, b) => a.position - b.position)
  }
}

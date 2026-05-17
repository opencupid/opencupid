import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { prisma } from '@/lib/prisma'
import { ImageService } from '../src/services/image.service'
import { getMediaRoot, imageBasePath } from '../src/lib/media'
import { ImageProcessor } from '../src/services/imageprocessor'
import { syncProfileHasFace } from '../src/services/profile.service'

const imageService = ImageService.getInstance()

async function main() {
  await ImageProcessor.initialize()

  const images = await prisma.image.findMany()

  console.log(`Found ${images.length} images to reprocess`)

  let success = 0
  let skipped = 0
  let failed = 0

  for (const img of images) {
    const basePath = path.join(getMediaRoot(), imageBasePath(img.storagePath))
    const originalFile = `${basePath}-original.jpg`
    const outputDir = path.dirname(basePath)
    const baseName = path.basename(basePath)

    if (!fs.existsSync(originalFile)) {
      console.warn(`⚠️  Original file not found for ${img.id}: ${originalFile}`)
      skipped++
      continue
    }

    try {
      console.log(`Reprocessing ${img.id}`)
      const result = await imageService.reprocessImage(originalFile, outputDir, baseName)

      await prisma.image.update({
        where: { id: img.id },
        data: {
          blurhash: result.blurhash,
          width: result.width ?? null,
          height: result.height ?? null,
          hasFace: result.hasFace,
        },
      })

      console.log(
        `✔ ${img.id} → blurhash=${result.blurhash.slice(0, 12)}… hasFace=${result.hasFace}`
      )
      success++
    } catch (err) {
      console.error(`❌ Failed to reprocess image ${img.id}:`, err)
      failed++
    }
  }

  console.log(`\nImages: ${success} updated, ${skipped} skipped, ${failed} failed`)

  // Mirror Profile.hasFace from the now-current Image.hasFace via the Profile gallery's position-0 image.
  const profilesWithGallery = await prisma.profile.findMany({
    where: { profileImages: { some: {} } },
    select: { id: true },
  })

  console.log(`\nResyncing Profile.hasFace for ${profilesWithGallery.length} profiles…`)
  for (const p of profilesWithGallery) {
    await prisma.$transaction(async (tx) => {
      await syncProfileHasFace(tx, p.id)
    })
  }
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { ImageService } from '../src/services/image.service'
import { getMediaRoot, imageBasePath } from '../src/lib/media'
import { ImageProcessor } from '../src/services/imageprocessor'

const prisma = new PrismaClient()
const imageService = ImageService.getInstance()

async function main() {
  await ImageProcessor.initialize()

  const images = await prisma.profileImage.findMany()

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

      await prisma.profileImage.update({
        where: { id: img.id },
        data: {
          blurhash: result.blurhash,
          width: result.width,
          height: result.height,
        },
      })

      console.log(`✔ ${img.id} → blurhash=${result.blurhash.slice(0, 12)}…`)
      success++
    } catch (err) {
      console.error(`❌ Failed to reprocess image ${img.id}:`, err)
      failed++
    }
  }

  console.log(`\nDone: ${success} updated, ${skipped} skipped, ${failed} failed`)
}

main()
  .catch((err) => {
    console.error(err)
  })
  .finally(() => prisma.$disconnect())

import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { ImageService } from '../src/services/image.service'
import { getImageRoot } from '../src/lib/media'

const prisma = new PrismaClient()
const imageService = ImageService.getInstance()


async function main() {

  await imageService.initialize()

  const images = await prisma.profileImage.findMany({
    where: {
      userId: 'cmd24iao800006wxr0vwglvzd'
    },
  })

  for (const img of images) {
    const basePath = path.join(getImageRoot(), img.storagePath)
    const originalFile = `${basePath}-original.jpg`
    const outputDir = path.dirname(basePath)
    const baseName = path.basename(basePath)

    if (!fs.existsSync(originalFile)) {
      console.warn(`⚠️  Original file not found for ${img.id}: ${originalFile}`)
      continue
    }

    try {
      console.log(`Reprocessing ${originalFile}`)
      await imageService.reprocessImage(originalFile, outputDir, baseName)
      console.log(`✔ Reprocessed ${img.id}`)
    } catch (err) {
      console.error(`❌ Failed to reprocess image ${img.id}:`, err)
    }
  }
}

main()
  .catch(err => {
    console.error(err)
  })
  .finally(() => prisma.$disconnect())
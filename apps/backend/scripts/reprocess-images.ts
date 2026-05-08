import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { prisma } from '../src/lib/prisma'
import { ImageService } from '../src/services/image.service'
import { getMediaRoot, imageBasePath } from '../src/lib/media'
import { ImageProcessor } from '../src/services/imageprocessor'
import { syncProfileHasFace } from '../src/services/profile.service'
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

  // Mirror Profile.hasFace from the now-current ProfileImage.hasFace at position 0.
  const profiles = await prisma.profile.findMany({ select: { id: true } })
  console.log(`\nSyncing Profile.hasFace for ${profiles.length} profiles`)

  let synced = 0
  let syncFailed = 0
  for (const p of profiles) {
    try {
      await prisma.$transaction((tx) => syncProfileHasFace(tx, p.id))
      synced++
    } catch (err) {
      console.error(`❌ Failed to sync Profile ${p.id}:`, err)
      syncFailed++
    }
  }

  console.log(`Profiles: ${synced} synced, ${syncFailed} failed`)
}

main()
  .catch((err) => {
    console.error(err)
  })
  .finally(() => prisma.$disconnect())

/**
 * Backfill blurhash for existing ProfileImage records.
 *
 * Usage: cd apps/backend && npx tsx ../../scripts/backfill-blurhash.ts
 *
 * Requires DATABASE_URL and MEDIA_UPLOAD_DIR env vars (reads from ../../.env).
 */
import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { encode } from 'blurhash'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function encodeBlurhash(buffer: Buffer): Promise<string> {
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3)
}

async function main() {
  const mediaDir = process.env.MEDIA_UPLOAD_DIR
  if (!mediaDir) {
    console.error('MEDIA_UPLOAD_DIR is not set')
    process.exit(1)
  }

  const images = await prisma.profileImage.findMany({
    where: { blurhash: null },
    select: { id: true, storagePath: true },
  })

  console.log(`Found ${images.length} images without blurhash`)

  let updated = 0
  let skipped = 0

  for (const img of images) {
    const originalPath = path.join(mediaDir, `${img.storagePath}-original.jpg`)

    if (!fs.existsSync(originalPath)) {
      console.warn(`Skipping ${img.id}: file not found at ${originalPath}`)
      skipped++
      continue
    }

    try {
      const buffer = await fs.promises.readFile(originalPath)
      const blurhash = await encodeBlurhash(buffer)

      await prisma.profileImage.update({
        where: { id: img.id },
        data: { blurhash },
      })

      updated++
      if (updated % 50 === 0) console.log(`Updated ${updated}/${images.length}`)
    } catch (err) {
      console.error(`Error processing ${img.id}:`, err)
      skipped++
    }
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

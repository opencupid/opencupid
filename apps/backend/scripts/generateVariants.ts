#!/usr/bin/env ts-node
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'
import { smartcropImage } from '../src/services/smartcrop.service'
import { appConfig } from '../src/lib/appconfig'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const variants = [
  { name: 'thumbnail', width: 96, height: 96 },
  { name: 'small', width: 320 },
  { name: 'medium', width: 640 },
  { name: 'large', width: 1280 },
  { name: 'square', width: 600, height: 600 },
]

const argv = yargs(hideBin(process.argv))
  .option('dry-run', { type: 'boolean', default: false })
  .option('force', { type: 'boolean', default: false })
  .parseSync()

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, files)
    else if (entry.isFile() && entry.name.endsWith('-original.jpg')) files.push(full)
  }
  return files
}

async function processImage(file: string): Promise<boolean> {
  const dir = path.dirname(file)
  const base = path.basename(file, '-original.jpg')
  const srcStat = await fs.stat(file)
  let generated = 0
  for (const v of variants) {
    const out = path.join(dir, `${base}-${v.name}.jpg`)
    try {
      const outStat = await fs.stat(out)
      if (!argv.force && outStat.mtimeMs >= srcStat.mtimeMs) {
        continue
      }
    } catch {}
    if (argv['dry-run']) {
      generated++
      continue
    }
    const buffer = await fs.readFile(file)
    const crop = await smartcropImage(buffer, { width: v.width, height: v.height ?? v.width })
    let img = sharp(buffer).extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
    img = img.resize(v.width, v.height, { fit: sharp.fit.cover })
    await img.jpeg({ quality: 90 }).toFile(out)
    generated++
  }
  return generated > 0
}

async function main() {
  const root = appConfig.MEDIA_UPLOAD_DIR
  const files = await walk(root)
  let processed = 0
  let skipped = 0
  for (const f of files) {
    const changed = await processImage(f)
    if (changed) processed++
    else skipped++
  }
  console.log(`Processed ${files.length} images (${processed} new, ${skipped} skipped)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

import path from 'path'
import fs from 'fs'
import { appConfig } from '@/lib/appconfig'
import { TagService } from './tag.service'
import type { PopularTag } from '@zod/tag/tag.dto'

const CACHE_DIR = path.join(appConfig.MEDIA_UPLOAD_DIR, 'cache')
const SVG_PATH = path.join(CACHE_DIR, 'tagcloud.svg')
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

const WIDTH = 600
const HEIGHT = 400
const FONT_MIN = 12
const FONT_MAX = 48
const FONT_FAMILY = 'sans-serif'

// Warm earthy palette matching the landing page
const COLORS = ['#5e4b2c', '#8b6914', '#6b8e23', '#a0522d', '#2e8b57', '#b8860b', '#556b2f']

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function scaleFontSize(count: number, minCount: number, maxCount: number): number {
  if (maxCount === minCount) return (FONT_MIN + FONT_MAX) / 2
  const ratio = (count - minCount) / (maxCount - minCount)
  return FONT_MIN + ratio * (FONT_MAX - FONT_MIN)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type PlacedWord = { text: string; size: number; x: number; y: number }

/**
 * Simple spiral placement layout for word cloud.
 * Places words in an Archimedean spiral from center outward,
 * estimating bounding boxes from font size and text length.
 */
function layoutWords(words: Array<{ text: string; size: number }>): PlacedWord[] {
  const placed: PlacedWord[] = []
  const rects: Array<{ x: number; y: number; w: number; h: number }> = []

  // Sort largest first for better packing
  const sorted = [...words].sort((a, b) => b.size - a.size)

  for (const word of sorted) {
    // Estimate text width: ~0.6 chars * font-size
    const charWidth = word.size * 0.6
    const w = word.text.length * charWidth
    const h = word.size * 1.2

    let bestX = 0
    let bestY = 0
    let found = false

    // Spiral outward from center
    for (let t = 0; t < 1000 && !found; t++) {
      const angle = t * 0.15
      const radius = 3 * angle
      const cx = radius * Math.cos(angle)
      const cy = radius * Math.sin(angle) * 0.65 // Compress vertically

      const rx = cx - w / 2
      const ry = cy - h / 2

      // Check bounds
      if (
        rx < -WIDTH / 2 + 5 ||
        rx + w > WIDTH / 2 - 5 ||
        ry < -HEIGHT / 2 + 5 ||
        ry + h > HEIGHT / 2 - 5
      ) {
        continue
      }

      // Check overlap with placed words
      let overlaps = false
      for (const r of rects) {
        if (rx < r.x + r.w && rx + w > r.x && ry < r.y + r.h && ry + h > r.y) {
          overlaps = true
          break
        }
      }

      if (!overlaps) {
        bestX = cx
        bestY = cy
        rects.push({ x: rx, y: ry, w, h })
        found = true
      }
    }

    if (found) {
      placed.push({ text: word.text, size: word.size, x: bestX, y: bestY })
    }
  }

  return placed
}

function generateSvg(tags: PopularTag[]): string {
  if (tags.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"></svg>`
  }

  const minCount = Math.min(...tags.map((t) => t.count))
  const maxCount = Math.max(...tags.map((t) => t.count))

  const words = tags.map((tag) => ({
    text: tag.name,
    size: scaleFontSize(tag.count, minCount, maxCount),
  }))

  const placed = layoutWords(words)

  const textEls = placed
    .map((w, i) => {
      const color = COLORS[i % COLORS.length]
      return `<text text-anchor="middle" dominant-baseline="central" x="${w.x}" y="${w.y}" style="font-size:${w.size}px;font-family:${FONT_FAMILY};fill:${color}">${escapeXml(w.text)}</text>`
    })
    .join('\n    ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="${-WIDTH / 2} ${-HEIGHT / 2} ${WIDTH} ${HEIGHT}">
    ${textEls}
  </svg>`
}

export function getCachedSvgPath(): string | null {
  if (!fs.existsSync(SVG_PATH)) return null
  return SVG_PATH
}

export function isCacheStale(): boolean {
  if (!fs.existsSync(SVG_PATH)) return true
  const stat = fs.statSync(SVG_PATH)
  return Date.now() - stat.mtimeMs > MAX_AGE_MS
}

let regenerating = false

export async function regenerateTagCloud(): Promise<void> {
  if (regenerating) return
  regenerating = true
  try {
    ensureCacheDir()
    const tagService = TagService.getInstance()
    const tags = await tagService.getPopularTags({ limit: 80, locale: 'en' })
    const svg = generateSvg(tags)
    await fs.promises.writeFile(SVG_PATH, svg, 'utf-8')
  } finally {
    regenerating = false
  }
}

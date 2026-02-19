import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs'

let mockGetPopularTags: any

vi.mock('../../services/tag.service', () => ({
  TagService: {
    getInstance: () => ({
      getPopularTags: (...args: any[]) => mockGetPopularTags(...args),
    }),
  },
}))

let getCachedSvgPath: any
let isCacheStale: any
let regenerateTagCloud: any

beforeEach(async () => {
  vi.resetModules()
  mockGetPopularTags = vi.fn()

  const mod = await import('../../services/tagcloud.service')
  getCachedSvgPath = mod.getCachedSvgPath
  isCacheStale = mod.isCacheStale
  regenerateTagCloud = mod.regenerateTagCloud
})

describe('tagcloud.service', () => {
  describe('regenerateTagCloud', () => {
    it('generates an SVG file from popular tags', async () => {
      mockGetPopularTags.mockResolvedValue([
        { id: 't1', name: 'Hiking', slug: 'hiking', count: 10 },
        { id: 't2', name: 'Music', slug: 'music', count: 5 },
        { id: 't3', name: 'Art', slug: 'art', count: 3 },
      ])

      await regenerateTagCloud()

      expect(mockGetPopularTags).toHaveBeenCalledWith({ limit: 80, locale: 'en' })

      const svgPath = getCachedSvgPath()
      expect(svgPath).not.toBeNull()
      const content = fs.readFileSync(svgPath!, 'utf-8')
      expect(content).toContain('<svg')
      expect(content).toContain('Hiking')
      expect(content).toContain('Music')
      expect(content).toContain('Art')
    })

    it('generates empty SVG when no tags', async () => {
      mockGetPopularTags.mockResolvedValue([])

      await regenerateTagCloud()

      const svgPath = getCachedSvgPath()
      expect(svgPath).not.toBeNull()
      const content = fs.readFileSync(svgPath!, 'utf-8')
      expect(content).toContain('<svg')
      expect(content).not.toContain('<text')
    })
  })

  describe('isCacheStale', () => {
    it('returns true when no cache exists', () => {
      const svgPath = getCachedSvgPath()
      if (svgPath && fs.existsSync(svgPath)) {
        fs.unlinkSync(svgPath)
      }
      expect(isCacheStale()).toBe(true)
    })

    it('returns false for fresh cache', async () => {
      mockGetPopularTags.mockResolvedValue([{ id: 't1', name: 'Test', slug: 'test', count: 5 }])
      await regenerateTagCloud()
      expect(isCacheStale()).toBe(false)
    })
  })
})

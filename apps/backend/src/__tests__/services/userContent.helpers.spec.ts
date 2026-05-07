import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  visible,
  notDeleted,
  ownedBy,
  visibilityFilter,
  paginate,
  softDeleteData,
  boundingBoxWhere,
  boundsWhere,
  recentSince,
} from '@/services/userContent.helpers'

describe('userContent.helpers', () => {
  describe('where-clause constants', () => {
    it('visible flags both isDeleted=false and isVisible=true', () => {
      expect(visible).toEqual({ isDeleted: false, isVisible: true })
    })

    it('notDeleted flags isDeleted=false only', () => {
      expect(notDeleted).toEqual({ isDeleted: false })
    })
  })

  describe('ownedBy', () => {
    it('builds an owner-scoped live-row predicate', () => {
      expect(ownedBy('post-1', 'profile-1')).toEqual({
        id: 'post-1',
        postedById: 'profile-1',
        isDeleted: false,
      })
    })
  })

  describe('visibilityFilter', () => {
    it('returns empty object when invisible rows are allowed', () => {
      expect(visibilityFilter(true)).toEqual({})
    })

    it('forces isVisible=true otherwise', () => {
      expect(visibilityFilter(false)).toEqual({ isVisible: true })
    })
  })

  describe('paginate', () => {
    it('passes through explicit limit/offset', () => {
      expect(paginate({ limit: 5, offset: 10 })).toEqual({ take: 5, skip: 10 })
    })

    it('defaults limit to 20 and offset to 0 when absent', () => {
      expect(paginate({})).toEqual({ take: 20, skip: 0 })
    })

    it('defaults each independently', () => {
      expect(paginate({ limit: 7 })).toEqual({ take: 7, skip: 0 })
      expect(paginate({ offset: 40 })).toEqual({ take: 20, skip: 40 })
    })
  })

  describe('softDeleteData', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-01T12:00:00Z'))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('produces a fresh updatedAt per call (not module-load time)', () => {
      const first = softDeleteData()
      vi.setSystemTime(new Date('2026-05-01T13:00:00Z'))
      const second = softDeleteData()
      expect(first).toEqual({ isDeleted: true, updatedAt: new Date('2026-05-01T12:00:00Z') })
      expect(second).toEqual({ isDeleted: true, updatedAt: new Date('2026-05-01T13:00:00Z') })
    })
  })

  describe('boundingBoxWhere', () => {
    it('produces a square ~radius/111 deg wide at the equator', () => {
      const box = boundingBoxWhere(0, 0, 111)
      expect(box.lat.gte).toBeCloseTo(-1, 5)
      expect(box.lat.lte).toBeCloseTo(1, 5)
      expect(box.lon.gte).toBeCloseTo(-1, 5)
      expect(box.lon.lte).toBeCloseTo(1, 5)
    })

    it('widens longitude span in degrees at higher latitudes (cos correction for fixed km radius)', () => {
      const equator = boundingBoxWhere(0, 0, 111)
      const at60 = boundingBoxWhere(60, 0, 111)
      const equatorLonSpan = equator.lon.lte - equator.lon.gte
      const at60LonSpan = at60.lon.lte - at60.lon.gte
      // cos(60°) = 0.5, so to cover the same km radius, the box must span ~2× more degrees of longitude at 60° lat
      expect(at60LonSpan).toBeCloseTo(equatorLonSpan * 2, 4)
    })

    it('keeps latitude span constant regardless of latitude', () => {
      const a = boundingBoxWhere(0, 0, 50)
      const b = boundingBoxWhere(45, 30, 50)
      expect(b.lat.lte - b.lat.gte).toBeCloseTo(a.lat.lte - a.lat.gte, 6)
    })
  })

  describe('boundsWhere', () => {
    it('translates a viewport box into a Prisma where-fragment', () => {
      expect(boundsWhere({ south: 50, north: 52, west: -1, east: 1 })).toEqual({
        lat: { gte: 50, lte: 52 },
        lon: { gte: -1, lte: 1 },
      })
    })
  })

  describe('recentSince', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-01T00:00:00Z'))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns the timestamp `days` days ago', () => {
      expect(recentSince(7)).toEqual(new Date('2026-04-24T00:00:00Z'))
    })

    it('returns a fresh Date per call', () => {
      const first = recentSince(0)
      vi.setSystemTime(new Date('2026-05-02T00:00:00Z'))
      const second = recentSince(0)
      expect(first).not.toEqual(second)
    })
  })
})

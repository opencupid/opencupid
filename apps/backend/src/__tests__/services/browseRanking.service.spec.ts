import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  profile: { findUnique: vi.fn(), findMany: vi.fn() },
  userContent: { findMany: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

import {
  ACTIVITY_WEIGHT,
  W_ACT,
  W_DIST,
  W_MATCH,
  W_RAND,
  jitter,
  loadRankInputs,
  proximity,
  rankListRefs,
  rankScore,
  type RankInput,
} from '@/services/browseRanking.service'

const input = (segment: RankInput['segment'], distanceKm: number | null): RankInput => ({
  segment,
  distanceKm,
})

describe('browseRanking', () => {
  describe('proximity', () => {
    it('is 1 at the viewer home, one half at 25 km, and falls with distance', () => {
      expect(proximity(0)).toBe(1)
      expect(proximity(25)).toBeCloseTo(0.5)
      expect(proximity(5)).toBeGreaterThan(proximity(50))
    })
  })

  describe('jitter', () => {
    it('is deterministic for a seed and in [0, 1)', () => {
      const a = jitter('seed-1', 'p1')
      expect(jitter('seed-1', 'p1')).toBe(a)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(1)
    })

    it('differs between seeds', () => {
      const ids = Array.from({ length: 20 }, (_, i) => `p${i}`)
      const s1 = ids.map((id) => jitter('seed-1', id))
      const s2 = ids.map((id) => jitter('seed-2', id))
      expect(s1).not.toEqual(s2)
    })
  })

  describe('rankScore', () => {
    it('weights activity, proximity, the match bonus and jitter', () => {
      expect(rankScore(input('frequent', 25), true, 0.5)).toBeCloseTo(
        W_ACT * 1 + W_DIST * 0.5 + W_MATCH + W_RAND * 0.5
      )
    })

    it('leaves out the proximity term when there is no home distance', () => {
      expect(rankScore(input('returning', null), false, 0.5)).toBeCloseTo(
        W_ACT * 0.7 + W_RAND * 0.5
      )
    })

    it('never scores a dormant profile at zero activity', () => {
      expect(ACTIVITY_WEIGHT.dormant).toBeGreaterThan(0)
    })

    it('gives a dormant match the full, unscaled match bonus', () => {
      const match = rankScore(input('dormant', 10), true, 0)
      const nonMatch = rankScore(input('dormant', 10), false, 0)
      expect(match - nonMatch).toBeCloseTo(W_MATCH)
    })

    it('keeps the match bonus below the jitter range, so matches do not own the top', () => {
      expect(W_MATCH).toBeLessThan(W_RAND)
    })
  })

  describe('rankListRefs', () => {
    const refs = (...ids: [string, boolean][]) =>
      ids.map(([id, highlighted]) => ({ id, highlighted }))

    it('ranks an active match above an otherwise equal non-match', () => {
      const inputs = new Map([
        ['match', input('frequent', 10)],
        ['other', input('frequent', 10)],
      ])
      let matchFirst = 0
      for (let s = 0; s < 200; s++) {
        const ranked = rankListRefs(refs(['other', false], ['match', true]), inputs, `s${s}`)
        if (ranked[0]!.id === 'match') matchFirst++
      }
      // Gap 0.15 against a 0.20 jitter range: the match leads in ~97% of seeds.
      expect(matchFirst).toBeGreaterThan(180)
    })

    it('lets a closer active non-match outrank a farther match in some shuffles', () => {
      const inputs = new Map([
        ['match', input('frequent', 20)],
        ['near', input('frequent', 5)],
      ])
      const firsts = new Set<string>()
      for (let s = 0; s < 200; s++) {
        firsts.add(rankListRefs(refs(['match', true], ['near', false]), inputs, `s${s}`)[0]!.id)
      }
      expect(firsts).toEqual(new Set(['match', 'near']))
    })

    it('ranks closer items first at equal activity, without a match', () => {
      const inputs = new Map([
        ['near', input('returning', 1)],
        ['far', input('returning', 400)],
      ])
      // Proximity gap (≈0.28) exceeds the jitter range, so this holds for any seed.
      for (let s = 0; s < 50; s++) {
        const ranked = rankListRefs(refs(['far', false], ['near', false]), inputs, `s${s}`)
        expect(ranked.map((r) => r.id)).toEqual(['near', 'far'])
      }
    })

    it('ranks frequent above dormant at the same distance', () => {
      const inputs = new Map([
        ['dormant', input('dormant', 10)],
        ['active', input('frequent', 10)],
      ])
      // Activity gap 0.315 exceeds the jitter range.
      for (let s = 0; s < 50; s++) {
        const ranked = rankListRefs(refs(['dormant', false], ['active', false]), inputs, `s${s}`)
        expect(ranked[0]!.id).toBe('active')
      }
    })

    it('gives the same order for the same seed and a different one for another seed', () => {
      const ids = Array.from({ length: 30 }, (_, i) => `p${String(i).padStart(2, '0')}`)
      const inputs = new Map(ids.map((id) => [id, input('frequent', 10)]))
      const list = ids.map((id) => ({ id, highlighted: false }))

      const a = rankListRefs(list, inputs, 'seed-a').map((r) => r.id)
      expect(rankListRefs([...list].reverse(), inputs, 'seed-a').map((r) => r.id)).toEqual(a)
      expect(rankListRefs(list, inputs, 'seed-b').map((r) => r.id)).not.toEqual(a)
    })

    it('throws when a ref has no rank input', () => {
      expect(() => rankListRefs(refs(['ghost', false]), new Map(), 's')).toThrow(/ghost/)
    })
  })

  describe('loadRankInputs', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockPrisma.profile.findUnique.mockResolvedValue({ lat: 47.5, lon: 19.0 })
      mockPrisma.profile.findMany.mockResolvedValue([])
      mockPrisma.userContent.findMany.mockResolvedValue([])
    })

    it("measures distance from the viewer's home and reads each profile's segment", async () => {
      mockPrisma.profile.findMany.mockResolvedValue([
        { id: 'p1', activitySummary: { segment: 'frequent' } },
        { id: 'p2', activitySummary: null },
      ])

      const inputs = await loadRankInputs('viewer', [
        { kind: 'profile', id: 'p1', lat: 47.5, lon: 19.0 },
        { kind: 'profile', id: 'p2', lat: 47.51, lon: 19.0 },
      ])

      expect(inputs.get('p1')).toEqual({ segment: 'frequent', distanceKm: 0 })
      // No activity summary row: an account the nightly distill hasn't seen yet.
      expect(inputs.get('p2')!.segment).toBe('new')
      // 0.01° of latitude ≈ 1.11 km
      expect(inputs.get('p2')!.distanceKm).toBeCloseTo(1.11, 1)
      expect(mockPrisma.userContent.findMany).not.toHaveBeenCalled()
    })

    it("gives a content item its poster's segment", async () => {
      mockPrisma.userContent.findMany.mockResolvedValue([
        { id: 'post1', postedBy: { activitySummary: { segment: 'returning' } } },
      ])

      const inputs = await loadRankInputs('viewer', [
        { kind: 'post', id: 'post1', lat: 47.5, lon: 19.0 },
      ])

      expect(inputs.get('post1')!.segment).toBe('returning')
      expect(mockPrisma.profile.findMany).not.toHaveBeenCalled()
    })

    it('gives null distances when the viewer has no home location', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({ lat: null, lon: null })

      const inputs = await loadRankInputs('viewer', [
        { kind: 'profile', id: 'p1', lat: 47.5, lon: 19.0 },
      ])

      expect(inputs.get('p1')!.distanceKm).toBeNull()
    })
  })
})

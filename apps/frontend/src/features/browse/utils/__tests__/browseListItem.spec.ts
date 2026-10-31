import { describe, it, expect } from 'vitest'
import type { BrowseListItem } from '@zod/browse/browseList.dto'
import { browseItemTarget } from '../browseListItem'

describe('browseItemTarget', () => {
  it('returns the profile id, detail type and position', () => {
    const item = {
      kind: 'profile',
      distanceKm: 1,
      profile: { id: 'p1', location: { country: 'HU', lat: 47.6, lon: 19.1 } },
    } as unknown as BrowseListItem
    expect(browseItemTarget(item)).toEqual({
      type: 'profile',
      id: 'p1',
      point: { lat: 47.6, lon: 19.1 },
    })
  })

  it.each(['post', 'event', 'community'] as const)('reads the %s entity', (kind) => {
    const item = {
      kind,
      distanceKm: 2,
      [kind]: { id: `${kind}-1`, location: { country: 'HU', lat: 47.7, lon: 19.2 } },
    } as unknown as BrowseListItem
    expect(browseItemTarget(item)).toEqual({
      type: kind,
      id: `${kind}-1`,
      point: { lat: 47.7, lon: 19.2 },
    })
  })

  it('has no position when the content has no location', () => {
    const item = {
      kind: 'post',
      distanceKm: 2,
      post: { id: 'po1', location: null },
    } as unknown as BrowseListItem
    expect(browseItemTarget(item).point).toBeUndefined()
  })
})

import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileSummary: (profile: any) => ({
    id: profile.id,
    publicName: profile.publicName,
    profileImages: (profile.profileImages ?? []).map((g: any) => g.image),
    location: profile.location ?? { country: '' },
  }),
}))

import { mapDbEventToPublic, mapDbEventToOwner } from '../../api/mappers/event.mappers'

const baseDbEvent: any = {
  id: 'cuevent00000000000001',
  kind: 'event',
  content: 'Test event content',
  isDeleted: false,
  isVisible: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  postedById: 'clprofile000000000001',
  country: 'AT',
  cityName: 'Vienna',
  lat: 48.2,
  lon: 16.3,
  postedBy: {
    id: 'clprofile000000000001',
    publicName: 'Test User',
    profileImages: [],
  },
  event: {
    userContentId: 'cuevent00000000000001',
    startsAt: new Date('2027-06-01T18:00:00Z'),
    venue: null,
  },
}

describe('mapDbEventToPublic', () => {
  it('maps an event with location and startsAt', () => {
    const result = mapDbEventToPublic(baseDbEvent, 'viewer-profile-id')
    expect(result.id).toBe(baseDbEvent.id)
    expect(result.kind).toBe('event')
    expect(result.content).toBe(baseDbEvent.content)
    expect(result.startsAt.toISOString()).toBe('2027-06-01T18:00:00.000Z')
    expect(result.isOwn).toBe(false)
    expect(result.location).toEqual({ country: 'AT', cityName: 'Vienna', lat: 48.2, lon: 16.3 })
  })

  it('isOwn=true when viewer is poster', () => {
    const result = mapDbEventToPublic(baseDbEvent, 'clprofile000000000001')
    expect(result.isOwn).toBe(true)
  })
})

describe('mapDbEventToOwner', () => {
  it('parses through OwnerEventSchema', () => {
    const result = mapDbEventToOwner(baseDbEvent)
    expect(result.kind).toBe('event')
    expect(result.isOwn).toBe(true)
    expect(result.startsAt.toISOString()).toBe('2027-06-01T18:00:00.000Z')
    expect(result.isVisible).toBe(true)
  })
})

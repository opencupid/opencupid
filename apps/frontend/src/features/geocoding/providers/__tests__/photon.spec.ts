import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', () => ({ axios: { get: mockGet } }))

import { searchPhoton, reversePhoton } from '../photon'

describe('photon provider', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })
  })

  it('search request times out instead of hanging', async () => {
    await searchPhoton('Szeged', 'hu')

    expect(mockGet).toHaveBeenCalledWith(
      'https://photon.komoot.io/api/',
      expect.objectContaining({ timeout: 10_000 })
    )
  })

  it('reverse request times out instead of hanging', async () => {
    await reversePhoton({ lat: 47.5, lon: 19.04 }, 'hu')

    expect(mockGet).toHaveBeenCalledWith(
      'https://photon.komoot.io/reverse',
      expect.objectContaining({ timeout: 10_000 })
    )
  })
})

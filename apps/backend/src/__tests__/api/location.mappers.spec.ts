import { describe, it, expect } from 'vitest'
import { DbLocationToLocationDTO, type DbLocation } from '../../api/mappers/location.mappers'

describe('DbLocationToLocationDTO', () => {
  it('maps all fields when present', () => {
    const db: DbLocation = { country: 'DE', cityName: 'Berlin', lat: 52.52, lon: 13.405 }
    const result = DbLocationToLocationDTO(db)
    expect(result).toEqual({ country: 'DE', cityName: 'Berlin', lat: 52.52, lon: 13.405 })
  })

  it('defaults nulls to empty strings and null coords', () => {
    const db: DbLocation = { country: null, cityName: null }
    const result = DbLocationToLocationDTO(db)
    expect(result).toEqual({ country: '', cityName: '', lat: null, lon: null })
  })

  it('handles partial nulls', () => {
    const db: DbLocation = { country: 'US', cityName: null, lat: 40.7, lon: null }
    const result = DbLocationToLocationDTO(db)
    expect(result).toEqual({ country: 'US', cityName: '', lat: 40.7, lon: null })
  })
})

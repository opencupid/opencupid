import { describe, it, expect } from 'vitest'
import { profileImageInclude, profileImagesRelation } from '../profileIncludes'

describe('profileImagesRelation', () => {
  it('leaves restricted images out by default', () => {
    expect(profileImagesRelation()).toEqual({
      where: { isRestricted: false },
      include: { image: true },
      orderBy: { position: 'asc' },
    })
  })

  it('loads the whole gallery only when the caller opts in', () => {
    expect(profileImagesRelation({ includeRestricted: true })).toEqual({
      include: { image: true },
      orderBy: { position: 'asc' },
    })
  })

  it('limits to the primary image with take, still filtered', () => {
    expect(profileImagesRelation({ take: 1 })).toEqual({
      where: { isRestricted: false },
      include: { image: true },
      orderBy: { position: 'asc' },
      take: 1,
    })
  })

  it('profileImageInclude wraps the relation', () => {
    expect(profileImageInclude()).toEqual({ profileImages: profileImagesRelation() })
    expect(profileImageInclude({ includeRestricted: true })).toEqual({
      profileImages: profileImagesRelation({ includeRestricted: true }),
    })
  })
})

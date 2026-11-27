import { describe, it, expect } from 'vitest'
import { primaryProfileImage } from '../primaryProfileImage'

describe('primaryProfileImage', () => {
  it('is the first image of a gallery served to other viewers', () => {
    const gallery: { id: string; isRestricted?: boolean }[] = [{ id: 'a' }, { id: 'b' }]
    expect(primaryProfileImage(gallery)).toEqual({ id: 'a' })
  })

  it("skips restricted images in the owner's own gallery", () => {
    const gallery = [
      { id: 'r', isRestricted: true },
      { id: 'a', isRestricted: false },
    ]
    expect(primaryProfileImage(gallery)?.id).toBe('a')
  })

  it('is undefined when there is no unrestricted image', () => {
    expect(primaryProfileImage([{ id: 'r', isRestricted: true }])).toBeUndefined()
    expect(primaryProfileImage([])).toBeUndefined()
    expect(primaryProfileImage(undefined)).toBeUndefined()
  })
})

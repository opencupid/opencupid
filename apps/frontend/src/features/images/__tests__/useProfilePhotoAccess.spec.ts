import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useProfilePhotoAccess } from '../composables/useProfilePhotoAccess'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

describe('useProfilePhotoAccess', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('allows viewing other profiles when the viewer has a face photo', () => {
    useOwnerProfileStore().profile = { id: 'me', hasFace: true } as any
    expect(useProfilePhotoAccess().canSeePhotosOf({ id: 'other' })).toBe(true)
  })

  it('denies viewing other profiles when the viewer has no face photo', () => {
    useOwnerProfileStore().profile = { id: 'me', hasFace: false } as any
    expect(useProfilePhotoAccess().canSeePhotosOf({ id: 'other' })).toBe(false)
  })

  it("always allows the viewer's own photos", () => {
    useOwnerProfileStore().profile = { id: 'me', hasFace: false } as any
    expect(useProfilePhotoAccess().canSeePhotosOf({ id: 'me' })).toBe(true)
  })

  it('denies when the owner profile is not loaded', () => {
    expect(useProfilePhotoAccess().canSeePhotosOf({ id: 'other' })).toBe(false)
  })
})

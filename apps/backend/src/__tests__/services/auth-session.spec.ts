import { beforeEach, describe, expect, it, vi } from 'vitest'

const profileService = vi.hoisted(() => ({
  initializeProfiles: vi.fn(),
  getProfileByUserId: vi.fn(),
}))
vi.mock('@/services/profile.service', () => ({
  ProfileService: { getInstance: () => profileService },
}))

import { createNewUserSession, getExistingUserSession } from '../../services/auth-session'

const user = { id: 'u1', tokenVersion: 1, language: 'en', roles: [] } as any
const profile = {
  id: 'cmc7t45x400086w39gj30pzn3',
  isDatingActive: false,
  isSocialActive: true,
  isActive: true,
}

describe('auth session', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reports a newly initialized profile as not onboarded', async () => {
    profileService.initializeProfiles.mockResolvedValue({ ...profile, isOnboarded: false })
    expect(await createNewUserSession(user)).toMatchObject({
      profileId: profile.id,
      isOnboarded: false,
    })
  })

  it.each([true, false])('reports isOnboarded=%s of an existing profile', async (isOnboarded) => {
    profileService.getProfileByUserId.mockResolvedValue({ ...profile, isOnboarded })
    expect(await getExistingUserSession(user)).toMatchObject({ isOnboarded })
  })

  it('returns null without a profile', async () => {
    profileService.getProfileByUserId.mockResolvedValue(null)
    expect(await getExistingUserSession(user)).toBeNull()
  })
})

import { expect, it, vi } from 'vitest'

const profile = vi.hoisted(() => ({ id: 'cmc7t45x400086w39gj30pzn3', isOnboarded: false }))
vi.mock('@/services/profile.service', () => ({
  ProfileService: {
    getInstance: () => ({
      initializeProfiles: async () => profile,
      getProfileByUserId: async () => profile,
    }),
  },
}))

import { createNewUserSession, getExistingUserSession } from '../../services/auth-session'

it.each([true, false])('reports isOnboarded=%s of the profile', async (isOnboarded) => {
  profile.isOnboarded = isOnboarded
  const user = { id: 'u1', tokenVersion: 1, language: 'en', roles: [] } as any
  expect(await createNewUserSession(user)).toMatchObject({ isOnboarded })
  expect(await getExistingUserSession(user)).toMatchObject({ isOnboarded })
})

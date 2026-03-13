import type { User } from '@zod/generated'
import { SessionProfileSchema, type SessionData, type SessionProfile } from '@zod/user/user.dto'
import { ProfileService } from '@/services/profile.service'

type SessionResult = { sessionData: SessionData; profileId: string }

function buildSessionData(user: User, profile: SessionProfile): SessionData {
  // TODO clean up duplicated and dead fields from this shape
  // e.g. profileId profile.id , 
  // remove isSocialActive, roles
  return {
    userId: user.id,
    profileId: profile.id,
    tokenVersion: user.tokenVersion,
    lang: user.language,
    roles: user.roles,
    hasActiveProfile: profile.isActive,
    profile: {
      id: profile.id,
      isDatingActive: profile.isDatingActive,
      isSocialActive: profile.isSocialActive,
      isActive: profile.isActive,
    },
  }
}

/**
 * Build session data for a new user during first login.
 * Ensures a profile row exists (creates one if missing).
 */
export async function createNewUserSession(user: User): Promise<SessionResult> {
  const profileService = ProfileService.getInstance()
  const profile = await profileService.initializeProfiles(user.id)
  const sessionProfile = SessionProfileSchema.parse(profile)
  return { sessionData: buildSessionData(user, sessionProfile), profileId: profile.id }
}

/**
 * Build session data for an existing user (login or token refresh).
 * Returns null if the user has no profile.
 */
export async function getExistingUserSession(user: User): Promise<SessionResult | null> {
  const profileService = ProfileService.getInstance()
  const profile = await profileService.getProfileByUserId(user.id)
  if (!profile) return null
  const sessionProfile = SessionProfileSchema.parse(profile)
  return { sessionData: buildSessionData(user, sessionProfile), profileId: profile.id }
}

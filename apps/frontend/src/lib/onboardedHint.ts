// Device-local record of the last profile seen with onboarding finished. The
// router reads it synchronously on a cold start to route a returning user
// without waiting for the profile fetch.
//
// It can only be trusted in one direction: isOnboarded goes false → true once
// and never back, so a recorded profile is onboarded for good. A missing or
// different entry says nothing, and the router waits for the profile instead.
const KEY = 'onboardedProfileId'

export function isKnownOnboarded(profileId: string | null): boolean {
  return profileId !== null && localStorage.getItem(KEY) === profileId
}

export function recordOnboarded(profile: { id: string; isOnboarded: boolean }) {
  if (profile.isOnboarded) localStorage.setItem(KEY, profile.id)
  else if (localStorage.getItem(KEY) === profile.id) localStorage.removeItem(KEY)
}

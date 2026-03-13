export const baseFields = {
  id: true,
} as const

export const socialFields = {
  languages: true,
  publicName: true,
} as const

export const datingFields = {
  hasKids: true,
  relationship: true,
  gender: true,
  birthday: true,
  pronouns: true,
} as const

export const profileOptInFields = {
  isCallable: true,
} as const

export const userOptInFields = {
  newsletterOptIn: true,
  isPushNotificationEnabled: true,
} as const

export const datingPreferencesFields = {
  prefAgeMin: true,
  prefAgeMax: true,
  prefGender: true,
  prefKids: true,
} as const

export const ownerFields = {
  isDatingActive: true,
  isSocialActive: true,
  isActive: true,
  isOnboarded: true,
  ...profileOptInFields,
} as const

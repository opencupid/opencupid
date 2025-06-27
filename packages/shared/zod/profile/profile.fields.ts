

export const baseFields = {
  id: true,
} as const;

export const socialFields = {
  languages: true,
  publicName: true,
} as const;

export const datingFields = {
  hasKids: true,
  relationship: true,
  gender: true,
  birthday: true,
  pronouns: true,
} as const;



export const ownerFields = {
  scopes: true,
  isOnboarded: true,
} as const;

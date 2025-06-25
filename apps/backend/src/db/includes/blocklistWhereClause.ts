export const blocklistWhereClause = (profileId: string) => ({
  blockedProfiles: { none: { id: profileId } },    // I did not block them
  blockedByProfiles: { none: { id: profileId } },  // They did not block me
})
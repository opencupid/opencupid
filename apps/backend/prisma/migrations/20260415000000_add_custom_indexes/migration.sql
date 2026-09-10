-- Partial indexes that cannot be expressed in Prisma schema syntax (they carry
-- a WHERE clause). Prisma ignores partial indexes rather than proposing to drop
-- them, so they never surface as drift:
--   * partial unique index on active Conversation pairs
--   * partial index on active (uncleared) ProfileTrustFlag rows

-- Partial unique index for active conversations.
-- Excluding DISCARDED lets multiple terminal rows coexist per pair (so a soft-deleted
-- conversation doesn't block a fresh one), while still preventing duplicate active
-- conversations. Application-side lookups must filter by status != 'DISCARDED' to see
-- only live rows — enforced in MessageService.resolveConversation.
CREATE UNIQUE INDEX "Conversation_active_pair_key"
    ON "Conversation" ("profileAId", "profileBId")
    WHERE "status" != 'DISCARDED';

-- Partial index on active (uncleared) trust flags.
CREATE INDEX "ProfileTrustFlag_active_idx"
    ON "ProfileTrustFlag" ("profileId")
    WHERE "clearedAt" IS NULL;

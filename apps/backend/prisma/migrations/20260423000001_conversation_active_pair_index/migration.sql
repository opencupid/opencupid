-- Swap pair-uniqueness for a partial unique index excluding DISCARDED.
-- Excluding DISCARDED lets multiple terminal rows coexist per pair (so a soft-deleted
-- conversation doesn't block a fresh one), while still preventing duplicate active
-- conversations. Application-side lookups must filter by status != 'DISCARDED' to see
-- only live rows — enforced in MessageService.resolveConversation.
DROP INDEX "Conversation_profileAId_profileBId_key";
CREATE UNIQUE INDEX "Conversation_active_pair_key"
    ON "Conversation" ("profileAId", "profileBId")
    WHERE "status" != 'DISCARDED';

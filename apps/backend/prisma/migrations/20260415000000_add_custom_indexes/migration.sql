-- Custom indexes that cannot be expressed in Prisma schema syntax:
--   * pg_trgm GIN index on LocalizedProfileField.value (substring search)
--   * partial unique index on active Conversation pairs
--   * partial index on active (uncleared) ProfileTrustFlag rows
--
-- pg_trgm is shipped with Postgres and provides fast, language-agnostic
-- substring search. Query side uses ILIKE '%term%' or the `%` operator;
-- ordering uses similarity() for relevance ranking.
--
-- NOTE: `CREATE EXTENSION` requires database-level privileges. On managed
-- Postgres (RDS, Cloud SQL, etc.) where the migration user may not be
-- allowed to install extensions, pre-install `pg_trgm` as a one-time
-- provisioning step and this migration will then no-op on the EXTENSION
-- line. `IF NOT EXISTS` is deliberate — the intent is that the extension
-- be present by the time the migration runs, whether we installed it or
-- the operator did.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "LocalizedProfileField_value_trgm_idx"
  ON "LocalizedProfileField"
  USING GIN ("value" gin_trgm_ops);

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

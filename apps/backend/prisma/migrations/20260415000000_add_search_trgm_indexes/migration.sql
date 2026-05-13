-- Trigram indexes for the /search endpoint.
--
-- Uses pg_trgm (shipped with Postgres) to provide fast, language-agnostic
-- substring search on profile intro text. No per-locale dictionary
-- configuration is required — the index works identically for any language.
--
-- Query side uses ILIKE '%term%' or the `%` operator; ordering uses
-- similarity() for relevance ranking.
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

-- Trigram indexes for the /search endpoint.
--
-- Uses pg_trgm (shipped with Postgres) to provide fast, language-agnostic
-- substring search on profile intro text and post content. No per-locale
-- dictionary configuration is required — the indexes work identically for
-- any language.
--
-- Query side uses ILIKE '%term%' or the `%` operator; ordering uses
-- similarity() for relevance ranking.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "LocalizedProfileField_value_trgm_idx"
  ON "LocalizedProfileField"
  USING GIN ("value" gin_trgm_ops);

CREATE INDEX "Post_content_trgm_idx"
  ON "Post"
  USING GIN ("content" gin_trgm_ops);

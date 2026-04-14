-- Full-text search infrastructure for /search endpoint.
--
-- LocalizedProfileField.tsv: generated from `value` using the row's own
-- `locale` to pick a Postgres text-search configuration. Both 'english'
-- and 'hungarian' ship with Postgres; anything else falls back to english.
--
-- Post.tsv: generated from `content` using the language-agnostic 'simple'
-- configuration. Posts are short, author-written, and may mix languages —
-- 'simple' avoids misstemming across languages.

ALTER TABLE "LocalizedProfileField"
  ADD COLUMN "tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      CASE "locale"
        WHEN 'hu' THEN 'hungarian'::regconfig
        ELSE 'english'::regconfig
      END,
      coalesce("value", '')
    )
  ) STORED;

CREATE INDEX "LocalizedProfileField_tsv_idx"
  ON "LocalizedProfileField"
  USING GIN ("tsv");

ALTER TABLE "Post"
  ADD COLUMN "tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce("content", ''))
  ) STORED;

CREATE INDEX "Post_tsv_idx"
  ON "Post"
  USING GIN ("tsv");

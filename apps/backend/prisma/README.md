# Database notes

Notes about non-obvious database behavior that isn't captured by the
Prisma schema alone.

## Full-text search (/search endpoint)

The `/search` endpoint relies on Postgres full-text search via generated
`tsvector` columns on two tables:

- **`LocalizedProfileField.tsv`** — dictionary chosen **per row** from
  `locale`, via a `CASE` expression in the generated-column definition.
- **`Post.tsv`** — always uses the `'simple'` dictionary (language-agnostic).

Both columns are indexed with GIN (`LocalizedProfileField_tsv_idx`,
`Post_tsv_idx`). See
[migrations/20260415000000_add_search_tsv/migration.sql](migrations/20260415000000_add_search_tsv/migration.sql).

### Adding a new app language

When you add a new locale to [`packages/shared/i18n/locales.ts`](../../../packages/shared/i18n/locales.ts),
you **must** also extend the full-text search setup in two places, otherwise
profile text in the new language will be mis-stemmed:

1. **The `LocalizedProfileField.tsv` CASE expression.**
   The generated column currently branches on `locale` and falls back to
   `'english'::regconfig` for anything unrecognized. Add a new `WHEN`
   branch that maps the new locale to its matching Postgres text-search
   configuration (e.g. `'german'`, `'french'`). Because the column is
   `GENERATED ALWAYS AS ... STORED`, changing the expression requires
   dropping and re-adding the column in a new migration — existing rows
   are then re-vectorized automatically on the next write, but a backfill
   `UPDATE` is recommended so historical rows are reindexed immediately.

2. **The query-time dictionary map in
   [`src/lib/fts.ts`](../src/lib/fts.ts)** (`PROFILE_FTS_DICTIONARY_BY_LOCALE`).
   Add the same locale → configuration mapping. The stored column and the
   query-time dictionary must agree, otherwise queries will stem terms
   differently from how the rows were indexed and miss matches.

Postgres ships built-in configurations for: `simple`, `english`, `german`,
`french`, `spanish`, `italian`, `portuguese`, `dutch`, `danish`, `swedish`,
`norwegian`, `finnish`, `russian`, `turkish`, `hungarian`, and more. Run
`SELECT cfgname FROM pg_ts_config` to list what's available on your
Postgres instance. Unsupported languages can be mapped to `'simple'` as a
safe (no-stemming) fallback.

`Post.content` uses `'simple'` regardless of language and doesn't need
updating when new locales are added.

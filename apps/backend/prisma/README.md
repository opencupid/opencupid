# Database notes

Notes about non-obvious database behavior that isn't captured by the
Prisma schema alone.

## Search indexes (/search endpoint)

The `/search` endpoint relies on PostgreSQL's **`pg_trgm`** extension for
fast, language-agnostic substring search on profile intro text and post
content:

- **`LocalizedProfileField_value_trgm_idx`** — GIN index on
  `LocalizedProfileField.value` using `gin_trgm_ops`.
- **`Post_content_trgm_idx`** — GIN index on `Post.content` using
  `gin_trgm_ops`.

Both indexes are created by
[migrations/20260415000000_add_search_trgm_indexes/migration.sql](migrations/20260415000000_add_search_trgm_indexes/migration.sql).

### How it works

Queries use `ILIKE '%term%'` (which the trigram index accelerates) and rank
results by `similarity(col, term)`. No full-text dictionaries, tsvectors,
or per-locale configuration are involved — the indexes work identically for
any language. Adding a new app locale requires **zero** database changes.

See [`src/services/search.service.ts`](../src/services/search.service.ts)
for the query shape.

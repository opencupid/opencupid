---
'@opencupid/backend': minor
---

Hide profiles with no face photo and no intro from the browse map and grid once they have not been seen for 30 days. A nightly job keeps the new `isHiddenFromResults` flag up to date. Includes a schema migration.

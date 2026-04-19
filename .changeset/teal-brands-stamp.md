---
'@opencupid/backend': minor
---

Add explicit `Brand` metadata on every email payload. Producers stamp brand identity (`siteName`, `frontendUrl`, `domain`) onto each job at enqueue time via a single `currentBrand()` helper, so workers never read process env for branding and can stay brand-blind. Under per-brand-stack deployment each API container's env already matches the user's brand.

`DOMAIN` is now required (no empty default) in both the shared `AppConfig` schema and the backend's own config schema, so downstream consumers are statically guaranteed a non-empty domain string.

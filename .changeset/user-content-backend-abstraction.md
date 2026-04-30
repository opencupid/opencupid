---
'@opencupid/backend': minor
'@opencupid/shared': minor
---

Extract UserContent abstraction layer (Zod base schemas, mapper projections, service interface, and Fastify route factory) so future content types (e.g. Event) can compose with Post on shared infrastructure. No wire-format or behavior changes.

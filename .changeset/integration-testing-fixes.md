---
'@opencupid/frontend': patch
---

Unblock frontend Docker build: give `DOMAIN` in the shared appConfig schema a `'localhost'` default so build-time parsing (where runtime env isn't exposed) no longer fails. Runtime `DOMAIN` is still injected by `envsubst` at container start from `.env`, and the backend continues to enforce a non-empty `DOMAIN` via its own schema. Updates the corresponding unit test and removes the now-redundant `DOMAIN: "ci.local"` workaround from the CI workflow.

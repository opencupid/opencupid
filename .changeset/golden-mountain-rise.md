---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/admin': minor
---

Bump Node runtime baseline from 22 to 24. Updates Dockerfile base images,
GitHub Actions matrices, devcontainer image, `@tsconfig/node22` →
`@tsconfig/node24`, and `@types/node` to 24.x across the workspace. Held
back from the latest 25.x line because Node 24 is the current LTS.

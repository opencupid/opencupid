---
'@opencupid/backend': patch
---

Resolve unmet peer-dep warnings: bump zod to 3.25.76 (satisfies the MCP SDK's `^3.25 || ^4.0` peer range) and add a pnpm peerDependencyRule allowing sharp 0.34 for `smartcrop-sharp` (which still pins `^0.32.5` but uses only stable APIs). (#1402)

---
'@opencupid/frontend': patch
---

Point LanguageSelector at the vendored Multiselect component and drop the `github:peterzen/vue-multiselect` dependency, completing the multiselect vendoring migration. The GitHub tarball was unreachable from restricted-egress environments, which aborted `pnpm install` before the linking step and left the workspace without any resolvable dependencies.

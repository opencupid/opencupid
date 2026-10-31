---
'@opencupid/frontend': patch
---

Fix onboarding and profile form crashing on iOS Safari < 16.4 by replacing the `regex` package with native Unicode regex literals in public name validation

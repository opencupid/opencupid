---
'@opencupid/backend': patch
---

Admin clear of a SPAM_BURST flag is no longer reversed by the next heuristic reconcile; only sends after the clear count toward a new burst (#1546)

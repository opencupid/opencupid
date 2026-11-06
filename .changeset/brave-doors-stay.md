---
'@opencupid/frontend': patch
---

Fix the exit survey sometimes being skipped after account deletion: a request failing late no longer redirects an already logged-out user to the login page

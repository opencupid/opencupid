---
'@opencupid/backend': patch
'@opencupid/frontend': patch
---

Messaging hardening: only active profiles can open a draft conversation, the self-conversation rule is enforced where conversations are created, stale conversation loads no longer replace the open one, load failures are told apart from missing conversations, and the awaiting-reply hint stays visible over a saved draft

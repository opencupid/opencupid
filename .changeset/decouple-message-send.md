---
'@opencupid/backend': patch
'@opencupid/shared': patch
---

Decouple conversation start from message send at the service and route layer. Fixes a latent bug where `markMatchAsSeen` fired on every non-duplicate reply instead of only on true new-conversation sends. Wire response gains an additive `outcome` field (`new_conversation | accepted_on_reply | reply`).

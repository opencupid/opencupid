---
'@opencupid/frontend': patch
'@opencupid/backend': patch
---

New users no longer see the browse view flash up before onboarding: the session token marks users who haven't finished onboarding, and the router sends them there before anything renders

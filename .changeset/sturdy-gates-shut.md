---
'@opencupid/backend': patch
---

Stop issuing magic-link login tokens for users with `User.isBlocked = true`. Previously `isBlocked` had no effect on the auth path — blocked users could still request and redeem login links.

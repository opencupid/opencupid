---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': patch
---

Add one-click email unsubscribe per RFC 8058. Notification emails now carry a `List-Unsubscribe` / `List-Unsubscribe-Post` header and a footer link to `/unsubscribe/:token?lang=<locale>`. The token is a stateless HMAC of `(userId, emailHash)` with a 2-day TTL, signed with a dedicated `UNSUBSCRIBE_SECRET` so it cannot be reused for authentication. New `User.emailNotificationsOptIn` flag gates all suppressible email types and is exposed as a Settings checkbox; magic-link login emails are always sent and do not include unsubscribe metadata. Closes #1376.

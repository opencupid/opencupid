---
'@opencupid/backend': patch
---

Send bulk email (onboarding reminders) through a rate-limited `emails-bulk` queue, one email per 15 s, instead of sleeping between sends; login links and other transactional email stay unthrottled

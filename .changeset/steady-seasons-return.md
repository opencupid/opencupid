---
'@opencupid/backend': patch
---

Activity segments: an account older than 28 days that becomes active again is now `returning` instead of `new`, and returning users are no longer demoted into `new`. Account age comes from the profile's creation date; the unused `firstSeenAt` column is dropped.

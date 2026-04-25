---
'@opencupid/backend': minor
'@opencupid/shared': minor
---

Add profile-trust quarantine: every newly created profile is flagged `PROFILE_UNVETTED` for 24 hours, during which their outbound new conversations are held in a `PENDING` state invisible to the recipient. A 15-minute cron auto-clears the flag and promotes held messages silently. The existing SPAM_BURST heuristic now counts PENDING conversations too; on fire it marks the sender's active (INITIATED+PENDING) conversations `DISCARDED` (terminal). No frontend or API-response changes — the sender cannot distinguish PENDING from INITIATED from their response.

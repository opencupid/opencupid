---
'@opencupid/backend': patch
'@opencupid/shared': patch
---

Fix `canMessage=true` on the public profile when the viewer has an outgoing PENDING (held due to viewer-side quarantine) to that target. The interaction-context include walked the target's `ConversationParticipant` rows filtered to "viewer is also a participant" — a hack that worked only when both sides have participant rows. PENDING conversations have only the sender as a participant by design, so the include returned empty for both sides, and `canMessage` defaulted to `true`.

Replace the participant walk with two pair-identity walks via `Profile.conversationAsA`/`conversationAsB`. Visibility is enforced at the SQL level: PENDING is only visible to the initiator (sender), so the recipient stays blind to held PENDINGs they didn't originate (anti-spam guarantee). Schema simplifies — `DbProfileWithContext` swaps `conversationParticipants` (with nested ConversationParticipant.extend) for two plain `Conversation[]` arrays. Mapper widens `initiated` to also recognize `PENDING`, treating it the same as `INITIATED` from the sender's UX perspective.

---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Match click in the inbox opens the conversation-detail view instead of the send-message modal. New `GET /conversations/by-profile/:profileId` resolves an existing conversation or returns a draft summary for matched pairs that haven't messaged yet; new `/inbox/new/:profileId` route renders the conversation detail with the draft state and persists it on first send.

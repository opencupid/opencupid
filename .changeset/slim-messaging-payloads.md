---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

Slim messaging payloads: narrow `MessageDTO.sender`, `ConversationSummary.partnerProfile`, and `ConversationDraftSummary.partnerProfile` to a new `MessageProfileRef` shape (`id`, `publicName`, single-image `profileImages`). Drops `location` and every-image-variant duplication from message/conversation responses and `ws:new_message` payloads — the inbox list, message bubbles, and new-message toast only ever rendered the first image's thumbnail. Backend Prisma includes are scoped to a single `profileImages` row per profile on the messaging paths. (#1369)

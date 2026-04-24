---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

Narrow messaging response shapes and DTOs to what consumers actually render (#1369).

- Introduce `MessagingProfileRef` (id + publicName + thumbnail) as the messaging-owned profile reference, replacing `ProfileSummary` inside `MessageDTO.sender` and `ConversationSummary.partnerProfile`.
- Make `SendMessageResponse` a discriminated union on `outcome`: the dominant `reply` arm now ships a small `ConversationPatch` instead of a full `ConversationSummary`, eliminating a redundant post-write lookup.
- `MarkConversationReadResponse` now returns only `{ conversationId, lastReadAt }`.
- Make `MessageDTO.isMine` required and map WS broadcasts per-recipient (fixes `isMine: undefined` on incoming WS messages).
- Shrink Prisma includes for `MessageWithSender` and conversation summaries to only the fields the mappers read.

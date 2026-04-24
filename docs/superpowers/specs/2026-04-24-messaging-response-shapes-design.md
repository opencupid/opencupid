# Messaging response shapes — type-driven cleanup

**Date:** 2026-04-24
**Branch:** `feat/messaging-response-shapes`
**Tracking issue:** [#1369](https://github.com/opencupid/opencupid/issues/1369)

## Problem

The `POST /api/messages/message` (and `/voice`) response is large and largely redundant. A typical reply produces ~3.4 KB JSON for a 5-character message body, dominated by image-variant URL lists. The same `MessageDTO` is also shipped over the WebSocket `ws:new_message` channel, multiplying the bloat by every connected recipient. Most of the payload is never read by the frontend.

The naive fix would be to make fields optional and add null-checks at consumers. That repeats the underlying mistake. This design treats the bloat as a **type-design symptom** and fixes the types — the wire size, the Prisma includes, and the consumer code shrink as consequences.

## Root causes (type-design failures)

1. **`MessageDTO` carries `sender: ProfileSummary` for two unrelated jobs.** Bubble identity (covered by the existing `senderId` / `isMine` fields) and notification rendering (toast + webpush, where we need name + a thumb). Collapsing both jobs into "embed full ProfileSummary" forces every consumer to receive a shape vastly wider than it needs.

2. **`ConversationSummary` is one type doing two jobs.** A *list item* (inbox entry, store array element) and an *update patch* (returned by `POST /message`, `POST .../mark-read`). The post-write case ships a full record when a delta would suffice — and on the dominant `reply` outcome, the store already holds the conversation; the response is largely redundant with state.

3. **`ProfileSummary` is the wrong abstraction for messaging.** It was designed for browse / public-profile contexts where `location` and a full image set are needed. It has since been reused (and widened) by other features (e.g., the map). Reusing it inside messaging propagates a 5-variant × N-image payload into every message-related response, even though messaging only ever renders name + one thumbnail.

Supporting symptoms (not the root, but cleaned up by the same change):

4. **Service layer leaks Prisma payload types.** `getConversationSummary` returns `ConversationParticipantWithConversationSummary` (the Prisma `GetPayload` type) verbatim. The include must be wide enough to feed the widest mapper, so it pulls all images of both participants.
5. **`MessageInConversation` and `MessageDTO` are de-facto duplicates** (differ by an optional `isMine`). `DbMessageInConversation` and `DbMessageAttachmentDTO` are orphans (no production importers).
6. **WS `ws:new_message` reuses the HTTP `MessageDTO`**, so the same bloat ships per connected recipient.

## Non-goals

- Auditing or narrowing `ProfileSummary` itself. It has cross-feature consumers (map, browse) that would need separate review. This PR stops messaging from depending on it; the broader audit is a separate scope.
- Replacing `messageStore.handleIncomingMessage`'s `fetchConversations()` fallback (when an unknown conversation arrives over WS) with a single-conversation `GET /messages/conversations/:id`. Same pattern (re-list when patch suffices), separate scope.
- Adopting blurhash placeholders on messaging surfaces. The narrow design here deliberately omits blurhash from the messaging-side image shape, matching what the messaging components actually render today (no placeholder support). If we later want blurhash placeholders in toast / inbox, that's a focused UI change with its own type extension.
- Changing how attachments (voice messages) are shaped on the wire. `MessageAttachmentDTO` is already minimal and used as-is.

## Design

### New shape: `MessagingProfileRef`

A messaging-owned profile-identity type, derived from existing schemas. Used wherever messaging needs to identify a profile for rendering: `MessageDTO.sender` and `ConversationSummary.partnerProfile`.

```ts
// packages/shared/zod/messaging/messaging.dto.ts

export const MessagingProfileRefSchema = z.object({
  id: z.string(),
  publicName: z.string(),
  thumbnail: z.object({
    url: z.string(),
  }).nullable(),
})
export type MessagingProfileRef = z.infer<typeof MessagingProfileRefSchema>
```

Notes:

- `thumbnail: { url } | null`. `null` is a real domain state ("profile has no image yet"), not missing data. No optional / `undefined`. No null-checks at render sites that use `v-if="sender.thumbnail"`.
- No `blurhash`, no `mimeType`, no `altText`, no `position`, no `location`. None are read by any messaging consumer today (`ImageTag` reads only the variant URL; `BlurhashCanvas` is used only by the browse `ProfileCardComponent`).
- Owned by `messaging.dto.ts`. The type name signals "do not reuse outside messaging" — the explicit antidote to the `ProfileSummary` reuse pattern.

### Collapsed: `MessageDTO`

`MessageInConversation`, `DbMessageInConversation`, `DbMessageAttachmentDTO` are removed. `MessageDTO` is the one shape:

```ts
export const MessageDTOSchema = MessageSchema.pick({
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  messageType: true,
  createdAt: true,
}).extend({
  sender: MessagingProfileRefSchema,
  attachment: MessageAttachmentDTOSchema.nullable(),
  isMine: z.boolean(), // required, not optional
})
export type MessageDTO = z.infer<typeof MessageDTOSchema>
```

`isMine` becomes **required**. Every `MessageDTO` is built for a specific viewer; making the field optional produced a real bug-shaped quirk where the WS broadcast mapped a `MessageDTO` without a `currentProfileId` and the recipient received `isMine: undefined`. The new contract is "you cannot construct a `MessageDTO` without saying who is viewing it" — so the WS broadcast maps per recipient (with the recipient's profileId, yielding `isMine: false`).

### Narrowed: `ConversationSummary`

Same field set as today, but `partnerProfile: MessagingProfileRef` instead of `ProfileSummary`. `lastMessage` shape unchanged (already minimal: `content / messageType / createdAt / isMine`). All other fields stay.

```ts
const ConversationSummarySchema = ConversationParticipantSchema.pick({
  id: true,
  profileId: true,
  conversationId: true,
  lastReadAt: true,
  isMuted: true,
  isArchived: true,
}).extend({
  conversation: ConversationSchema.pick({ id: true, updatedAt: true, createdAt: true }),
  canReply: z.boolean(),
  isCallable: z.boolean(),
  myIsCallable: z.boolean(),
  partnerProfile: MessagingProfileRefSchema,
  lastMessage: MessageInConversationSummarySchema.nullable(),
})
```

### New: `ConversationPatch`

```ts
export const ConversationPatchSchema = z.object({
  conversationId: z.string(),
  updatedAt: z.date(),
})
export type ConversationPatch = z.infer<typeof ConversationPatchSchema>
```

A small delta carrying enough information to re-bump an existing conversation entry in store state. `updatedAt` reflects the post-write value of the `Conversation.updatedAt` column (set by Prisma in the same transaction as the message insert) — not a value derived client-side from `message.createdAt`. The store has one canonical source for "when was this conversation last touched" (`conversation.updatedAt`), which is the same field used for inbox ordering across all code paths.

### Discriminated response: `SendMessageResponse`

The send is a state-machine operation; its `outcome` already classifies the result. The response shape now follows that classification.

```ts
// packages/shared/zod/apiResponse.dto.ts

export type SendMessageResponse =
  | (ApiSuccess & {
      outcome: 'reply'
      message: MessageDTO
      conversationPatch: ConversationPatch
    })
  | (ApiSuccess & {
      outcome: 'new_conversation' | 'accepted_on_reply'
      message: MessageDTO
      conversation: ConversationSummary
    })
```

Key consequences:

- The reply arm (the dominant case) ships `message` + a small patch, no `ConversationSummary`.
- The non-reply arms ship the full `ConversationSummary` because the store may not yet hold the conversation.
- `outcome` becomes the wire-level **discriminant**, not just a label. The store's handler does `switch (res.outcome)` and the type checker enforces correct field access per arm. No null checks. No fallbacks.
- The duplicate `lastMessage` payload (today: same content/createdAt/messageType/isMine appears both in `message` and in `conversation.lastMessage`) goes away on the reply arm.

### Narrowed: `MarkConversationReadResponse`

`POST /messages/conversations/:id/mark-read` returns just the patch, not the full `ConversationSummary`:

```ts
export type MarkConversationReadResponse = ApiSuccess & {
  conversationId: string
  lastReadAt: Date
}
```

Same root cause as the send response (full record returned where a delta suffices), trivial additional surface, fixed in the same PR.

## Data flow under the new design

### Backend: send (`POST /messages/message`, `/voice`)

`sendAndBuildResponse` in [apps/backend/src/api/routes/messaging.route.ts](apps/backend/src/api/routes/messaging.route.ts) branches on `outcome`:

```ts
if (outcome === 'reply') {
  // convo.updatedAt is the post-insert value from the same transaction
  return {
    success: true,
    outcome,
    message: messageDTO,
    conversationPatch: { conversationId: convo.id, updatedAt: convo.updatedAt },
  }
}

const conversation = await messageService.getConversationSummary(convo.id, senderProfileId)
if (!conversation) throw new Error('Conversation summary not found')
return {
  success: true,
  outcome,
  message: messageDTO,
  conversation: mapConversationParticipantToSummary(conversation, senderProfileId),
}
```

This eliminates the `getConversationSummary` round-trip on the dominant path. The `convo` reference is the conversation row returned by `messageService.sendMessage` (or by `resolveConversation` in the same transaction); `sendAndBuildResponse`'s current return tuple needs to expose `convo.updatedAt` alongside `convoId` to support this — a small refactor inside the existing transaction block, not an additional query.

### Backend: WS broadcast

`fireNewMessageNotifications` currently builds one `messageDTO` (without `currentProfileId`) and broadcasts it to the recipient. Under the new contract, `MessageDTO` cannot be constructed without a viewer. The mapping is moved per-recipient:

```ts
const recipientMessageDTO = mapMessageToDTO(message, recipientProfileId) // isMine: false
broadcastToProfile(fastify, recipientProfileId, {
  type: 'ws:new_message',
  payload: recipientMessageDTO,
})
```

This is a one-line change with a real correctness benefit (recipient gets `isMine: false` instead of `undefined`).

### Backend: includes (Prisma)

`messageWithSenderInclude` shrinks to feed `MessagingProfileRef`:

```ts
export const messageWithSenderInclude = {
  sender: {
    select: {
      id: true,
      publicName: true,
      profileImages: {
        // Field projection finalized at implementation time against the actual
        // ProfileImage schema; it carries only what the thumb-URL builder reads.
        orderBy: { position: 'asc' },
        take: 1,
      },
    },
  },
  attachment: true,
} satisfies Prisma.MessageInclude
```

Removed scalars: `country`, `cityName`, `lat`, `lon`. The `profileImages` relation is reduced to a single row (the position-0 image) and projected to only the fields the thumb-URL builder reads — the exact `select` is a small mechanical task during implementation, not a design choice.

`conversationSummaryInclude` shrinks similarly for the participants' profile images.

### Backend: mappers

- `mapMessageToDTO(m, currentProfileId: string)` — `currentProfileId` becomes required, returns `MessageDTO` with `isMine: boolean` (not optional). Builds `MessagingProfileRef` for `sender`. Resolves the thumb variant URL server-side.
- `mapConversationParticipantToSummary` — builds `MessagingProfileRef` for `partnerProfile`.
- `mapMessagingProfileRef(profile)` — new helper that produces `MessagingProfileRef` from the narrowed Prisma sender include. Used by both mappers above.
- `mapProfileSummary` — unchanged. Other features still use it.

### Frontend store ([apps/frontend/src/features/messaging/stores/messageStore.ts](apps/frontend/src/features/messaging/stores/messageStore.ts))

The handler is rewritten as a `switch` on `outcome`. No null checks. The discriminated union does the work.

```ts
handleSendResponse(res: SendMessageResponse): StoreResponse<MessageDTO> {
  if (res.outcome === 'reply') {
    this.applyReplyToConversation(res.message, res.conversationPatch)
  } else {
    this.upsertConversation(res.conversation)
    if (this.activeConversation?.conversationId === res.conversation.conversationId) {
      this.appendMessageIfNew(res.message)
    }
  }
  return storeSuccess(res.message)
}

applyReplyToConversation(message: MessageDTO, patch: ConversationPatch) {
  const idx = this.conversations.findIndex(c => c.conversationId === patch.conversationId)
  if (idx === -1) return // race: convo dropped while in-flight; ignore (no fallback fetch)
  const existing = this.conversations[idx]!
  const updated: ConversationSummary = {
    ...existing,
    conversation: { ...existing.conversation, updatedAt: patch.updatedAt },
    lastMessage: {
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
      isMine: message.isMine,
    },
  }
  this.bumpConversation(updated)
  this.updateUnreadFlag()
  if (this.activeConversation?.conversationId === patch.conversationId) {
    this.appendMessageIfNew(message)
  }
}
```

`markAsRead` consumes `MarkConversationReadResponse` and applies the patch directly to the existing entry (no full-record replacement).

`MessageInConversation` is removed from the store's return-type aliases — `fetchMessages*` return `MessageDTO[]`.

### Frontend: `MessageReceivedToast.vue`

Inline `<img>` reading `message.sender.thumbnail.url` directly. Drops the `<ProfileImage>` indirection at this site (the component is built around the multi-variant model and was overkill for a one-URL render).

```vue
<template>
  <div class="d-flex align-items-start clickable">
    <div class="profile-thumbnail me-2 flex-shrink-0">
      <img
        v-if="message.sender.thumbnail"
        :src="message.sender.thumbnail.url"
        :alt="message.sender.publicName"
        class="rounded"
      />
    </div>
    <!-- ... unchanged ... -->
  </div>
</template>
```

### Backend: webpush

`webpush.service.ts` reads only `message.sender.publicName` and `message.content` / `message.conversationId`. Works unchanged with the new narrower `MessagingProfileRef`. No changes required.

## Testing

Unit tests update to match the new types:

- `apps/backend/src/__tests__/api/messaging.mappers.spec.ts` — `mapMessageToDTO` now requires `currentProfileId`; assert `MessagingProfileRef` shape on `sender` and `partnerProfile`. Add a `mapMessagingProfileRef` direct test.
- `apps/backend/src/__tests__/routes/messaging.route.spec.ts` — assert response is the discriminated union; explicit fixtures for each `outcome` arm. Assert the reply path does NOT call `getConversationSummary` (mock and assert call count = 0).
- `apps/frontend/src/features/messaging/stores/__tests__/messageStore.spec.ts` — three new test cases for `handleSendResponse`, one per outcome arm. Cover the "stale convo dropped from list" race (reply patch arrives for a conversationId no longer in the list).
- `apps/frontend/src/features/app/components/__tests__/MessageReceivedToast.spec.ts` — update to render from the inline `<img>` path; assert `null` thumbnail renders no image.
- WS broadcast test (in `messaging.route.spec.ts`, alongside the existing `ws:new_message` assertions): assert the broadcast payload has `isMine: false` for the recipient (not `undefined`).

No integration-test changes anticipated beyond fixture updates.

## Migration / compatibility

This is a breaking wire-shape change between server and frontend. Both ship together — the monorepo deploys atomically; no cross-version contract to preserve. Follow CLAUDE.md's "Data integrity" rule: no backwards-compatibility shims, no fallback paths.

No database schema change. No migrations.

## Out of scope (recorded follow-ups)

- **Cross-feature `ProfileSummary` audit.** Same root pattern (over-reuse + widening) likely affects other features. Separate ticket.
- **`GET /messages/conversations/:id`.** Would let `handleIncomingMessage` replace its `fetchConversations()` fallback with a targeted fetch. Same root family (re-list when patch/single-fetch suffices). Separate ticket.
- **Blurhash placeholders on messaging surfaces.** If we want blur-up rendering in the toast / inbox, extend `MessagingProfileRef.thumbnail` to carry `blurhash` as part of that UI work, not preemptively.

## Files touched

**Shared types:**
- `packages/shared/zod/messaging/messaging.dto.ts`
- `packages/shared/zod/apiResponse.dto.ts`

**Backend:**
- `apps/backend/src/services/messaging.service.ts` (includes shrink)
- `apps/backend/src/api/mappers/messaging.mappers.ts` (new helper, signature change)
- `apps/backend/src/api/routes/messaging.route.ts` (outcome branching, per-recipient WS map)
- Test files under `apps/backend/src/__tests__/`

**Frontend:**
- `apps/frontend/src/features/messaging/stores/messageStore.ts`
- `apps/frontend/src/features/app/components/MessageReceivedToast.vue`
- Test files under the matching `__tests__/` dirs

No changes anticipated in `apps/admin` (does not consume messaging DTOs in production code per current trace).

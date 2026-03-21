# Design: Archived Conversation Tombstone (Issue #1192)

## Background

When a user deletes their account, their conversations are set to `ARCHIVED` status and the surviving participant's `ConversationParticipant` record is preserved (PR #1179). The backend already returns ARCHIVED conversations in the conversation list and already sets `canReply: false` for them. The frontend currently has no way to distinguish them from normal conversations — they render with a missing profile.

## Approach

Expose `status` in the `ConversationSummary` DTO so the frontend can drive all tombstone behaviour from a single, explicit flag (`conversation.status === 'ARCHIVED'`).

> **Note on naming:** `ConversationParticipant.isArchived` already exists on `ConversationSummary` as a per-participant mute/archive preference flag. This is **unrelated** to account deletion. The tombstone signal is exclusively `convo.conversation.status === 'ARCHIVED'` — never `convo.isArchived`.

## Backend Changes

### 1. `packages/shared/zod/messaging/messaging.dto.ts`

Add `ConversationStatusSchema` to the import from `'../generated'`, then add `status` to the `conversation` pick in `ConversationSummarySchema`:

```ts
import {
  ConversationParticipantSchema,
  ConversationSchema,
  ConversationStatusSchema,  // ← add
  MessageSchema,
  MessageAttachmentSchema,
} from '../generated'
```

```ts
conversation: ConversationSchema.pick({
  id: true,
  updatedAt: true,
  createdAt: true,
  status: true,   // ← add
}),
```

Just add `status: true` to the existing pick. No `.extend()` needed. The inferred type of `conversation.status` will be `ConversationStatusType` (`'INITIATED' | 'ACCEPTED' | 'BLOCKED' | 'ARCHIVED'`).

### 2. `apps/backend/src/api/mappers/messaging.mappers.ts`

Extend `mapConversationMeta` to pass `status` through. Use `ConversationStatusType` (already exported from `packages/shared/zod/generated`) for accurate typing — not `string`:

```ts
import type { ConversationStatusType } from '@zod/generated'

function mapConversationMeta(c: {
  id: string
  updatedAt: Date
  createdAt: Date
  status: ConversationStatusType
}) {
  return { id: c.id, updatedAt: c.updatedAt, createdAt: c.createdAt, status: c.status }
}
```

`p.conversation` in `mapConversationParticipantToSummary` already carries `status` as a Prisma scalar field — no changes to the Prisma query or `ConversationParticipantWithConversationSummary` type are required.

No other backend changes — `canReply` is already `false` for ARCHIVED and the mapper already returns a tombstone `partnerProfile` when the partner is gone.

## Frontend Changes

### 3. `apps/frontend/src/features/messaging/components/ConversationSummaries.vue`

Add a helper to detect archived conversations:

```ts
const isArchived = (convo: ConversationSummary) => convo.conversation.status === 'ARCHIVED'
```

Inside the `v-for`, use `v-if`/`v-else` to split the row:

- **Normal row** `v-if="!isArchived(convo)"` — keep existing markup entirely unchanged, including the `:class="{ disabled: !convo.canReply }"` binding and `@click` handler.
- **Archived tombstone row** `v-else`:
  - Same layout shell (`BListGroupItem`, same classes)
  - Add `disabled` class — same CSS as the existing `!convo.canReply` pattern (`opacity: 0.5; pointer-events: none`). No `@click` binding.
  - Generic avatar placeholder in place of `<ProfileThumbnail>` (the partner profile `id` is `''`)
  - Name: i18n key `messaging.archived_conversation_name` → *"Deleted Account"*
  - Subtitle: i18n key `messaging.archived_conversation_subtitle` → *"This conversation is no longer available"*
  - **No turn badges** — turn state is meaningless for a deleted-account conversation. The tombstone `v-else` branch contains no badge elements at all — do not copy the badge `div` from the normal row even though the "same layout shell" phrasing might suggest doing so.
  - **No `lastMessage` preview** — the tombstone subtitle replaces the last message preview entirely. Do not render `lastMessage` content on the tombstone row even if `lastMessage` is non-null.
  - The tombstone row uses a static `class="disabled"` — no dynamic `:class` binding needed

### 4. `packages/shared/i18n/en.json`

Add two keys under `messaging`:

```json
"archived_conversation_name": "Deleted Account",
"archived_conversation_subtitle": "This conversation is no longer available"
```

## Tests

### `apps/frontend/src/features/messaging/components/__tests__/ConversationSummaries.spec.ts`

First, add a `conversation` field to the `makeConvo` factory (it currently has none):

```ts
conversation: { id: 'c1', updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), status: 'ACCEPTED' },
```

Then add a test case. The `makeConvo` uses a shallow `...overrides` spread, so override the full `conversation` object:

```ts
makeConvo({ conversation: { id: 'c1', updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), status: 'ARCHIVED' } })
```

Assert:

- Tombstone name ("Deleted Account") is rendered
- Subtitle ("This conversation is no longer available") is rendered
- Triggering a click on the tombstone row does not cause a `convo:select` event to be emitted by the component (there is no `@click` handler on the `v-else` branch — checking for absence of the emitted Vue event is the right assertion, not checking CSS)
- No turn badges ("My turn" / "Their turn") are shown
- `ProfileThumbnail` is not rendered for that row

### `apps/backend/src/__tests__/api/messaging.mappers.spec.ts`

- Add `status: 'ACCEPTED'` to the `conversation` object in the top-level `participant` fixture (line ~33). All inline `conversation` spreads in the `isCallable` and `deleted partner` describe blocks use `...participant.conversation`, so they will inherit `status` automatically — no per-test changes needed.
- Extend the existing `'deleted partner (account closed)'` describe block to additionally assert `summary.conversation.status === 'ARCHIVED'`. The existing block already asserts `canReply === false` — do not duplicate that.
- Add a test case for the happy-path asserting that `conversation.status` is passed through correctly (e.g. `'ACCEPTED'` → `summary.conversation.status === 'ACCEPTED'`)

## Conversation Detail

No changes needed. ARCHIVED conversations are non-clickable in the list, so `ConversationDetail` never receives an archived conversation as its `conversation` prop.

## Acceptance Criteria

- [ ] Surviving participant sees ARCHIVED conversations in their inbox with muted/closed styling
- [ ] The archived row shows "Deleted Account" as the name and "This conversation is no longer available" as the subtitle
- [ ] The archived row is not clickable
- [ ] No turn badges appear on the archived row
- [ ] Non-archived conversations are unaffected
- [ ] `pnpm test` passes across frontend and backend

## Out of Scope

- Conversation detail view changes (banner, disabled input) — not needed since archived conversations are non-clickable
- Blocked conversation tombstone — separate concern

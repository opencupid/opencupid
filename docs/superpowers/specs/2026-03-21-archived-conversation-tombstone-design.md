# Design: Archived Conversation Tombstone (Issue #1192)

## Background

When a user deletes their account, their conversations are set to `ARCHIVED` status and the surviving participant's `ConversationParticipant` record is preserved (PR #1179). The backend already returns ARCHIVED conversations in the conversation list and already sets `canReply: false` for them. The frontend currently has no way to distinguish them from normal conversations — they render with a missing profile.

## Approach

Expose `status` in the `ConversationSummary` DTO so the frontend can drive all tombstone behaviour from a single, explicit flag (`status === 'ARCHIVED'`).

## Backend Changes

### 1. `packages/shared/zod/messaging/messaging.dto.ts`

Add `status` to the `conversation` pick in `ConversationSummarySchema`:

```ts
conversation: ConversationSchema.pick({
  id: true,
  updatedAt: true,
  createdAt: true,
  status: true,   // ← add
}),
```

Import `ConversationStatusSchema` from `'../generated'` (already exported there).

### 2. `apps/backend/src/api/mappers/messaging.mappers.ts`

Extend `mapConversationMeta` to include `status`:

```ts
function mapConversationMeta(c: { id: string; updatedAt: Date; createdAt: Date; status: string }) {
  return { id: c.id, updatedAt: c.updatedAt, createdAt: c.createdAt, status: c.status }
}
```

No other backend changes — `canReply` is already `false` for ARCHIVED and the mapper already returns a tombstone `partnerProfile` when the partner is gone.

## Frontend Changes

### 3. `apps/frontend/src/features/messaging/components/ConversationSummaries.vue`

Add a helper computed to detect archived conversations:

```ts
const isArchived = (convo: ConversationSummary) => convo.conversation.status === 'ARCHIVED'
```

Inside the `v-for`, split the row with `v-if`/`v-else`:

- **Normal row** (existing, unchanged): rendered when `!isArchived(convo)`
- **Archived tombstone row**: rendered when `isArchived(convo)`:
  - Same layout shell as the normal row
  - No `@click` binding
  - Add `disabled` class (follows the existing `!convo.canReply` pattern — `opacity: 0.5; pointer-events: none`)
  - Generic avatar placeholder in place of `<ProfileThumbnail>` (the partner profile `id` is `''`)
  - Name: i18n key `messaging.archived_conversation_name` → *"Deleted Account"*
  - Subtitle: i18n key `messaging.archived_conversation_subtitle` → *"This conversation is no longer available"*
  - No turn badges (my turn / their turn)

### 4. `packages/shared/i18n/en.json`

Add two keys under `messaging`:

```json
"archived_conversation_name": "Deleted Account",
"archived_conversation_subtitle": "This conversation is no longer available"
```

## Conversation Detail

No changes needed. ARCHIVED conversations are non-clickable in the list, so `ConversationDetail` never receives an archived conversation as its `conversation` prop.

## Acceptance Criteria

- [ ] Surviving participant sees ARCHIVED conversations in their inbox with muted/closed styling
- [ ] The archived row shows "Deleted Account" as the name and "This conversation is no longer available" as the subtitle
- [ ] The archived row is not clickable
- [ ] Non-archived conversations are unaffected
- [ ] `pnpm test` passes across frontend and backend

## Out of Scope

- Conversation detail view changes (banner, disabled input) — not needed since archived conversations are non-clickable
- Blocked conversation tombstone — separate concern

# Unify MessageDTO Mapper Input Types — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate three separate MessageDTO construction paths into a single mapper function with a clean, typed input.

**Architecture:** Define a `MessageWithSender` type that represents a Prisma message with sender profile and optional attachment included. Replace `mapMessageDTO` (which unnecessarily requires the heavy `ConversationParticipantWithConversationSummary`) and `mapMessageForMessageList` (which uses an inline type) with a single `mapMessageToDTO` function. Update `call.route.ts` to use it instead of inline DTO construction. Have `insertMissedCallMessage` include the sender in its query result so callers don't need to stitch the profile in manually.

**Tech Stack:** TypeScript, Prisma, Fastify, Vitest

---

## Analysis of Current State

### Three mapper paths today

| # | Function / Location | Input shape | Used by |
|---|---|---|---|
| 1 | `mapMessageDTO` | `MessageWithSendInclude` + `ConversationParticipantWithConversationSummary` | `messaging.route.ts` send-message (lines ~190, ~359) |
| 2 | `mapMessageForMessageList` | Inline `{ id, conversationId, senderId, content, messageType, createdAt, sender, attachment }` + `profileId` | `messaging.route.ts` list-messages (line ~102) |
| 3 | Inline construction | Raw `Message` + `mapProfileSummary(participant.profile)` | `call.route.ts` decline (lines 156–165) and cancel (lines 228–237) |

### Why they diverge

- `mapMessageDTO` takes the heavy inbox participant type solely to call `extractSenderProfile()` — but `MessageWithSendInclude` already contains `sender` from the Prisma include. The participant lookup is redundant.
- `mapMessageForMessageList` exists because the message-list query uses a different `include` shape than `sendInclude` — but both produce `{ id, publicName, profileImages }` on the sender.
- `call.route.ts` constructs the DTO inline because `insertMissedCallMessage` returns a bare `Message` without sender, so the route manually grabs the profile from the conversation participants.

### The fix

All three paths need the same thing: a message with `{ sender: DbProfileSummary, attachment: AttachmentFields | null }`. We define that as one type, make one mapper, and ensure all query paths return that shape.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/backend/src/services/messaging.service.ts` | Export `messageWithSenderInclude` (renamed from private `sendInclude`). |
| Modify | `apps/backend/src/api/mappers/messaging.mappers.ts` | Replace `mapMessageDTO` + `mapMessageForMessageList` with single `mapMessageToDTO`. Remove `extractSenderProfile`. |
| Modify | `apps/backend/src/services/call.service.ts` | `insertMissedCallMessage` includes sender in its query return. |
| Modify | `apps/backend/src/api/routes/messaging.route.ts` | Update imports and call sites. |
| Modify | `apps/backend/src/api/routes/call.route.ts` | Replace inline DTO construction with `mapMessageToDTO`. Remove `mapProfileSummary` import. |
| Modify | `packages/shared/zod/messaging/messaging.dto.ts` | Remove `ConversationParticipantWithConversationSummary` type (no longer needed by mappers). |
| Modify | `apps/backend/src/__tests__/api/messaging.mappers.spec.ts` | Update tests for new mapper API. |
| Modify | `apps/backend/src/__tests__/routes/messaging.route.spec.ts` | Update mock for renamed mapper. |
| Modify | `apps/backend/src/__tests__/routes/call.route.spec.ts` | Update mock from `mapProfileSummary` to `mapMessageToDTO`, add `sender`/`attachment` to mock messages. |

---

## Chunk 1: Unified mapper and call sites

### Task 1: Define the shared include and input type

**Files:**
- Modify: `apps/backend/src/services/messaging.service.ts:33-46`

- [ ] **Step 1: Rename and export `sendInclude`**

In `messaging.service.ts`, rename the private `sendInclude` const to `messageWithSenderInclude` and export it. This is the canonical Prisma include for any message-to-DTO mapping.

```typescript
// messaging.service.ts — replace lines 33-46

export const messageWithSenderInclude = {
  sender: {
    select: {
      id: true,
      publicName: true,
      profileImages: {
        orderBy: { position: 'asc' },
      },
    },
  },
  attachment: true,
} satisfies Prisma.MessageInclude

export type MessageWithSender = Prisma.MessageGetPayload<{
  include: typeof messageWithSenderInclude
}>
```

- [ ] **Step 2: Update internal references to old name**

In `messaging.service.ts`, find all references to `sendInclude` and replace with `messageWithSenderInclude`. Also rename the old type export `MessageWithSendInclude` to `MessageWithSender`.

Search for usages:
```bash
pnpm --filter backend exec grep -rn "sendInclude\|MessageWithSendInclude" src/
```

Update every reference in `messaging.service.ts`. Specifically:

- Line ~242: `sendOrStartConversation` return type `Promise<{ convoId: string; message: MessageWithSendInclude; ... }>` → replace `MessageWithSendInclude` with `MessageWithSender`
- Line ~385: `SendMessageSuccessResponse` type uses `message: MessageWithSendInclude` → replace with `MessageWithSender`
- All usages of the old `sendInclude` const name in Prisma queries within the file

- [ ] **Step 3: Update `listMessagesForConversation` to use the shared include**

The current query at line ~136 uses its own inline include. Replace it with `messageWithSenderInclude`:

```typescript
// In listMessagesForConversation method
const messages = await prisma.message.findMany({
  where: { conversationId },
  include: messageWithSenderInclude,
  orderBy: { createdAt: 'desc' },
  take: pageSize + 1,
  ...(options?.cursor
    ? { cursor: { id: options.cursor }, skip: 1 }
    : {}),
})
```

Note: The old query used `sender: { include: { profileImages: { where: { position: 0 } } } }` (filtering to first image only). The shared include uses `sender: { select: { id, publicName, profileImages: { orderBy: { position: 'asc' } } } }` which selects only needed columns but returns *all* profile images instead of just the first. This is a minor efficiency tradeoff — for a message list of 50 messages, each sender may have multiple images. However, the `select` limits columns (no full profile row), and `mapProfileSummary` → `toPublicProfileImage` handles the mapping. If this becomes a concern, add `take: 1` to `profileImages` in the shared include later.

- [ ] **Step 4: Verify type-check passes**

```bash
pnpm --filter backend exec tsc --noEmit
```

Expected: PASS (or only pre-existing errors unrelated to this change).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/messaging.service.ts
git commit -m "refactor: export messageWithSenderInclude and unify message query include (#1096)"
```

---

### Task 2: Create the unified mapper

**Files:**
- Modify: `apps/backend/src/api/mappers/messaging.mappers.ts`

- [ ] **Step 1: Update tests first — rewrite `messaging.mappers.spec.ts`**

Replace the `mapMessageDTO` and `mapMessageForMessageList` tests with tests for the new `mapMessageToDTO`:

```typescript
// apps/backend/src/__tests__/api/messaging.mappers.spec.ts
// Replace the existing mapMessageForMessageList and mapMessageDTO tests:

import {
  mapMessageToDTO,
  mapConversationParticipantToSummary,
  mapAttachmentDTO,
} from '../../api/mappers/messaging.mappers'

// ... keep vi.mock lines and participant fixture as-is ...

// Replace msg fixture — add storagePath to match DbProfileSummary shape:
const msg: any = {
  id: 'm1',
  conversationId: 'c1',
  senderId: 'p1',
  content: 'hi',
  createdAt: new Date(),
  messageType: 'text/plain',
  sender: { id: 'p1', publicName: 'Me', profileImages: [] },
  attachment: null,
}

describe('messaging mappers', () => {
  describe('mapMessageToDTO', () => {
    it('maps a message with sender to DTO', () => {
      const dto = mapMessageToDTO(msg)
      expect(dto.id).toBe('m1')
      expect(dto.sender.publicName).toBe('Me')
      expect(dto.attachment).toBeNull()
      expect(dto.isMine).toBeUndefined()
    })

    it('sets isMine true when senderId matches profileId', () => {
      const dto = mapMessageToDTO(msg, 'p1')
      expect(dto.isMine).toBe(true)
    })

    it('sets isMine false when senderId does not match profileId', () => {
      const dto = mapMessageToDTO(msg, 'p2')
      expect(dto.isMine).toBe(false)
    })

    it('maps attachment when present', () => {
      const msgWithAttachment = {
        ...msg,
        attachment: {
          id: 'a1',
          filePath: 'voice/p1/msg.webm',
          mimeType: 'audio/webm',
          fileSize: 1024,
          duration: 5,
          createdAt: new Date(),
        },
      }
      const dto = mapMessageToDTO(msgWithAttachment)
      expect(dto.attachment).not.toBeNull()
      expect(dto.attachment!.mimeType).toBe('audio/webm')
    })
  })

  // ... keep all existing mapConversationParticipantToSummary, isCallable, and mapAttachmentDTO tests unchanged ...
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter backend exec vitest run -t "mapMessageToDTO" --reporter=verbose
```

Expected: FAIL — `mapMessageToDTO` is not exported.

- [ ] **Step 3: Implement `mapMessageToDTO` and remove old mappers**

In `messaging.mappers.ts`:

1. Replace the import of `MessageWithSendInclude` with `MessageWithSender`:
```typescript
import {
  canSendMessageInConversation,
  type MessageWithSender,
} from '../../services/messaging.service'
```

2. Remove `extractSenderProfile` function (lines 22–27).

3. Replace `mapMessageDTO` (lines 67–82) and `mapMessageForMessageList` (lines 103–134) with:

```typescript
export function mapMessageToDTO(m: MessageWithSender, currentProfileId?: string): MessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    messageType: m.messageType,
    createdAt: m.createdAt,
    sender: mapProfileSummary(m.sender),
    attachment: m.attachment ? mapAttachmentDTO(m.attachment) : null,
    ...(currentProfileId !== undefined && { isMine: m.senderId === currentProfileId }),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter backend exec vitest run -t "mapMessageToDTO" --reporter=verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/mappers/messaging.mappers.ts apps/backend/src/__tests__/api/messaging.mappers.spec.ts
git commit -m "refactor: replace mapMessageDTO + mapMessageForMessageList with unified mapMessageToDTO (#1096)"
```

---

### Task 3: Update `messaging.route.ts` call sites

**Files:**
- Modify: `apps/backend/src/api/routes/messaging.route.ts`
- Modify: `apps/backend/src/__tests__/routes/messaging.route.spec.ts`

- [ ] **Step 1: Update imports in `messaging.route.ts`**

Replace:
```typescript
import {
  mapMessageDTO,
  mapMessageForMessageList,
  mapConversationParticipantToSummary,
} from '../mappers/messaging.mappers'
```

With:
```typescript
import {
  mapMessageToDTO,
  mapConversationParticipantToSummary,
} from '../mappers/messaging.mappers'
```

- [ ] **Step 2: Update message-list endpoint (~line 102)**

Replace:
```typescript
const messages = raw.map((m) => mapMessageForMessageList(m, profileId))
```

With:
```typescript
const messages = raw.map((m) => mapMessageToDTO(m, profileId))
```

- [ ] **Step 3: Update send-message endpoints (~lines 190, 359)**

**IMPORTANT:** The WS broadcast sends the DTO to the *recipient*, so it must NOT include `isMine`. The HTTP response goes to the *sender*, so it needs `isMine: true`. Use two separate calls:

Replace both occurrences of:
```typescript
const messageDTO = mapMessageDTO(message, conversation)
const messageWithMine = { ...messageDTO, isMine: true }
```

With:
```typescript
const messageDTO = mapMessageToDTO(message)
const messageWithMine = mapMessageToDTO(message, senderProfileId)
```

- Use `messageDTO` (no `isMine`) for the WS broadcast and push notification (unchanged — it's already used there).
- Use `messageWithMine` (has `isMine: true`) for the HTTP response to the sender (unchanged — it's already used there).

The variable names stay the same, only the construction changes.

- [ ] **Step 4: Update test mock in `messaging.route.spec.ts`**

Replace mock of `mapMessageDTO` and `mapMessageForMessageList` with `mapMessageToDTO`:

```typescript
vi.mock('@/api/mappers/messaging.mappers', () => ({
  mapMessageToDTO: vi.fn((m: any) => ({ ...m, mapped: true })),
  mapConversationParticipantToSummary: vi.fn((p: any) => ({
    ...p,
    partnerProfile: { publicName: 'Test' },
  })),
}))
```

- [ ] **Step 5: Run all messaging tests**

```bash
pnpm --filter backend exec vitest run src/__tests__/routes/messaging.route.spec.ts src/__tests__/api/messaging.mappers.spec.ts --reporter=verbose
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/api/routes/messaging.route.ts apps/backend/src/__tests__/routes/messaging.route.spec.ts
git commit -m "refactor: update messaging.route.ts to use mapMessageToDTO (#1096)"
```

---

### Task 4: Update `call.service.ts` and `call.route.ts`

**Files:**
- Modify: `apps/backend/src/services/call.service.ts:55-81`
- Modify: `apps/backend/src/api/routes/call.route.ts`

- [ ] **Step 1: Update `insertMissedCallMessage` to include sender**

In `call.service.ts`, add the import and update the method:

```typescript
import { messageWithSenderInclude, type MessageWithSender } from './messaging.service'

// Change return type:
async insertMissedCallMessage(
  tx: Prisma.TransactionClient,
  conversationId: string,
  callerProfileId: string
): Promise<{ message: MessageWithSender; isDuplicate: boolean }> {
  const thirtySecondsAgo = new Date(Date.now() - 30000)
  const existing = await tx.message.findFirst({
    where: {
      conversationId,
      senderId: callerProfileId,
      messageType: 'call/missed',
      createdAt: { gte: thirtySecondsAgo },
    },
    include: messageWithSenderInclude,
  })
  if (existing) return { message: existing, isDuplicate: true }

  const message = await tx.message.create({
    data: {
      conversationId,
      senderId: callerProfileId,
      content: 'Missed call',
      messageType: 'call/missed',
    },
    include: messageWithSenderInclude,
  })
  return { message, isDuplicate: false }
}
```

- [ ] **Step 2: Simplify `call.route.ts` decline handler (lines 124–180)**

Replace the conversation query and inline DTO construction. Since `insertMissedCallMessage` now returns a message with sender, the route no longer needs to include profiles in its conversation query.

The conversation query (lines 124–131) can be simplified — it still needs `participants` to find the caller and to broadcast, but no longer needs `profile: { include: { profileImages: true } }`:

```typescript
const conversation = await fastify.prisma.conversation.findUnique({
  where: { id: params.data.conversationId },
  include: { participants: true },
})
```

Replace the inline DTO construction (lines 156–165):
```typescript
const messageDTO = mapMessageToDTO(missedMsg)
```

Add import at top of file:
```typescript
import { mapMessageToDTO } from '@/api/mappers/messaging.mappers'
```

Remove the now-unused import:
```typescript
// Remove: import { mapProfileSummary } from '@/api/mappers/profile.mappers'
// Remove: import type { MessageDTO } from '@zod/messaging/messaging.dto'
```

- [ ] **Step 3: Simplify `call.route.ts` cancel handler (lines 194–252)**

Same pattern as decline. Simplify the conversation query and replace inline DTO:

```typescript
const conversation = await fastify.prisma.conversation.findUnique({
  where: { id: params.data.conversationId },
  include: { participants: true },
})
```

Replace lines 228–237:
```typescript
const messageDTO = mapMessageToDTO(cancelMissedMsg)
```

Remove `callerParticipant` lookup (line 209–210) — no longer needed since the sender comes from the message itself. Keep `calleeParticipant` for the WS broadcast.

- [ ] **Step 4: Update `call.route.spec.ts` mocks and fixtures**

**Files:**
- Modify: `apps/backend/src/__tests__/routes/call.route.spec.ts`

The test currently mocks `mapProfileSummary` (lines 19–25) and returns bare `Message` objects from `insertMissedCallMessage`. After our changes:
- `call.route.ts` no longer imports `mapProfileSummary` — it imports `mapMessageToDTO` from `messaging.mappers`
- `insertMissedCallMessage` now returns `MessageWithSender` (with `sender` and `attachment` fields)

Replace the mock:
```typescript
// Remove:
vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileSummary: vi.fn((p: any) => ({
    id: p.id,
    publicName: p.publicName,
    profileImages: [],
  })),
}))

// Add:
vi.mock('../../api/mappers/messaging.mappers', () => ({
  mapMessageToDTO: vi.fn((m: any) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    messageType: m.messageType,
    createdAt: m.createdAt,
    sender: { id: m.sender?.id, publicName: m.sender?.publicName, profileImages: [] },
    attachment: null,
  })),
}))
```

Update all `insertMissedCallMessage` mock return values to include `sender` and `attachment`. For example, the decline test (line 116):
```typescript
mockCallService.insertMissedCallMessage.mockResolvedValue({
  message: {
    id: 'msg-1',
    conversationId: 'ck1234567890abcd12345678',
    senderId: 'p2',
    content: 'Missed call',
    messageType: 'call/missed',
    createdAt: new Date(),
    sender: { id: 'p2', publicName: 'Bob', profileImages: [] },
    attachment: null,
  },
  isDuplicate: false,
})
```

Apply the same pattern to the cancel test (line 190) and the isDuplicate test (line 150).

Since the conversation query no longer includes profiles, simplify the `findUnique` mock return values — remove the nested `profile` from participants:
```typescript
fastify.prisma.conversation.findUnique = vi.fn().mockResolvedValue({
  id: 'ck1234567890abcd12345678',
  participants: [
    { profileId: 'p1' },
    { profileId: 'p2' },
  ],
})
```

- [ ] **Step 5: Run type-check**

```bash
pnpm --filter backend exec tsc --noEmit
```

Expected: PASS

- [ ] **Step 6: Run full backend tests**

```bash
pnpm --filter backend test
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/services/call.service.ts apps/backend/src/api/routes/call.route.ts apps/backend/src/__tests__/routes/call.route.spec.ts
git commit -m "refactor: call.route uses mapMessageToDTO, insertMissedCallMessage includes sender (#1096)"
```

---

### Task 5: Clean up unused types and exports

**Files:**
- Modify: `packages/shared/zod/messaging/messaging.dto.ts`
- Modify: `apps/backend/src/api/mappers/messaging.mappers.ts`

- [ ] **Step 1: Check if `ConversationParticipantWithConversationSummary` is still used**

```bash
pnpm --filter backend exec grep -rn "ConversationParticipantWithConversationSummary" src/
```

It is still used by `mapConversationParticipantToSummary` and `messaging.service.ts` — so it stays. Do **not** remove it.

- [ ] **Step 2: Check if `extractSenderProfile` is used anywhere else**

```bash
pnpm --filter backend exec grep -rn "extractSenderProfile" src/
```

If only in the mapper file (which we already removed it from), confirm it's gone. If referenced elsewhere, export from the mapper but it should not be.

- [ ] **Step 3: Verify no dead imports remain**

```bash
pnpm lint
```

ESLint will flag unused imports. Fix any that appear.

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
```

Expected: PASS

- [ ] **Step 5: Run type-check across all packages**

```bash
pnpm type-check
```

Expected: PASS

- [ ] **Step 6: Format changed files**

```bash
pnpm exec prettier --write \
  apps/backend/src/api/mappers/messaging.mappers.ts \
  apps/backend/src/api/routes/messaging.route.ts \
  apps/backend/src/api/routes/call.route.ts \
  apps/backend/src/services/messaging.service.ts \
  apps/backend/src/services/call.service.ts \
  apps/backend/src/__tests__/api/messaging.mappers.spec.ts \
  apps/backend/src/__tests__/routes/messaging.route.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add \
  apps/backend/src/api/mappers/messaging.mappers.ts \
  apps/backend/src/api/routes/messaging.route.ts \
  apps/backend/src/api/routes/call.route.ts \
  apps/backend/src/services/messaging.service.ts \
  apps/backend/src/services/call.service.ts \
  apps/backend/src/__tests__/api/messaging.mappers.spec.ts \
  apps/backend/src/__tests__/routes/messaging.route.spec.ts \
  apps/backend/src/__tests__/routes/call.route.spec.ts
git commit -m "refactor: clean up unused imports and format (#1096)"
```

---

### Task 6: Add changeset and finalize

- [ ] **Step 1: Create changeset file**

```bash
cat > .changeset/calm-maps-unite.md << 'EOF'
---
'@opencupid/backend': patch
---

Unify MessageDTO mapper input types into single `mapMessageToDTO` function (#1096)
EOF
```

- [ ] **Step 2: Commit changeset**

```bash
git add .changeset/calm-maps-unite.md
git commit -m "chore: add changeset for message mapper unification (#1096)"
```

- [ ] **Step 3: Push and create PR**

```bash
git push -u origin <branch-name>
gh pr create --title "refactor: unify MessageDTO mapper input types (#1096)" --body "$(cat <<'EOF'
## Summary
- Consolidate `mapMessageDTO` + `mapMessageForMessageList` + inline DTO construction into single `mapMessageToDTO(message, currentProfileId?)` function
- Export shared `messageWithSenderInclude` from messaging service as canonical Prisma include
- Update `insertMissedCallMessage` to return message with sender included, eliminating need for manual profile stitching in call routes

Closes #1096

## Test plan
- [ ] `pnpm --filter backend test` passes
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] Manual: send a text message — verify it appears in conversation
- [ ] Manual: send a voice message — verify attachment maps correctly
- [ ] Manual: initiate and decline a call — verify missed-call message appears
- [ ] Manual: initiate and cancel a call — verify missed-call message appears

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Watch CI**

```bash
gh run list --limit 1
gh run watch --exit-status
```

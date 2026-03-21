# Archived Conversation Tombstone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render ARCHIVED conversations (where the other participant deleted their account) as non-clickable tombstone rows in the inbox, with "Deleted Account" name and "This conversation is no longer available" subtitle.

**Architecture:** Add `status` to the `ConversationSummary` DTO (one-line pick change + import), thread it through the mapper, then use a `v-if`/`v-else` split in `ConversationSummaries.vue` to render a tombstone row for `conversation.status === 'ARCHIVED'`. No store changes needed — `canReply` is already `false` for ARCHIVED and archived conversations are non-clickable so `ConversationDetail` is never reached.

**Tech Stack:** Zod (DTO), Prisma (type), Vue 3 Composition API + `<script setup>`, Bootstrap Vue Next (`BListGroupItem`), Vitest + Vue Test Utils, vue-i18n.

**Spec:** `docs/superpowers/specs/2026-03-21-archived-conversation-tombstone-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `packages/shared/zod/messaging/messaging.dto.ts` | Modify | Add `status` to `conversation` pick in `ConversationSummarySchema`; import `ConversationStatusSchema` |
| `apps/backend/src/api/mappers/messaging.mappers.ts` | Modify | Add `status` to `mapConversationMeta` parameter type and return value |
| `packages/shared/i18n/en.json` | Modify | Add `archived_conversation_name` and `archived_conversation_subtitle` keys |
| `apps/frontend/src/features/messaging/components/ConversationSummaries.vue` | Modify | Add `isArchived` helper; `v-if`/`v-else` row split; tombstone branch markup |
| `apps/backend/src/__tests__/api/messaging.mappers.spec.ts` | Modify | Add `status` to `participant.conversation` fixture; extend ARCHIVED assertions |
| `apps/frontend/src/features/messaging/components/__tests__/ConversationSummaries.spec.ts` | Modify | Add `conversation` field to `makeConvo` factory; add tombstone test case |

---

## Task 1: Expose `status` in the DTO + mapper

**Files:**
- Modify: `packages/shared/zod/messaging/messaging.dto.ts:3-8,97-101`
- Modify: `apps/backend/src/api/mappers/messaging.mappers.ts:1-6,14-20`
- Test: `apps/backend/src/__tests__/api/messaging.mappers.spec.ts`

- [ ] **Step 1: Add `status` to the backend mapper test fixture**

Open `apps/backend/src/__tests__/api/messaging.mappers.spec.ts`. The `participant.conversation` object (around line 33) currently has no `status` field. Add it:

```ts
conversation: {
  id: 'c1',
  updatedAt: new Date(),
  createdAt: new Date(),
  status: 'ACCEPTED',           // ← add this line
  participants: [...],
  messages: [msg],
},
```

All inline `conversation` spreads in the `isCallable` and `deleted partner` describe blocks use `...participant.conversation`, so they inherit `status` automatically — no per-test changes needed.

- [ ] **Step 2: Add a status pass-through test (happy path)**

In `messaging.mappers.spec.ts`, after the existing `'maps participant to conversation summary'` test (line ~91), add:

```ts
it('passes conversation status through to the summary', () => {
  const summary = mapConversationParticipantToSummary(participant, 'p1')
  expect(summary.conversation.status).toBe('ACCEPTED')
})
```

- [ ] **Step 3: Extend the deleted-partner test to assert ARCHIVED status**

In the `'deleted partner (account closed)'` describe block (line ~174), extend the existing test by adding to the participant override:

```ts
const p: any = {
  ...participant,
  conversation: {
    ...participant.conversation,
    status: 'ARCHIVED',   // ← add
    participants: [
      {
        profileId: 'p1',
        isCallable: true,
        profile: { id: 'p1', publicName: 'Me', profileImages: [], isCallable: true },
      },
    ],
  },
}
```

Then add this assertion after the existing ones:

```ts
expect(summary.conversation.status).toBe('ARCHIVED')
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
pnpm --filter backend test --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|×|status"
```

Expected: new tests fail because `conversation.status` doesn't exist on the DTO yet.

- [ ] **Step 5: Add `ConversationStatusSchema` import to the DTO**

Open `packages/shared/zod/messaging/messaging.dto.ts`. Update the import from `'../generated'` (line ~3):

```ts
import {
  ConversationParticipantSchema,
  ConversationSchema,
  ConversationStatusSchema,   // ← add
  MessageSchema,
  MessageAttachmentSchema,
} from '../generated'
```

- [ ] **Step 6: Add `status` to the `conversation` pick in `ConversationSummarySchema`**

In the same file, find the `ConversationSummarySchema` definition (line ~89). The `conversation` pick currently has `id`, `updatedAt`, `createdAt`. Add `status`:

```ts
conversation: ConversationSchema.pick({
  id: true,
  updatedAt: true,
  createdAt: true,
  status: true,   // ← add
}),
```

- [ ] **Step 7: Add `status` to `mapConversationMeta` in the mapper**

Open `apps/backend/src/api/mappers/messaging.mappers.ts`. Add `ConversationStatusType` to the import at the top:

```ts
import type {
  ConversationParticipantWithConversationSummary,
  ConversationSummary,
  MessageAttachmentDTO,
  MessageDTO,
} from '@zod/messaging/messaging.dto'
import type { ConversationStatusType } from '@zod/generated'   // ← add
```

Then update `mapConversationMeta`:

```ts
function mapConversationMeta(c: {
  id: string
  updatedAt: Date
  createdAt: Date
  status: ConversationStatusType   // ← add
}) {
  return {
    id: c.id,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
    status: c.status,   // ← add
  }
}
```

- [ ] **Step 8: Run backend tests**

```bash
pnpm --filter backend test --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|×"
```

Expected: all pass.

- [ ] **Step 9: Type-check**

```bash
pnpm type-check 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add packages/shared/zod/messaging/messaging.dto.ts \
        apps/backend/src/api/mappers/messaging.mappers.ts \
        apps/backend/src/__tests__/api/messaging.mappers.spec.ts
git commit -m "feat: expose conversation status in ConversationSummary DTO (#1192)"
```

---

## Task 2: Add i18n keys

**Files:**
- Modify: `packages/shared/i18n/en.json`

- [ ] **Step 1: Add the two new keys**

Open `packages/shared/i18n/en.json`. Find the `"messaging"` object. Add two keys (alphabetical order within the object is preferred but not required):

```json
"archived_conversation_name": "Deleted Account",
"archived_conversation_subtitle": "This conversation is no longer available",
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/i18n/en.json
git commit -m "i18n: add archived conversation tombstone strings (#1192)"
```

---

## Task 3: Tombstone row in `ConversationSummaries.vue`

**Files:**
- Modify: `apps/frontend/src/features/messaging/components/ConversationSummaries.vue`
- Test: `apps/frontend/src/features/messaging/components/__tests__/ConversationSummaries.spec.ts`

- [ ] **Step 1: Add `conversation` field to the `makeConvo` factory**

Open `apps/frontend/src/features/messaging/components/__tests__/ConversationSummaries.spec.ts`. The `makeConvo` factory (line ~7) has no `conversation` field. Add it:

```ts
function makeConvo(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: '1',
    profileId: 'p1',
    conversationId: 'c1',
    lastReadAt: new Date().toISOString(),
    isMuted: false,
    canReply: true,
    isCallable: true,
    myIsCallable: true,
    conversation: {                                      // ← add
      id: 'c1',                                         // ← add
      updatedAt: new Date().toISOString(),               // ← add
      createdAt: new Date().toISOString(),               // ← add
      status: 'ACCEPTED',                               // ← add
    },                                                   // ← add
    partnerProfile: {
      id: 'p2',
      publicName: 'Alice',
    } as ConversationSummary['partnerProfile'],
    lastMessage: {
      content: 'Hello there',
      messageType: 'text/plain',
      createdAt: new Date().toISOString(),
      isMine: false,
    },
    ...overrides,
  } as ConversationSummary
}
```

> **Note:** `makeConvo` uses a shallow `...overrides` spread. To override `conversation.status`, pass the full `conversation` object: `makeConvo({ conversation: { id: 'c1', updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), status: 'ARCHIVED' } })`.

- [ ] **Step 2: Write the failing tombstone tests**

Add a new describe block after the existing tests:

```ts
describe('archived conversation tombstone', () => {
  const archivedConvo = makeConvo({
    conversation: {
      id: 'c1',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'ARCHIVED',
    },
    partnerProfile: {
      id: '',
      publicName: '',
    } as ConversationSummary['partnerProfile'],
    lastMessage: {
      content: 'Last message before deletion',
      messageType: 'text/plain',
      createdAt: new Date().toISOString(),
      isMine: false,
    },
  })

  const mountArchived = () =>
    mount(ConversationSummaries, {
      props: { conversations: [archivedConvo], activeConversation: null, loading: false },
      ...globalMocks,
    })

  it('renders tombstone name', () => {
    const wrapper = mountArchived()
    expect(wrapper.text()).toContain('messaging.archived_conversation_name')
  })

  it('renders tombstone subtitle', () => {
    const wrapper = mountArchived()
    expect(wrapper.text()).toContain('messaging.archived_conversation_subtitle')
  })

  it('does not render last message preview', () => {
    const wrapper = mountArchived()
    expect(wrapper.find('.last-message').exists()).toBe(false)
  })

  it('does not render ProfileThumbnail', () => {
    const wrapper = mountArchived()
    // ProfileThumbnail renders an img or placeholder — check by component stub absence
    expect(wrapper.findComponent({ name: 'ProfileThumbnail' }).exists()).toBe(false)
  })

  it('does not emit convo:select when clicked', async () => {
    const wrapper = mountArchived()
    // BListGroupItem renders as a <li> element in BVNX — use tag selector, not CSS class
    await wrapper.find('li').trigger('click')
    expect(wrapper.emitted('convo:select')).toBeFalsy()
  })

  it('does not show My turn or Their turn badges', () => {
    const wrapper = mountArchived()
    expect(wrapper.text()).not.toContain('messaging.my_turn')
    expect(wrapper.text()).not.toContain('messaging.their_turn')
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pnpm --filter frontend exec vitest run -t "archived conversation tombstone" 2>&1 | tail -20
```

Expected: all 6 new tests fail.

- [ ] **Step 4: Implement the tombstone row in `ConversationSummaries.vue`**

Open `apps/frontend/src/features/messaging/components/ConversationSummaries.vue`.

**Script changes** — add the `isArchived` helper in `<script setup>`:

```ts
const isArchived = (convo: ConversationSummary) => convo.conversation.status === 'ARCHIVED'
```

**Template changes** — inside the `v-for`, wrap the existing `BListGroupItem` with `v-if="!isArchived(convo)"` and add a tombstone `v-else` branch immediately after:

```html
<!-- Normal row (existing — keep entirely unchanged, including :class and @click).
     The existing :key="convo.conversationId" moves from the v-for element to this v-if branch. -->
<BListGroupItem
  v-if="!isArchived(convo)"
  :key="convo.conversationId"
  :active="activeConversation?.conversationId === convo.conversationId"
  :class="{ disabled: !convo.canReply }"
  variant="light"
  class="d-flex justify-content-start align-items-center mb-3 p-2 border-0 rounded-3 shadow cursor-pointer user-select-none"
  @click="$emit('convo:select', convo)"
>
  <!-- ... existing content unchanged ... -->
</BListGroupItem>

<!-- Archived tombstone row -->
<BListGroupItem
  v-else
  :key="`archived-${convo.conversationId}`"
  variant="light"
  class="disabled d-flex justify-content-start align-items-center mb-3 p-2 border-0 rounded-3 shadow user-select-none"
>
  <div class="thumbnail me-2 flex-shrink-0">
    <!-- Generic avatar placeholder — no ProfileThumbnail, partner id is '' -->
    <div class="rounded-circle bg-secondary d-flex align-items-center justify-content-center" style="width:40px;height:40px;">
      <span class="text-white">?</span>
    </div>
  </div>
  <div class="overflow-hidden flex-grow-1 user-select-none">
    <div class="text-truncate fw-bold text-muted">{{ $t('messaging.archived_conversation_name') }}</div>
    <small class="text-muted text-truncate text-nowrap pe-2">{{ $t('messaging.archived_conversation_subtitle') }}</small>
  </div>
</BListGroupItem>
```

> **Key rules for the tombstone branch:**
> - No `@click` binding — `pointer-events: none` via `disabled` class prevents interaction anyway, but the binding must also be absent so no `convo:select` event fires
> - Static `class="disabled"` — not a dynamic `:class` binding
> - No badge elements at all — do not copy the badge `div` from the normal row
> - No `lastMessage` preview — the subtitle replaces it entirely even if `lastMessage` is non-null
> - `v-else` has no `:key` collision with `v-if` branch since Vue uses the same node slot; use a distinct key prefix like `archived-` to be safe

- [ ] **Step 5: Run the new tombstone tests**

```bash
pnpm --filter frontend exec vitest run -t "archived conversation tombstone" 2>&1 | tail -20
```

Expected: all 6 pass.

- [ ] **Step 6: Run the full frontend test suite**

```bash
pnpm --filter frontend test 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 7: Lint**

```bash
pnpm lint 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 8: Type-check**

```bash
pnpm type-check 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 9: Format changed files**

```bash
pnpm exec prettier --write \
  apps/frontend/src/features/messaging/components/ConversationSummaries.vue \
  apps/frontend/src/features/messaging/components/__tests__/ConversationSummaries.spec.ts
```

- [ ] **Step 10: Commit**

```bash
git add apps/frontend/src/features/messaging/components/ConversationSummaries.vue \
        apps/frontend/src/features/messaging/components/__tests__/ConversationSummaries.spec.ts
git commit -m "feat: render ARCHIVED conversations as non-clickable tombstone in inbox (#1192)"
```

---

## Task 4: Full verification + changeset

- [ ] **Step 1: Run full test suite**

```bash
pnpm test 2>&1 | tail -30
```

Expected: all pass.

- [ ] **Step 2: Write changeset**

```bash
cat > .changeset/quiet-accounts-closed.md << 'EOF'
---
'@opencupid/frontend': minor
'@opencupid/shared': patch
'@opencupid/backend': patch
---

Show archived conversations as non-clickable tombstone rows in the inbox when the other participant deletes their account (#1192)
EOF
```

- [ ] **Step 3: Commit changeset**

```bash
git add .changeset/quiet-accounts-closed.md
git commit -m "chore: add changeset for archived conversation tombstone (#1192)"
```

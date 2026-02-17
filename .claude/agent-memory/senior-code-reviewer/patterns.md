# Codebase Patterns

## Cursor Pagination (messaging)

Implemented in `messaging.service.ts` `listMessagesForConversation`:
- Query in `DESC` order, apply cursor + skip 1, then `.reverse()` for oldest-first display
- `hasMore = messages.length === limit` (correct sentinel pattern)
- Default limit: 10 (hardcoded, not a constant — risk if changed without updating frontend)

## Scroll Position Restoration

Pattern in `MessageList.vue`:
- Watch on `props.messages` with `{ deep: true }`
- Detect prepend by: `newMsgs.length > oldMsgs.length && newMsgs[0]?.id !== oldMsgs[0].id`
- Capture `prevScrollHeight = el.scrollHeight` BEFORE nextTick
- Restore with `el.scrollTop = el.scrollHeight - prevScrollHeight` AFTER nextTick

Critical bug: `prevScrollHeight` is captured before `await nextTick()`, but DOM has not yet updated at capture time — this is actually CORRECT (capture old height, then after tick the new height includes prepended messages).

## Infinite Scroll Implementation

Scroll listener in `MessageList.vue` fires on every pixel of scroll — no debounce/throttle. The guard `!props.isLoadingOlder` prevents duplicate fetches while loading, but rapid scrolling near the top can still emit multiple `loadOlder` events before the store sets `isLoadingOlder = true` (async gap between emit and store update).

## Test Patterns

- Backend service tests use `createMockPrisma()` from `test-utils/prisma`
- Route tests use `MockFastify` / `MockReply` from `test-utils/fastify`
- Module reset pattern: `vi.resetModules()` + `vi.doMock()` + dynamic `import()` in `beforeEach`
- Service singleton reset: `(module.MessageService as any).instance = undefined`

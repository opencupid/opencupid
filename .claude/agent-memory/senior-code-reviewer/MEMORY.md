# Senior Code Reviewer Memory

## Project Overview
- Monorepo: `apps/frontend` (Vue 3), `apps/backend` (Fastify + Prisma), `packages/shared`
- All new components, routes, and services require tests in nearest `__tests__` dir
- See `patterns.md` for detailed conventions

## Key Patterns

### Backend
- Singleton services via `static getInstance()` (e.g., `MessageService`)
- Route handlers use `safeParse` for params/query, `sendError(reply, code, msg)` for errors
- Shared types in `packages/shared/zod/apiResponse.dto.ts`
- Prisma cursor pagination: `cursor: { id }`, `skip: 1`, `orderBy: createdAt desc` then `.reverse()` for display order
- `profileImages: { where: { position: 0 } }` filter used in `listMessagesForConversation` (not `orderBy: position asc` like in `sendInclude`)

### Frontend
- Pinia stores use options API style (not setup stores)
- `safeApiCall` wrapper used for all API calls
- Bus events: `ws:new_message`, `auth:logout`, `notification:new_message`
- `hasMoreMessages` and `isLoadingOlder` state added to `messageStore` for pagination

### Recurring Issues to Watch
- Scroll position restoration: must capture `scrollHeight` BEFORE `nextTick`, restore AFTER `nextTick`
- Scroll event listener fires rapidly — debounce/throttle needed to prevent duplicate pagination requests
- `hasMore` off-by-one: `messages.length === limit` is correct for "fetch N, if you got N there may be more" pattern
- Query validation failures silently fall back to undefined (route uses `query.success ? ... : undefined`) — invalid params are ignored rather than rejected
- Missing `limit` param in `fetchOlderMessages` — uses server default (10), which must stay in sync

See `patterns.md` for details.

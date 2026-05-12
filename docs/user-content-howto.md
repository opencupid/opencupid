# How to add a new user-content derived type

This guide documents the end-to-end process of introducing a new kind of
user-generated content that plugs into the polymorphic `UserContent` model.
It uses the `Event` type as a worked example throughout — every step shows
the concrete change made when `event` was added alongside `post`.

> If you are adding `meetup`, `poll`, `listing`, etc., follow the same eight
> stages below, substituting your kind name. The hard part is making sure
> all three polymorphic dispatch points (Zod union, mappers, generic route)
> learn about the new kind — see Stage 8 for the checklist.

## Architecture at a glance

`UserContent` is the base table; each derived kind is a sibling 1:1 child
keyed by `userContentId`. A single `kind: ContentKind` enum on the parent
acts as the runtime discriminator that drives Zod discriminated unions,
mapper dispatch, and the `/content/:id` polymorphic fetch.

```
UserContent (parent: id, kind, content, postedById, location, isVisible, isDeleted, …)
   ├── PostContent      (1:1 by userContentId; adds: type)
   ├── EventContent     (1:1 by userContentId; adds: startsAt, venue)
   └── CommunityContent (1:1 by userContentId; adds: yearFounded)
```

Each kind has the same vertical slice:

| Layer | File pattern | Purpose |
|------|--------------|---------|
| DB | [prisma/schema.prisma](../apps/backend/prisma/schema.prisma) | Sibling model + `ContentKind` enum value |
| Wire schema | [packages/shared/zod/`<kind>`/`<kind>`.dto.ts](../packages/shared/zod/event/event.dto.ts) | Public / Owner / payload schemas |
| API response types | [packages/shared/zod/apiResponse.dto.ts](../packages/shared/zod/apiResponse.dto.ts) | `Create<Kind>Response`, … |
| Service | [apps/backend/src/services/`<kind>`.service.ts](../apps/backend/src/services/event.service.ts) | CRUD; extends `UserContentService` |
| Mappers | [apps/backend/src/api/mappers/`<kind>`.mappers.ts](../apps/backend/src/api/mappers/event.mappers.ts) | DB row → DTO |
| Route | [apps/backend/src/api/routes/content/`<kind>`.route.ts](../apps/backend/src/api/routes/content/event.route.ts) | REST endpoints under `/content/<kinds>` |
| Frontend store | [features/userContent/stores/userContentStore.ts](../apps/frontend/src/features/userContent/stores/userContentStore.ts) | Per-kind CRUD actions over the unified list |
| Frontend feature | [features/`<kinds>`/components](../apps/frontend/src/features/events/components/) | Cards, dialogs, full views |

---

## Stage 1 — Prisma schema

Add the kind value to the enum and a new sibling model. Both the optional
1:1 back-reference on `UserContent` and the child model are required.

```prisma
// apps/backend/prisma/schema.prisma

enum ContentKind {
  post
  event       // ← new value
}

model UserContent {
  // … existing fields …
  post  PostContent?
  event EventContent?   // ← new 1:1 back-reference
}

model EventContent {
  userContentId String      @id
  userContent   UserContent @relation(fields: [userContentId], references: [id], onDelete: Cascade)
  startsAt      DateTime
  venue         String?

  @@index([startsAt])
}
```

**Rules of thumb:**

- The child PK is `userContentId` — never add a separate `id`. The parent's
  `cuid()` is the canonical ID.
- `onDelete: Cascade` is mandatory; a parent soft-delete eventually becomes a
  hard delete (via cleanup jobs), and orphaned children break the discriminated
  union.
- Only put **kind-specific** columns on the child model. Anything shared
  (`content`, `lat`, `lon`, `country`, `cityName`, `isVisible`, `isDeleted`)
  belongs on `UserContent`. Resist the urge to duplicate.
- Add child-table indexes for fields you will sort/filter by (Event indexes
  `startsAt` because event lists are usually chronological).

Then create the migration. Refer to the [create-migration](../.claude/) skill
for the full data-safety checklist. The migration that introduced this
pattern is named [`20260508012035_user_content_polymorphism`](../apps/backend/prisma/migrations/20260508012035_user_content_polymorphism/).

```bash
pnpm --filter backend prisma migrate dev --name add_event_content
pnpm --filter backend prisma:generate
```

The generator config will produce `EventContentSchema.ts` and
`EventContentScalarFieldEnumSchema.ts` under
[packages/shared/zod/generated/](../packages/shared/zod/generated/) — these
are the auto-generated row-shape schemas. Do not edit them; you will only
reference them indirectly through the hand-written DTOs in Stage 2.

---

## Stage 2 — Wire schemas (Zod DTOs)

Create `packages/shared/zod/<kind>/<kind>.dto.ts`. The shape is fixed: every
kind exports **the same five conceptual schemas** so the rest of the stack
can compose them uniformly.

See [packages/shared/zod/event/event.dto.ts](../packages/shared/zod/event/event.dto.ts).

```ts
import { z } from 'zod'
import {
  BaseUserContentPayloadSchema,
  UserContentMetadataSchema,
  OwnerUserContentOverlaySchema,
  PublicUserContentDetailBaseSchema,
  UserContentQueryShape,
  NearbyContentQueryShape,
} from '../userContent/userContent.dto'

const EVENT_KIND = z.literal('event')
const VENUE_MAX_LENGTH = 120

// 1. Public list-card shape — used by the social feed.
export const PublicEventSchema = UserContentMetadataSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.coerce.date(),
  venue: z.string().nullable(),
})

// 2. Public detail shape — same as Public but the postedBy carries
//    conversation context for non-owners.
export const PublicEventDetailSchema = PublicUserContentDetailBaseSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.coerce.date(),
  venue: z.string().nullable(),
})

// 3. Owner shape — public shape + owner-only fields (isDeleted, isVisible, updatedAt).
export const OwnerEventSchema = PublicEventSchema.merge(OwnerUserContentOverlaySchema)

// 4. Create payload — base write fields + kind-specific writes.
export const CreateEventPayloadSchema = BaseUserContentPayloadSchema.extend({
  startsAt: z.coerce.date(),
  venue: z.string().max(VENUE_MAX_LENGTH).nullable().optional(),
})

// 5. Update payload — Create made `.partial()` plus owner toggles.
export const UpdateEventPayloadSchema = CreateEventPayloadSchema.partial().extend({
  isVisible: z.boolean().optional(),
})

// Route param + query schemas reuse shared shapes.
export const EventParamsSchema      = z.object({ id: z.string().cuid() })
export const EventQuerySchema       = z.object(UserContentQueryShape)
export const NearbyEventQuerySchema = z.object(NearbyContentQueryShape)

// Always export the type aliases — every layer downstream imports them.
export type PublicEvent        = z.infer<typeof PublicEventSchema>
export type PublicEventDetail  = z.infer<typeof PublicEventDetailSchema>
export type OwnerEvent         = z.infer<typeof OwnerEventSchema>
export type CreateEventPayload = z.infer<typeof CreateEventPayloadSchema>
export type UpdateEventPayload = z.infer<typeof UpdateEventPayloadSchema>
```

**Key invariants:**

- `kind` is a `z.literal('<kind>')`, **not** the shared `ContentKindSchema`
  enum. Discriminated unions in Zod require literal discriminators on every
  variant.
- `.extend(...)` and `.merge(...)` are the only way you compose with shared
  shapes — don't redeclare `content`, `postedBy`, etc. by hand. If a shared
  field needs to change, change it on the base schema in
  [userContent.dto.ts](../packages/shared/zod/userContent/userContent.dto.ts).
- Use `z.coerce.date()` for any `DateTime` field so wire-format ISO strings
  parse into `Date` automatically.
- Query schemas reuse `UserContentQueryShape` and `NearbyContentQueryShape`
  via `z.object(<shape>)`. Pagination defaults (`limit`/`offset`) are
  guaranteed by the shape — never re-default them downstream.

Then update [packages/shared/zod/userContent/userContent.dto.ts](../packages/shared/zod/userContent/userContent.dto.ts) to add the new kind to the shared enum:

```ts
export const ContentKindSchema = z.enum(['post', 'event', '<kind>'])
```

This is the discriminator used by `UserContentService.updateBaseScalars`, `ListOptions.kind`, and `cluster.dto.ts` — missing it produces a confusing `Argument of type '"<kind>"' is not assignable to parameter of type '"post" | "event"'` error at the per-kind service.

Then update [packages/shared/zod/userContent/publicContent.dto.ts](../packages/shared/zod/userContent/publicContent.dto.ts)
to include the new kind in the three discriminated unions:

```ts
export const PublicUserContentSchema = z.discriminatedUnion('kind', [
  PublicPostSchema,
  PublicEventSchema,   // ← add
])
export const PublicUserContentDetailSchema = z.discriminatedUnion('kind', [
  PublicPostDetailSchema,
  PublicEventDetailSchema,   // ← add
])
export const OwnerUserContentSchema = z.discriminatedUnion('kind', [
  OwnerPostSchema,
  OwnerEventSchema,   // ← add
])
```

This file exists separately from `userContent.dto.ts` purely to break the
circular import (the per-kind DTOs import the base, so the unions can't live
in the base file).

---

## Stage 3 — API response type aliases

In [packages/shared/zod/apiResponse.dto.ts](../packages/shared/zod/apiResponse.dto.ts) add the typed wrappers. These are
plain TS types over `ApiSuccess<T>` so frontend code can declare response
shapes without re-parsing.

```ts
import type { OwnerEvent, PublicEvent, PublicEventDetail } from '@zod/event/event.dto'

export type EventsResponse            = ApiSuccess<{ events: PublicEvent[] }>
export type MyEventsResponse          = ApiSuccess<{ events: OwnerEvent[] }>
export type EventResponse             = ApiSuccess<{ event: OwnerEvent }>
export type PublicEventDetailResponse = ApiSuccess<{ event: PublicEventDetail }>
export type CreateEventResponse       = ApiSuccess<{ event: OwnerEvent }>
export type UpdateEventResponse       = ApiSuccess<{ event: OwnerEvent }>
export type DeleteEventResponse       = ApiSuccess<{}>
```

The shape mirrors what the routes in Stage 5 return.

---

## Stage 4 — Backend service

Create `apps/backend/src/services/<kind>.service.ts`. The class **must
extend `UserContentService`** so it inherits the base-scalar helpers and
the singleton accessor pattern.

See [apps/backend/src/services/event.service.ts](../apps/backend/src/services/event.service.ts).

```ts
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserContentService, type ListOptions } from './userContent.service'
import type { CreateEventPayload, UpdateEventPayload } from '@zod/event/event.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'

const eventWithMetadataInclude = {
  event: true,
  postedBy: { include: { profileImages: true } },
} as const

const eventWithMetadataAndContextInclude = (viewerProfileId: string) =>
  ({
    event: true,
    postedBy: {
      include: {
        profileImages: true,
        ...conversationContextInclude(viewerProfileId),
      },
    },
  }) as const

export type EventWithMetadata = Prisma.UserContentGetPayload<{
  include: typeof eventWithMetadataInclude
}>
export type EventWithMetadataAndContext = Prisma.UserContentGetPayload<{
  include: ReturnType<typeof eventWithMetadataAndContextInclude>
}>

export class EventService extends UserContentService {
  private static eventInstance: EventService
  static getInstance(): EventService {
    if (!EventService.eventInstance) {
      EventService.eventInstance = new EventService()
    }
    return EventService.eventInstance
  }

  async create(profileId: string, data: CreateEventPayload): Promise<EventWithMetadata> {
    return prisma.userContent.create({
      data: {
        ...this.baseCreateData(data),       // ← shared fields, `?? null`-coerced
        kind: 'event',
        postedById: profileId,
        event: { create: { startsAt: data.startsAt, venue: data.venue ?? null } },
      },
      include: eventWithMetadataInclude,
    })
  }

  async update(id: string, profileId: string, data: UpdateEventPayload) {
    const { startsAt, venue, ...baseFields } = data
    return prisma.$transaction(async (tx) => {
      const ok = await this.updateBaseScalars(tx, id, profileId, 'event', baseFields)
      if (!ok) return null
      await tx.eventContent.update({
        where: { userContentId: id },
        data: { startsAt, venue },
      })
      return tx.userContent.findFirst({ where: { id }, include: eventWithMetadataInclude })
    })
  }

  async findByIdHydrated(id: string, viewerProfileId: string) { /* … */ }
  async findByProfileIdHydrated(profileId: string, viewerProfileId: string, opts: ListOptions) { /* … */ }
}
```

**Patterns to follow:**

- **`baseCreateData(data)`** comes from the parent class. It returns the
  scalar slice of `UserContent` with all nullable location fields
  `?? null`-coerced. Always spread it; don't re-coerce yourself.
- **`updateBaseScalars(tx, id, profileId, kind, scalars)`** atomically
  updates the parent row gated on `postedById`, `kind`, and `isDeleted`.
  Always run it **inside a `$transaction`** alongside the child-table
  update so partial writes are impossible. If it returns `false`,
  abort the tx by returning `null` from the outer callback.
- **`softDelete`** and **`setVisibility`** come from the parent class —
  do not reimplement on the child service.
- Hydrate the per-kind child via a typed `include` object captured in a
  `const`; derive the row type via `Prisma.UserContentGetPayload<…>` so
  the mappers in Stage 5 stay type-safe.
- Use **two** include objects when non-owners need extra context: one
  with `conversationContextInclude(viewerProfileId)` mixed into the
  `postedBy.include`, one without (for owner reads).

---

## Stage 5 — Backend mappers (DB row → DTO)

Create `apps/backend/src/api/mappers/<kind>.mappers.ts`. One mapper per
public shape — three functions total.

See [apps/backend/src/api/mappers/event.mappers.ts](../apps/backend/src/api/mappers/event.mappers.ts).

```ts
import {
  OwnerEventSchema,
  type PublicEvent,
  type PublicEventDetail,
  type OwnerEvent,
} from '@zod/event/event.dto'
import type { EventWithMetadata, EventWithMetadataAndContext } from '@/services/event.service'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { extractLocation } from './location.mappers'

export function mapDbEventToPublic(row: EventWithMetadata, viewerProfileId: string): PublicEvent {
  return {
    id: row.id,
    kind: 'event',
    startsAt: row.event!.startsAt,
    venue: row.event!.venue,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
  }
}

export function mapDbEventToDetail(row: EventWithMetadataAndContext, viewerProfileId: string): PublicEventDetail { /* … */ }

export function mapDbEventToOwner(row: EventWithMetadata): OwnerEvent {
  return OwnerEventSchema.parse({
    /* … */
    isDeleted: row.isDeleted,
    isVisible: row.isVisible,
    isOwn: true,
  })
}
```

**Conventions:**

- The owner mapper is the only one that runs the Zod schema's `.parse(...)`;
  the others trust the row shape because they aren't an API trust boundary
  for the owner's own flags. Following this convention everywhere keeps the
  hot read path cheap while still validating the write-back response.
- `row.event!` — the non-null assertion is sound because the service always
  hydrates `event: true` for this kind. If you split off a thinner read that
  omits the child, write a separate mapper rather than weakening this one.
- `extractLocation(row) ?? undefined`: location can be absent (some posts
  have no place); convert `null` to `undefined` so the optional DTO field is
  unset rather than `null`.

Then add a dispatch arm to [apps/backend/src/api/mappers/userContent.mappers.ts](../apps/backend/src/api/mappers/userContent.mappers.ts). Use an exhaustive `switch` — TypeScript will refuse to compile if a kind is unhandled, which is the entire point of the discriminator:

```ts
import { mapDbEventToOwner } from './event.mappers'

export function mapOwnerUserContent(row: OwnerHydratedRow): OwnerUserContent {
  switch (row.kind) {
    case 'post':
      return mapDbPostToOwner(row)
    case 'event':
      return mapDbEventToOwner(row)
  }
}
```

A two-case `switch` may look heavier than a ternary, but it's the form that scales — when a third kind lands, the type checker rejects the unhandled case at compile time instead of letting it silently fall through to the wrong mapper.

---

## Stage 6 — Backend route

Create `apps/backend/src/api/routes/content/<kind>.route.ts`. It exports a
Fastify plugin and is registered under `/api/content/<kinds>` (plural).

See [apps/backend/src/api/routes/content/event.route.ts](../apps/backend/src/api/routes/content/event.route.ts).

Required endpoints (mirror the existing per-kind surface):

| Method | Path | Returns | Notes |
|--------|------|---------|------|
| `POST` | `/` | `Create<Kind>Response` | Rate-limited; calls `svc.create` then `cluster.evictAll()` |
| `GET` | `/:id` | `<Kind>Response` (owner) or `PublicXDetailResponse` | Branches on ownership |
| `PATCH` | `/:id` | `Update<Kind>Response` | Same pattern as POST |
| `DELETE` | `/:id` | `Delete<Kind>Response` | Calls inherited `svc.softDelete` |
| `GET` | `/me` | `My<Kind>sResponse` | Owner list; uses `findByProfileIdHydrated` with `includeInvisible: true` |
| `GET` | `/profile/:profileId` | Public list (or owner if viewing self) | Visibility decided by viewer == owner |

Skeleton:

```ts
const eventRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = EventService.getInstance()
  const cluster = ClusterService.getInstance()

  fastify.post('/', {
    onRequest: [fastify.authenticate],
    config: rateLimitConfig(fastify, '1 minute', 10),
  }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 401, 'Profile required')
    const data = validateBody<CreateEventPayload>(CreateEventPayloadSchema, req, reply)
    if (!data) return
    const created = await svc.create(profileId, data)
    cluster.evictAll()
    return reply.code(201).send({ success: true, event: mapDbEventToOwner(created) })
  })

  // … GET /:id, PATCH /:id, DELETE /:id, GET /me, GET /profile/:profileId …
}
export default eventRoutes
```

**Mandatory glue:**

- `validateBody(...)` short-circuits on parse failure — return early if it
  yields `undefined`.
- Every write that creates or mutates a row's `lat`/`lon` MUST call
  `cluster.evictAll()` so the supercluster index is rebuilt on the next
  bounds query.
- Owner reads call `mapDbXToOwner`, non-owner reads call `mapDbXToDetail`.
  Pick by `row.postedById === viewerProfileId`.
- Use the shared `PaginationSchema.parse(req.query)` for list endpoints —
  do not invent kind-specific pagination.

Register the plugin in [apps/backend/src/api/index.ts](../apps/backend/src/api/index.ts):

```ts
import eventRoutes from './routes/content/event.route'

fastify.register(eventRoutes, { prefix: '/content/events' })
```

Then add the dispatch arm to the generic per-id read in [apps/backend/src/api/routes/content.route.ts](../apps/backend/src/api/routes/content.route.ts) — same exhaustive `switch` pattern as the mapper dispatch:

```ts
switch (metadata.kind) {
  case 'post': {
    const hydrated = await PostService.getInstance().findByIdHydrated(id, viewerProfileId)
    if (!hydrated) return sendError(reply, 404, 'Content not found')
    const item = isOwner
      ? mapDbPostToOwner(hydrated)
      : mapDbPostToDetail(hydrated, viewerProfileId)
    return reply.code(200).send({ success: true, item })
  }
  case 'event': {
    const hydrated = await EventService.getInstance().findByIdHydrated(id, viewerProfileId)
    if (!hydrated) return sendError(reply, 404, 'Content not found')
    const item = isOwner
      ? mapDbEventToOwner(hydrated)
      : mapDbEventToDetail(hydrated, viewerProfileId)
    return reply.code(200).send({ success: true, item })
  }
}
```

---

## Stage 7 — Frontend store actions

Extend [features/userContent/stores/userContentStore.ts](../apps/frontend/src/features/userContent/stores/userContentStore.ts) with kind-prefixed CRUD
actions that mirror their writes into the unified `myContent` array.

```ts
async createEvent(payload: CreateEventPayload): Promise<StoreEventResponse> {
  try {
    const res = await safeApiCall(() => api.post<CreateEventResponse>('/content/events', payload))
    const event = OwnerEventSchema.parse(res.data.event)
    this.upsert(event)
    return storeSuccess({ event })
  } catch (error: any) {
    return storeError(error, 'Failed to create event')
  }
},
async updateEvent(id, payload) { /* … */ },
async deleteEvent(id) { /* … */ },
async fetchPublicEvent(id, signal?) { /* … */ },
```

**Pattern essentials:**

- Always `.parse(res.data.event)` with the matching DTO schema — the
  network is a trust boundary even for our own backend, and `kind` narrowing
  on the unified `OwnerUserContent` union only works after a successful
  parse.
- `this.upsert(item)` / `this.remove(id)` keep the polymorphic `myContent`
  list in sync without needing a refetch. Use them on every successful
  mutation.
- For public detail fetches use an `AbortController` so navigating away
  doesn't leave a stale parse pending. The post action shows the pattern.
- Convenience getters: `myEvents: state => state.myContent.filter(c => c.kind === 'event')`.

Then build the feature components under [features/`<kinds>`/components/](../apps/frontend/src/features/events/components/). The Event feature exposes:

| Component | Purpose |
|-----------|---------|
| [`EventCard.vue`](../apps/frontend/src/features/events/components/EventCard.vue) | Feed-row teaser |
| [`EventFullView.vue`](../apps/frontend/src/features/events/components/EventFullView.vue) | Public detail page |
| [`EditEventDialog.vue`](../apps/frontend/src/features/events/components/EditEventDialog.vue) | Create/update form bound to `CreateEventPayloadSchema` |
| [`EventMapPopup.vue`](../apps/frontend/src/features/events/components/EventMapPopup.vue) | Marker popup on the browse map |
| [`eventMapIcon.ts`](../apps/frontend/src/features/events/components/eventMapIcon.ts) | Map-icon factory |

---

## Stage 8 — Polymorphic dispatch checklist

A new kind only "exists" once every polymorphic dispatch site has learned
about it. Skipping any one of these silently drops the new kind from a
specific view, and the type system will **not** catch it because the
generic helpers fall through to the existing kinds.

Verify each:

- [ ] **DB**
  - [ ] `ContentKind` enum has the new value
  - [ ] `UserContent` has the new `<kind> <Kind>Content?` back-reference
  - [ ] Sibling model exists with `userContentId` PK and `onDelete: Cascade`
  - [ ] Prisma migration committed; `prisma:generate` re-run
- [ ] **Zod**
  - [ ] `ContentKindSchema` in [userContent.dto.ts](../packages/shared/zod/userContent/userContent.dto.ts) includes the new kind
  - [ ] `Public<Kind>Schema`, `Public<Kind>DetailSchema`, `Owner<Kind>Schema`, `Create<Kind>PayloadSchema`, `Update<Kind>PayloadSchema` exported from `<kind>.dto.ts`
  - [ ] All three discriminated unions in [publicContent.dto.ts](../packages/shared/zod/userContent/publicContent.dto.ts) include the new variant
  - [ ] Response-type aliases added in [apiResponse.dto.ts](../packages/shared/zod/apiResponse.dto.ts)
- [ ] **Backend**
  - [ ] `<Kind>Service extends UserContentService` with `create`, `update`, `findByIdHydrated`, `findByProfileIdHydrated`
  - [ ] `ownerHydratedInclude` in [userContent.service.ts](../apps/backend/src/services/userContent.service.ts) hydrates the new kind so the unified `/content/me` loads it
  - [ ] `<kind>.mappers.ts` exports `mapDbXToPublic`, `mapDbXToDetail`, `mapDbXToOwner`
  - [ ] `mapOwnerUserContent` in [userContent.mappers.ts](../apps/backend/src/api/mappers/userContent.mappers.ts) dispatches the new kind (prefer `switch` over ternary for exhaustiveness)
  - [ ] Route plugin registered under `/content/<kinds>` in [api/index.ts](../apps/backend/src/api/index.ts)
  - [ ] Generic `GET /content/:id` in [content.route.ts](../apps/backend/src/api/routes/content.route.ts) branches on the new kind
  - [ ] No work needed in [cluster.service.ts](../apps/backend/src/services/cluster.service.ts): `PointProperties.kind` is typed `UserContentKind` and the props builder uses `props.kind !== 'profile'` — both pick up new kinds automatically once `USER_CONTENT_KINDS` is updated
  - [ ] [content.route.spec.ts](../apps/backend/src/__tests__/routes/content.route.spec.ts) mocks the new `<Kind>Service` — otherwise the test file errors with "Class extends value is not a constructor" because `<Kind>Service extends UserContentService` resolves through the unmocked module
- [ ] **Shared**
  - [ ] `USER_CONTENT_KINDS` in [packages/shared/maps.ts](../packages/shared/maps.ts) lists the new kind if it should appear in the map layer control
- [ ] **Frontend**
  - [ ] Store has `create<Kind>`, `update<Kind>`, `delete<Kind>`, `fetchPublic<Kind>`
  - [ ] `my<Kind>s` getter on the store (if convenient)
  - [ ] [ContentCard.vue](../apps/frontend/src/features/userContent/components/ContentCard.vue) — replace any `v-else` with an explicit `v-else-if="item.kind === '<kind>'"` and add the new branch; the `v-else` form silently miscasts the discriminated union
  - [ ] Feed/map UI branches on `kind === '<kind>'` for icon + popup component
  - [ ] Browse view model handles the `kind === '<kind>'` case in `useBrowseViewModel.ts`
  - [ ] Update any frontend store tests that assert the comma-joined `kinds` query param — e.g. [findProfileStore.spec.ts](../apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts) expects all `USER_CONTENT_KINDS` in the default param
- [ ] **i18n**
  - [ ] Strings added to [packages/shared/i18n/en.json](../packages/shared/i18n/en.json) — see the existing `events.*` keys for the namespace pattern. Use the `add-i18n-key` skill.
- [ ] **Tests**
  - [ ] `apps/backend/src/__tests__/api/<kind>.mappers.spec.ts`
  - [ ] `apps/backend/src/__tests__/routes/content/<kind>.route.spec.ts`
  - [ ] Update [userContent.mappers.spec.ts](../apps/backend/src/__tests__/api/userContent.mappers.spec.ts) to cover the new dispatch arm

---

## Verification

After the wiring is done, run the targeted test suites and a focused
type-check. The full CI suite (`pnpm run ci:test`) only needs to pass
when finalizing the PR — see [CLAUDE.md](../CLAUDE.md) for the workflow.

```bash
pnpm --filter backend test -- <kind>
pnpm --filter frontend test -- <kind>
pnpm type-check
```

A few smoke checks against the running dev server confirm the new kind is
end-to-end live:

```bash
# Create
curl -sS -X POST https://localhost:3000/api/content/<kinds> \
  -H 'content-type: application/json' --cookie "<auth>" \
  -d '{"content":"hello","<kindField>":"…"}'

# Unified me list — new item should appear with kind: "<kind>"
curl -sS https://localhost:3000/api/content/me --cookie "<auth>"

# Generic detail fetch — must dispatch to the new mapper, not 500.
curl -sS https://localhost:3000/api/content/<id> --cookie "<auth>"
```

---

## Anti-patterns to avoid

- **Duplicating shared fields on the child model.** If `lat`, `lon`,
  `content`, etc. ever appear on `EventContent`, that is a bug. They live on
  `UserContent`.
- **Returning a child-table row by itself.** Always fetch the parent with
  `include: { <kind>: true, postedBy: { include: { profileImages: true } } }`.
  The mappers expect the hydrated parent shape.
- **Parsing the unified `OwnerUserContentSchema` before dispatching.** That
  works, but per-kind `OwnerEventSchema.parse(...)` is cheaper and gives
  clearer error messages on mismatch.
- **Forgetting `cluster.evictAll()` after a write that may change location.**
  The map will show stale clusters until the in-memory index expires.
- **Adding a fallback for legacy data when changing a child-table column.**
  Migrate the data; see [CLAUDE.md § Data integrity](../CLAUDE.md#data-integrity).
- **Inventing per-kind pagination, visibility, or soft-delete logic.** The
  parent service already implements these. Reuse them.
- **Re-declaring the point-kind union inline.** If you need the
  `'profile' | 'post' | 'event' | …` union (e.g. on a typed map feature
  property), import `UserContentKind` from
  [`@shared/maps`](../packages/shared/maps.ts). The literal-union form is a
  maintenance trap — adding a kind requires editing every site that
  re-declared it. Same for `ContentKind` (the user-content row kinds, no
  `'profile'`) from
  [`@shared/zod/userContent/userContent.dto`](../packages/shared/zod/userContent/userContent.dto.ts).
- **Inclusion-by-enumeration when the intent is exclusion.** If the
  conceptual rule is "everything that isn't a profile" (or similar),
  write `kind !== 'profile'` rather than `kind === 'post' || kind ===
  'event' || …`. The negation form survives new kinds without code edits.

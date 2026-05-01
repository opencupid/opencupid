# Adding a new UserContent type

User-generated content types (Post, Event, …) share an abstraction that handles wire shapes, CRUD endpoints, mappers, and frontend store actions. Each new type is assembled from the shared layers plus a small set of type-specific files.

Worked example throughout this guide: an **Event** type with the same base fields as a Post (content, location, visibility, owner) plus an `eventDate` attribute.

## The shared layers

- **Shared DTO field sets** — [packages/shared/zod/userContent/userContent.dto.ts](../../packages/shared/zod/userContent/userContent.dto.ts) exposes Zod field picks (`userContentPublicFields`, `userContentOwnerFields`) and base payload shapes (`CreateUserContentPayloadShape`, `UpdateUserContentPayloadShape`, `UserContentQueryShape`, `NearbyQueryShape`) for composition into your type's DTOs.
- **Backend mappers** — [apps/backend/src/api/mappers/userContent.mappers.ts](../../apps/backend/src/api/mappers/userContent.mappers.ts) provides `projectPublicUserContent`, `projectDetailUserContent`, `projectOwnerUserContent`, `projectUserContentSummary`. Each one returns the shared projection; your type-specific mapper overlays the extra fields.
- **Backend service helpers** — [apps/backend/src/services/userContent.helpers.ts](../../apps/backend/src/services/userContent.helpers.ts) provides where-clause shorthand (`visible`, `notDeleted`, `ownedBy`, `visibilityFilter`), pagination defaults (`paginate`), the soft-delete payload (`softDeleteData`), the bounding-box math (`boundingBoxWhere`, `boundsWhere`), and the recent-cutoff helper (`recentSince`).
- **Backend service interface** — [apps/backend/src/services/userContent.service.ts](../../apps/backend/src/services/userContent.service.ts) defines `UserContentService<TRow, TDetailRow, TBoundsRow, TCreatePayload, TUpdatePayload>` with optional `findNearby` / `findRecent` / `findInBounds` capabilities. Your concrete service class implements it.
- **Backend route factory** — [apps/backend/src/api/routes/userContent.route-factory.ts](../../apps/backend/src/api/routes/userContent.route-factory.ts) exposes `makeUserContentRoutes(config)`, returning a Fastify plugin with `POST /`, `GET /:id` (owner/public branch), `PATCH /:id`, `DELETE /:id`, `GET /`, `GET /me`, `GET /profile/:profileId`, plus optional `GET /nearby` / `/recent` / `/bounds`. Your route module wires service + mappers + schemas + `wire: { singular, plural }`.
- **Frontend Pinia composable** — [apps/frontend/src/store/composables/useUserContentActions.ts](../../apps/frontend/src/store/composables/useUserContentActions.ts) provides the CRUD + fetch action set parameterized by config; literal-typed `wire.singular` / `wire.plural` propagate into action return types so each store yields its own envelope key.

The reference implementation is the Post type. Read [postStore.ts](../../apps/frontend/src/features/posts/stores/postStore.ts), [post.route.ts](../../apps/backend/src/api/routes/post.route.ts), [post.service.ts](../../apps/backend/src/services/post.service.ts), [post.mappers.ts](../../apps/backend/src/api/mappers/post.mappers.ts), and [post.dto.ts](../../packages/shared/zod/post/post.dto.ts) before starting — your Event type mirrors each one step-by-step.

## Step 1 — Add the Prisma model

In [apps/backend/prisma/schema.prisma](../../apps/backend/prisma/schema.prisma), add a model that mirrors the `Post` model's UserContent fields and adds your type-specific attribute(s):

```prisma
model Event {
  id        String   @id @default(cuid())
  content   String
  eventDate DateTime
  isDeleted Boolean  @default(false)
  isVisible Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Location (optional, pre-filled from profile)
  country  String?
  cityName String?
  lat      Float?
  lon      Float?

  // Relations
  postedBy   Profile @relation(fields: [postedById], references: [id], onDelete: Cascade)
  postedById String

  @@index([postedById])
  @@index([eventDate])
  @@index([createdAt])
  @@index([isVisible, isDeleted])
  @@index([lat, lon])
}
```

Add a `events Event[]` back-relation on the `Profile` model.

Then follow [docs/howto/migrations.md](./migrations.md) (or [create-migration](../../docs/howto/migrations.md) if available) to author the migration:

```bash
pnpm --filter backend prisma:migrate -- --name add_event_model
pnpm --filter backend prisma:generate
```

After `prisma:generate`, the auto-emitted Zod schemas (e.g. `EventSchema`) become available in [packages/shared/zod/generated/index.ts](../../packages/shared/zod/generated/index.ts). The shared `userContent.dto.ts` already picks fields off `PostSchema` for the _base_ wire shape — you'll re-pick them off `EventSchema` for your concrete type below (the same composition pattern Post uses).

> **Why the field set is duplicated per model rather than abstracted into a single source schema:** the generated Zod is per-Prisma-model. There's no shared schema you can extend. Instead, the shared `userContentPublicFields` / `userContentOwnerFields` constants are reused as the _pick keyset_, applied to each model's own generated schema. This keeps each wire shape sharply tied to its DB model while still guaranteeing every UserContent type exposes the same base columns.

`★ Insight ─────────────────────────────────────`
The `postedById: String` field name is load-bearing across the abstraction:
the route factory's `TRow extends { postedById: string }` constraint, the
shared mappers' `DbUserContentRow` type, and the route handlers' owner
detection (`raw.postedById === viewerProfileId`) all depend on it. Don't
rename it on the new model.
`─────────────────────────────────────────────────`

## Step 2 — Author the type-specific DTO

Create `packages/shared/zod/event/event.dto.ts`. Use [packages/shared/zod/post/post.dto.ts](../../packages/shared/zod/post/post.dto.ts) as your template — every export has a direct counterpart.

```ts
import { z } from 'zod'
import { EventSchema } from '../generated'
import { ProfileSummarySchema } from '../profile/profile.dto'
import { ConversationContextSchema } from '../interaction/interactionContext.dto'
import { LocationSchema } from '@zod/dto/location.dto'
import {
  userContentPublicFields,
  userContentOwnerFields,
  CreateUserContentPayloadShape,
  UpdateUserContentPayloadShape,
  UserContentQueryShape,
  NearbyQueryShape,
} from '../userContent/userContent.dto'

const publicEventFields = {
  ...userContentPublicFields,
  eventDate: true,
} as const

const ownerEventFields = {
  ...userContentOwnerFields,
  eventDate: true,
} as const

export const PublicEventSchema = EventSchema.pick(publicEventFields).extend({
  isOwn: z.boolean().optional(),
})
export type PublicEvent = z.infer<typeof PublicEventSchema>

export const OwnerEventSchema = EventSchema.pick(ownerEventFields).extend({
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  isOwn: z.boolean().default(true),
})
export type OwnerEvent = z.infer<typeof OwnerEventSchema>

export const PublicEventWithProfileSchema = PublicEventSchema.extend({
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  isOwn: z.boolean().default(false),
})
export type PublicEventWithProfile = z.infer<typeof PublicEventWithProfileSchema>

export const PublicEventDetailSchema = PublicEventWithProfileSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})
export type PublicEventDetail = z.infer<typeof PublicEventDetailSchema>

export const EventSummarySchema = z.object({
  id: z.string(),
  eventDate: z.coerce.date(),
  content: z.string(),
  location: LocationSchema,
  postedBy: ProfileSummarySchema,
})
export type EventSummary = z.infer<typeof EventSummarySchema>

export const CreateEventPayloadSchema = z.object({
  ...CreateUserContentPayloadShape,
  eventDate: z.coerce.date(),
})
export type CreateEventPayload = z.infer<typeof CreateEventPayloadSchema>

export const UpdateEventPayloadSchema = z.object({
  ...UpdateUserContentPayloadShape,
  eventDate: z.coerce.date().optional(),
})
export type UpdateEventPayload = z.infer<typeof UpdateEventPayloadSchema>

export const EventParamsSchema = z.object({
  id: z.string().cuid(),
})

export const EventQuerySchema = z.object({
  ...UserContentQueryShape,
  // No discriminator field; if you add one (e.g. eventCategory), put it here as `.optional()`
})
export type EventQuery = z.infer<typeof EventQuerySchema>
export type EventQueryInput = z.input<typeof EventQuerySchema>

export const NearbyEventQuerySchema = EventQuerySchema.extend(NearbyQueryShape)
export type NearbyEventQuery = z.infer<typeof NearbyEventQuerySchema>
export type NearbyEventQueryInput = z.input<typeof NearbyEventQuerySchema>
```

`★ Insight ─────────────────────────────────────`
A few naming and shape conventions that aren't enforced by the type system
but match the Post implementation and the mapper expectations:

1. **`OwnerEventSchema` includes `isVisible`** — the frontend composable's
   `upsertItem` uses `'isVisible' in item` to detect owner-shape and force
   `isOwn: true` on the public list copy. Removing `isVisible` from the owner
   schema breaks that detection.
2. **`isOwn: z.boolean().default(true)` on owner / `default(false)` on
   public-with-profile** — the route handlers don't set `isOwn` themselves;
   the schema does, via Zod defaults during parse.
3. **The `nearbyQuery` schema omits the discriminator if you don't have one.**
   Post has `type` because `PostType` is an enum discriminator. Your Event
   type may not need one — leave the field out of `EventQuerySchema`.
   `─────────────────────────────────────────────────`

## Step 3 — Add the backend service

Create `apps/backend/src/services/event.service.ts`. Mirror [post.service.ts](../../apps/backend/src/services/post.service.ts) and adjust. Reuse the where-clause helpers in [userContent.helpers.ts](../../apps/backend/src/services/userContent.helpers.ts) — they centralize the visibility predicates, owner-check, soft-delete payload, bounding-box math, and pagination defaults so each method body stays a single, readable Prisma call:

```ts
import { Prisma } from '@prisma/client'
import type { CreateEventPayload, UpdateEventPayload } from '@zod/event/event.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { prisma } from '@/lib/prisma'
import type { UserContentService, ListOptions, BoundsBox } from './userContent.service'
import {
  boundingBoxWhere,
  boundsWhere,
  notDeleted,
  ownedBy,
  paginate,
  softDeleteData,
  visibilityFilter,
  visible,
} from './userContent.helpers'

const postedByInclude = {
  include: {
    postedBy: { include: { profileImages: true } },
  },
} satisfies Prisma.EventFindFirstArgs

const postedByWithConversationInclude = (viewerProfileId: string) =>
  ({
    include: {
      postedBy: {
        include: {
          profileImages: true,
          ...conversationContextInclude(viewerProfileId),
        },
      },
    },
  }) satisfies Prisma.EventFindFirstArgs

export type EventWithProfile = Prisma.EventGetPayload<typeof postedByInclude>
export type EventWithProfileAndContext = Prisma.EventGetPayload<
  ReturnType<typeof postedByWithConversationInclude>
>

export class EventService implements UserContentService<
  EventWithProfile,
  EventWithProfileAndContext,
  EventWithProfile,
  CreateEventPayload,
  UpdateEventPayload
> {
  private static instance: EventService
  private constructor() {}
  static getInstance(): EventService {
    if (!EventService.instance) EventService.instance = new EventService()
    return EventService.instance
  }

  async create(profileId: string, data: CreateEventPayload) {
    return prisma.event.create({
      data: {
        content: data.content,
        eventDate: data.eventDate,
        postedById: profileId,
        country: data.country ?? null,
        cityName: data.cityName ?? null,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
      },
      ...postedByInclude,
    })
  }

  async update(id: string, profileId: string, data: UpdateEventPayload) {
    const owned = await prisma.event.findFirst({ where: ownedBy(id, profileId) })
    if (!owned) return null
    return prisma.event.update({
      where: { id },
      data: {
        content: data.content,
        eventDate: data.eventDate,
        isVisible: data.isVisible,
        country: data.country,
        cityName: data.cityName,
        lat: data.lat,
        lon: data.lon,
        updatedAt: new Date(),
      },
      ...postedByInclude,
    })
  }

  async delete(id: string, profileId: string) {
    const owned = await prisma.event.findFirst({ where: ownedBy(id, profileId) })
    if (!owned) return null
    return prisma.event.update({ where: { id }, data: softDeleteData() })
  }

  async findByIdWithContext(id: string, viewerProfileId: string) {
    const event = await prisma.event.findFirst({
      where: { id, ...notDeleted },
      ...postedByWithConversationInclude(viewerProfileId),
    })
    if (event && event.postedById !== viewerProfileId && !event.isVisible) return null
    return event
  }

  async findAll(options: ListOptions = {}) {
    return prisma.event.findMany({
      where: { ...visible },
      ...postedByInclude,
      orderBy: { eventDate: 'asc' },
      ...paginate(options),
    })
  }

  async findByProfileId(
    profileId: string,
    options: ListOptions & { includeInvisible?: boolean } = {}
  ) {
    return prisma.event.findMany({
      where: {
        postedById: profileId,
        ...notDeleted,
        ...visibilityFilter(options.includeInvisible ?? false),
      },
      ...postedByInclude,
      orderBy: { eventDate: 'asc' },
      ...paginate(options),
    })
  }

  // Optional capabilities — omit any method here and the route factory
  // will skip the corresponding endpoint automatically.

  async findNearby(lat: number, lon: number, radius: number, options: ListOptions = {}) {
    return prisma.event.findMany({
      where: { ...visible, ...boundingBoxWhere(lat, lon, radius) },
      ...postedByInclude,
      orderBy: { eventDate: 'asc' },
      ...paginate(options),
    })
  }

  async findInBounds(bounds: BoundsBox) {
    return prisma.event.findMany({
      where: { ...visible, ...boundsWhere(bounds) },
      ...postedByInclude,
      orderBy: { eventDate: 'asc' },
      take: 100,
    })
  }
}
```

`★ Insight ─────────────────────────────────────`
The optional-capability pattern — `findNearby?`, `findRecent?`,
`findInBounds?` on the interface — means **defining a method on the service
opts the type into the corresponding HTTP endpoint**. The route factory
checks `!!service.findNearby` (line 112 of `userContent.route-factory.ts`)
to decide whether to register `GET /nearby`. To opt out for Event, just
omit the method. To opt in but disable the route, pass
`features: { nearby: false }` in the route config.
`─────────────────────────────────────────────────`

## Step 4 — Add the backend mappers

Create `apps/backend/src/api/mappers/event.mappers.ts`. Each mapper is a one-line overlay on the shared projection:

```ts
import {
  OwnerEventSchema,
  type PublicEventWithProfile,
  type PublicEventDetail,
  type OwnerEvent,
  type EventSummary,
} from '@zod/event/event.dto'
import type { EventWithProfile, EventWithProfileAndContext } from '@/services/event.service'
import {
  projectPublicUserContent,
  projectDetailUserContent,
  projectOwnerUserContent,
  projectUserContentSummary,
  type DbUserContentForSummary,
} from './userContent.mappers'

export function mapDbEventToPublic(
  event: EventWithProfile,
  viewerProfileId: string
): PublicEventWithProfile {
  return {
    ...projectPublicUserContent(event, viewerProfileId),
    eventDate: event.eventDate,
  }
}

export function mapDbEventToDetail(
  event: EventWithProfileAndContext,
  viewerProfileId: string
): PublicEventDetail {
  return {
    ...projectDetailUserContent(event, viewerProfileId),
    eventDate: event.eventDate,
  }
}

export function mapDbEventToOwner(
  event: EventWithProfile | EventWithProfileAndContext
): OwnerEvent {
  return OwnerEventSchema.parse({
    ...projectOwnerUserContent(event),
    eventDate: event.eventDate,
  })
}

export type DbEventForSummary = DbUserContentForSummary & {
  eventDate: Date
}

export function mapEventSummary(event: DbEventForSummary): EventSummary {
  return {
    ...projectUserContentSummary(event),
    eventDate: event.eventDate,
  }
}
```

`★ Insight ─────────────────────────────────────`
Notice the asymmetry between `mapDbEventToPublic` / `mapDbEventToDetail`
(which spread the projection then _attach_ a field) and `mapDbEventToOwner`
(which spreads the projection then runs `OwnerEventSchema.parse(...)`).
That's because owner is the only mapper that has to strip detail-row
overflow — the route's `GET /:id` handler hands the wider
`EventWithProfileAndContext` row to the owner mapper when the viewer is the
owner, and the Zod parse drops `conversationAsA`/`conversationAsB` from
`postedBy`. Public/detail mappers receive narrower rows, so no parse needed.
`─────────────────────────────────────────────────`

## Step 5 — Wire up the route module

Create `apps/backend/src/api/routes/event.route.ts` — the smallest file in the chain:

```ts
import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'
import { EventService } from '@/services/event.service'
import {
  CreateEventPayloadSchema,
  UpdateEventPayloadSchema,
  EventParamsSchema,
  EventQuerySchema,
  NearbyEventQuerySchema,
} from '@zod/event/event.dto'
import {
  mapDbEventToOwner,
  mapDbEventToPublic,
  mapDbEventToDetail,
  mapEventSummary,
} from '../mappers/event.mappers'
import { makeUserContentRoutes } from './userContent.route-factory'

const ProfileParamsSchema = z.object({ profileId: z.string().cuid() })

const eventRoutes: FastifyPluginAsync = async (fastify, opts) => {
  const inner = makeUserContentRoutes({
    service: EventService.getInstance(),
    mappers: {
      toOwner: mapDbEventToOwner,
      toPublic: mapDbEventToPublic,
      toDetail: mapDbEventToDetail,
      toSummary: mapEventSummary,
    },
    schemas: {
      create: CreateEventPayloadSchema,
      update: UpdateEventPayloadSchema,
      params: EventParamsSchema,
      profileParams: ProfileParamsSchema,
      listQuery: EventQuerySchema,
      nearbyQuery: NearbyEventQuerySchema,
    },
    wire: { singular: 'event', plural: 'events' },
    rateLimits: {
      create: { window: '1 minute', max: 10 },
      mutate: { window: '1 minute', max: 5 },
    },
    features: { nearby: true, recent: false, bounds: true, publicProfileList: true },
    // No cluster cache for events; omit `onMutation` if there's nothing to evict.
  })
  await inner(fastify, opts)
}

export default eventRoutes
```

Register it in [apps/backend/src/api/index.ts](../../apps/backend/src/api/index.ts):

```ts
import eventRoutes from './routes/event.route'
// ...
fastify.register(eventRoutes, { prefix: '/events' })
```

`★ Insight ─────────────────────────────────────`
The wrapping `FastifyPluginAsync` around `makeUserContentRoutes(...)` is not
ceremonial — it defers `EventService.getInstance()` to plugin-registration
time, so route specs that mock the service before route registration still
work. Calling `getInstance()` at module-load time would freeze the live
singleton into the route module before the test setup can intercept it.
This pattern is the same one used in [post.route.ts](../../apps/backend/src/api/routes/post.route.ts).
`─────────────────────────────────────────────────`

## Step 6 — Add a drift-canary test

Mirror [`apps/backend/src/__tests__/post-dto-types.test.ts`](../../apps/backend/src/__tests__/post-dto-types.test.ts) at `apps/backend/src/__tests__/event-dto-types.test.ts`. This pins your wire keysets at type-check time, so if anyone adds or removes a wire field they'll see a structural-test failure forcing them to update the canary explicitly:

```ts
import { describe, it, expectTypeOf } from 'vitest'
import type {
  PublicEvent,
  PublicEventWithProfile,
  OwnerEvent,
  PublicEventDetail,
  EventSummary,
} from '@zod/event/event.dto'

describe('event.dto type contracts', () => {
  it('PublicEvent keyset', () => {
    expectTypeOf<keyof PublicEvent>().toEqualTypeOf<
      | 'id'
      | 'content'
      | 'eventDate'
      | 'createdAt'
      | 'updatedAt'
      | 'postedById'
      | 'country'
      | 'cityName'
      | 'lat'
      | 'lon'
      | 'isOwn'
    >()
  })

  it('PublicEventWithProfile keyset', () => {
    expectTypeOf<keyof PublicEventWithProfile>().toEqualTypeOf<
      keyof PublicEvent | 'postedBy' | 'location'
    >()
  })

  it('OwnerEvent keyset includes visibility flags', () => {
    expectTypeOf<keyof OwnerEvent>().toEqualTypeOf<
      keyof PublicEventWithProfile | 'isVisible' | 'isDeleted'
    >()
  })

  it('PublicEventDetail keyset matches PublicEventWithProfile', () => {
    expectTypeOf<keyof PublicEventDetail>().toEqualTypeOf<keyof PublicEventWithProfile>()
  })

  it('EventSummary keyset', () => {
    expectTypeOf<keyof EventSummary>().toEqualTypeOf<
      'id' | 'content' | 'eventDate' | 'location' | 'postedBy'
    >()
  })
})
```

Also write a route spec at `apps/backend/src/__tests__/routes/event.route.spec.ts` modelled after [post.route.spec.ts](../../apps/backend/src/__tests__/routes/post.route.spec.ts) — the factory references `EventService.getInstance()` and any `onMutation` dependency eagerly at config-build time, so your mocks must be in place before route registration.

## Step 7 — Add the frontend Pinia store

Create `apps/frontend/src/features/events/stores/eventStore.ts`. Mirror [postStore.ts](../../apps/frontend/src/features/posts/stores/postStore.ts):

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  PublicEventWithProfileSchema,
  PublicEventDetailSchema,
  OwnerEventSchema,
  EventSummarySchema,
  type PublicEventWithProfile,
  type OwnerEvent,
  type EventSummary,
  type EventQueryInput,
  type NearbyEventQueryInput,
} from '@zod/event/event.dto'
import { useUserContentActions } from '@/store/composables/useUserContentActions'

export const useEventStore = defineStore('events', () => {
  // --- state (refs owned by the store; aliased on return to expose the public API) ---
  const items = ref<PublicEventWithProfile[]>([])
  const myItems = ref<OwnerEvent[]>([])
  const summaries = ref<EventSummary[]>([])
  const currentItem = ref<PublicEventWithProfile | OwnerEvent | null>(null)

  // --- generic UserContent actions ---
  const a = useUserContentActions(
    { items, myItems, summaries, currentItem },
    {
      basePath: '/events',
      wire: { singular: 'event', plural: 'events' },
      publicSchema: PublicEventWithProfileSchema,
      ownerSchema: OwnerEventSchema,
      summarySchema: EventSummarySchema,
      detailSchema: PublicEventDetailSchema,
      endpoints: {
        list: '',
        mine: 'me',
        nearby: 'nearby',
        bounds: 'bounds',
        // recent omitted — service doesn't implement findRecent
      },
      resourceLabel: 'event',
    }
  )

  // --- event-specific scope dispatcher (optional — only if your feature needs one) ---
  async function loadEvents(
    scope: 'all' | 'nearby' | 'my',
    options: {
      page?: number
      pageSize?: number
      nearbyParams?: NearbyEventQueryInput
    } = {}
  ) {
    const { page = 0, pageSize = 20, nearbyParams } = options
    const baseQuery: EventQueryInput = { limit: pageSize, offset: page * pageSize }
    switch (scope) {
      case 'nearby':
        return nearbyParams ? await a.fetchNearby({ ...baseQuery, ...nearbyParams }) : null
      case 'my':
        return await a.fetchMine(baseQuery)
      default:
        return await a.fetchList(baseQuery)
    }
  }

  return {
    // state — public names
    events: items,
    myEvents: myItems,
    eventSummaries: summaries,
    currentEvent: currentItem,

    // CRUD
    createEvent: a.create,
    updateEvent: a.update,
    deleteEvent: a.deleteItem,
    setEventVisibility: a.setVisibility,
    hideEvent: a.hide,
    showEvent: a.show,

    // fetches
    fetchEvents: a.fetchList,
    fetchNearbyEvents: a.fetchNearby,
    fetchMyEvents: a.fetchMine,
    fetchEventsInBounds: a.fetchInBounds,
    fetchOwnerEvent: a.fetchOwner,
    fetchPublicEvent: a.fetchPublic,

    // state helpers
    upsertEvent: a.upsertItem,
    clearEvents: a.clearItems,
    clearMyEvents: a.clearMyItems,
    setCurrentEvent: a.setCurrentItem,

    // event-specific surface
    loadEvents,
  }
})
```

`★ Insight ─────────────────────────────────────`
The composable's `wire.singular` and `wire.plural` are typed as generic
literals (`TSingular extends string`), so passing the object literal
`{ singular: 'event', plural: 'events' }` makes the action return types
narrow automatically — `createEvent(...)` resolves to
`StoreResponse<{ event: OwnerEvent }>`, not `StoreResponse<Record<string, OwnerEvent>>`.
You don't need to annotate the literal type yourself. The Post store and
the Event store share the same composable but yield different envelope
keys at the type level.
`─────────────────────────────────────────────────`

## Step 8 — Verify

Run the full pipeline; everything must pass:

```bash
pnpm --filter backend prisma:generate    # makes EventSchema available to shared zod
pnpm type-check                          # catches keyset drift, mapper return-type mismatches
pnpm test                                # backend route spec + drift canary + frontend store tests
pnpm lint
```

Smoke-test the route surface manually with curl or the dev frontend:

| Verb   | Path                             | Auth                                         | Body / query                                                   |
| ------ | -------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| POST   | `/api/events`                    | required                                     | `{ content, eventDate, country?, cityName?, lat?, lon? }`      |
| GET    | `/api/events/:id`                | required                                     | — (returns owner shape if viewer is poster, else detail shape) |
| PATCH  | `/api/events/:id`                | required, owner only                         | partial of CreateEventPayload + `isVisible?`                   |
| DELETE | `/api/events/:id`                | required, owner only                         | — (soft delete: sets `isDeleted=true`)                         |
| GET    | `/api/events`                    | required                                     | `?limit&offset`                                                |
| GET    | `/api/events/me`                 | required                                     | `?limit&offset` (includes invisible)                           |
| GET    | `/api/events/profile/:profileId` | required                                     | `?limit&offset`                                                |
| GET    | `/api/events/nearby`             | required, only if `findNearby` implemented   | `?lat&lon&radius&limit&offset`                                 |
| GET    | `/api/events/bounds`             | required, only if `findInBounds` implemented | `?south&north&west&east`                                       |

## When you don't need every layer

- **No `eventDate`-shaped attribute** — if your new content type is _exactly_ the same wire shape as Post but with a different table, you're better off adding a discriminator column to `Post` than spinning up a new model.
- **No bounds/map view** — drop `findInBounds` from the service, drop `bounds` from `endpoints` in the store, drop `summarySchema` (well, you'll still need to pass _some_ schema; pass any object schema that won't be hit). Or set `features: { bounds: false }` in the route config.
- **No `findNearby`** — same pattern: drop the method, drop the endpoint key in the store, drop or set `features.nearby: false`.

# UserContent Polymorphism — Design Spec

**Date:** 2026-05-08
**Status:** Draft for review
**Branch:** `feat/user-content-polymorphism`

## 1. Goal & Motivation

Generalize the existing `Post` concept into a `UserContent` family so the application can carry several kinds of user-authored content (`post`, `event`, and future kinds) under a single read surface, while preserving kind-specific write semantics.

The dominant consumption pattern is the **unified feed**: the global timeline, map (`bounds`), supercluster, nearby and search must operate on all kinds uniformly without per-kind branching. Adding a new kind must not require touching cluster, search, or feed code.

### Non-goals

- No registry-based extensibility framework. We design for two kinds (Post, Event) with confidence the abstraction will hold for a third; we do not pre-build a "register a new kind in one file" facility.
- No backwards-compatible URL aliases for `/api/posts/*`. The cutover is atomic.
- No factory abstraction over per-kind routes or stores. Two-kind duplication is accepted; revisit at a third kind.

## 2. Architecture Summary

**Pattern: class-table inheritance.** A single base table `UserContent` holds shared columns for every kind. Each kind has its own extension table (`PostExtension`, `EventExtension`) holding only kind-specific fields, in a 1:1 relation to `UserContent` keyed by `userContentId`.

**Kind discriminator: `UserContent.kind` (Prisma enum `ContentKind`).** Source of truth lives on the base row; extension presence is consequence, not source.

**Read/write asymmetry:**
- **Reads** are polymorphic. Unified routes (`/api/content/*`) return either lean rows (kind-agnostic shape, used by feed/bounds/cluster/search/nearby) or a discriminated-union DTO (used by unified detail).
- **Writes** are monomorphic. Kind-specific routes (`/api/content/posts/*`, `/api/content/events/*`) accept kind-specific Zod payloads and write transactionally to `UserContent` + the matching extension table.

**Service layer is a class hierarchy.** A concrete `UserContentService` owns kind-agnostic reads and cross-kind operations (`softDelete`, `setVisibility`). `PostService` and `EventService` extend it for kind-specific create/update and hydrated detail reads.

**Frontend stores stay per-kind.** No new `contentStore`. The unified feed lives inside the existing `browseStore`; map bounds in `mapStore`. Per-kind stores (`postStore`, `eventStore`) own owner views, edit drafts, and kind-specific detail.

## 3. Data Model

### 3.1 New Prisma enum

```prisma
enum ContentKind {
  post
  event
}
```

### 3.2 Base table

```prisma
model UserContent {
  id          String      @id @default(cuid())
  kind        ContentKind
  postedById  String
  postedBy    Profile     @relation(fields: [postedById], references: [id], onDelete: Cascade)
  content     String
  isDeleted   Boolean     @default(false)
  isVisible   Boolean     @default(true)
  country     String?
  cityName    String?
  lat         Float?
  lon         Float?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  post        PostExtension?
  event       EventExtension?

  @@index([postedById])
  @@index([kind])
  @@index([createdAt])
  @@index([kind, isVisible, isDeleted])
  @@index([lat, lon])
}
```

### 3.3 Extension tables

```prisma
model PostExtension {
  userContentId String      @id
  userContent   UserContent @relation(fields: [userContentId], references: [id], onDelete: Cascade)
  type          PostType
}

model EventExtension {
  userContentId String      @id
  userContent   UserContent @relation(fields: [userContentId], references: [id], onDelete: Cascade)
  startsAt      DateTime
  @@index([startsAt])
}
```

### 3.4 Profile relation change

`Profile.posts Post[]` becomes `Profile.userContent UserContent[]`.

### 3.5 Old `Post` table

Dropped at the end of the same migration after data is copied into `UserContent + PostExtension`.

### 3.6 Data migration

A single Prisma migration performs:

1. `CREATE TYPE "ContentKind" AS ENUM ('post', 'event')`.
2. `CREATE TABLE "UserContent"`, `"PostExtension"`, `"EventExtension"` with all listed indexes.
3. `INSERT INTO "UserContent" (id, kind, "postedById", content, "isDeleted", "isVisible", country, "cityName", lat, lon, "createdAt", "updatedAt") SELECT id, 'post'::"ContentKind", "postedById", content, "isDeleted", "isVisible", country, "cityName", lat, lon, "createdAt", "updatedAt" FROM "Post"`. Existing `Post.id` values are reused as `UserContent.id` to preserve any URL/cache references.
4. `INSERT INTO "PostExtension" (userContentId, type) SELECT id, type FROM "Post"`.
5. `DROP TABLE "Post"`.

The migration is atomic (single transaction) and irreversible without a database snapshot. A fresh production backup must be taken immediately before deployment.

## 4. DTO Layer

### 4.1 File layout

```
packages/shared/zod/userContent/
  userContent.dto.ts          # base / lean DTOs and discriminated unions
  post/post.dto.ts            # Post-specific payloads + hydrated DTOs
  event/event.dto.ts          # Event-specific payloads + hydrated DTOs
```

The current `packages/shared/zod/post/post.dto.ts` is rewritten in place. The transitional `userContent.dto.ts` introduced in PR 1415 is replaced wholesale.

### 4.2 Lean shape (kind-agnostic)

`LeanUserContentSchema` carries only base columns plus `kind`. It is the contract for `/api/content/feed`, `/api/content/bounds`, `/api/content/nearby`, and `/api/content/profile/:profileId`. Cluster, supercluster and search consume this shape exclusively and never branch on `kind`.

```ts
export const ContentKindSchema = z.enum(['post', 'event'])
export const LeanUserContentSchema = z.object({
  id: z.string(),
  kind: ContentKindSchema,
  content: z.string(),
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  createdAt: z.date(),
  isOwn: z.boolean().default(false),
})
```

### 4.3 Hydrated discriminated unions (public/detail)

Per-kind public schemas extend the lean schema with extension fields and a literal `kind`. The public union is built with `z.discriminatedUnion('kind', [...])`, giving consumers automatic TypeScript narrowing on `kind`.

```ts
export const PublicPostSchema = LeanUserContentSchema.extend({
  kind: z.literal('post'),
  type: PostTypeSchema,
})
export const PublicEventSchema = LeanUserContentSchema.extend({
  kind: z.literal('event'),
  startsAt: z.date(),
})
export const PublicUserContentSchema = z.discriminatedUnion('kind', [
  PublicPostSchema,
  PublicEventSchema,
])

export const PublicPostDetailSchema = PublicPostSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})
export const PublicEventDetailSchema = PublicEventSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})
export const PublicUserContentDetailSchema = z.discriminatedUnion('kind', [
  PublicPostDetailSchema,
  PublicEventDetailSchema,
])
```

### 4.4 Owner DTOs (per-kind, no union)

Owner views are kind-specific by construction (separate edit screens, separate routes), so owner DTOs are not unioned.

```ts
export const OwnerPostSchema = PublicPostSchema.extend({
  isDeleted: z.boolean(),
  isVisible: z.boolean(),
  isOwn: z.literal(true),
})
export const OwnerEventSchema = PublicEventSchema.extend({
  isDeleted: z.boolean(),
  isVisible: z.boolean(),
  isOwn: z.literal(true),
})
```

### 4.5 Create/update payloads

Per-kind, no discriminated bodies. Each route validates its own payload schema.

```ts
export const CreatePostPayloadSchema = z.object({
  content: z.string().min(1).max(2000),
  type: PostTypeSchema,
  country: z.string().optional(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})
export const UpdatePostPayloadSchema = CreatePostPayloadSchema.partial().extend({
  isVisible: z.boolean().optional(),
})

export const CreateEventPayloadSchema = z.object({
  content: z.string().min(1).max(2000),
  startsAt: z.coerce.date(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})
export const UpdateEventPayloadSchema = CreateEventPayloadSchema.partial().extend({
  isVisible: z.boolean().optional(),
})
```

## 5. Backend Service Layer

### 5.1 `UserContentService` (concrete base)

Owns all kind-agnostic operations. Instantiated directly to power unified-read routes; also extended by per-kind services.

| Method | Behavior |
|---|---|
| `findFeed(opts: ListOptions)` | Recent items across all kinds, paginated by `(createdAt, id)`. Returns `LeanContentRow[]`. |
| `findInBounds(box: BoundsBox)` | Map/cluster query. Lean shape, no extension joins. |
| `findNearby(lat, lon, radius, opts)` | Radius search. Lean shape. |
| `findByIdLean(id, viewerProfileId)` | Base columns + `postedBy` + `ConversationContext` merged onto `postedBy` when `viewerProfileId !== postedById`. Mirrors today's `Post.findByIdWithContext`. Used by the unified detail route as step 1 of dispatch. |
| `findByProfileId(profileId, opts)` | Profile-page list, kind-agnostic; supports optional `?kind=post` filter. |
| `softDelete(id, profileId)` | Sets `isDeleted = true` after ownership check. Cross-kind. |
| `setVisibility(id, profileId, isVisible)` | Cross-kind. |

Lean row type is derived from a Prisma `select` of base columns + `kind` + `postedBy: { select: ProfileSummarySelect }`.

### 5.2 `PostService extends UserContentService`

Adds Post-specific operations:

| Method | Behavior |
|---|---|
| `create(profileId, data: CreatePostPayload)` | `prisma.$transaction([userContent.create({ kind: 'post', ... }), postExtension.create({ ... })])`. Returns hydrated row. |
| `update(id, profileId, data: UpdatePostPayload)` | Ownership check on `UserContent.postedById`. Updates either or both tables in a transaction. |
| `findByIdHydrated(id, viewerProfileId)` | Base + `PostExtension` include + viewer context. |
| `findByProfileIdHydrated(profileId, opts)` | Owner's posts list with `PostExtension` joined. |

Inherits `softDelete`, `setVisibility`, and the unified read methods from the base.

### 5.3 `EventService extends UserContentService`

Symmetric to `PostService`. Methods: `create`, `update`, `findByIdHydrated`, `findByProfileIdHydrated`. Writes inside `prisma.$transaction` covering `UserContent` + `EventExtension`.

### 5.4 Transactional helper

A protected `withExtension<T>(operation)` helper on the base class wraps the two-table create/update pattern so subclasses do not duplicate transaction shape. Each kind-specific create/update goes through this helper.

### 5.5 Singleton convention

Each service exposes `getInstance()` matching existing project convention. Routes resolve services at registration time, not at module-load time, to keep test mocks working.

## 6. Backend Routes

### 6.1 File layout

```
apps/backend/src/api/routes/
  content.route.ts              # /api/content/* — unified reads
  content/post.route.ts         # /api/content/posts/* — Post CRUD
  content/event.route.ts        # /api/content/events/* — Event CRUD
```

The current top-level `post.route.ts` is removed. The PR-1415 `userContent.route-factory.ts` is removed. No factory replaces it; route plugins are written as plain Fastify handlers.

### 6.2 Unified reads — `content.route.ts`

| Method | Path | Service call | Returns |
|---|---|---|---|
| GET | `/feed` | `UserContentService.findFeed(opts)` | `LeanUserContent[]` |
| GET | `/bounds` | `UserContentService.findInBounds(box)` | `LeanUserContent[]` |
| GET | `/nearby` | `UserContentService.findNearby(lat, lon, radius, opts)` | `LeanUserContent[]` |
| GET | `/:id` | `UserContentService.findByIdLean(id, viewerProfileId)`, then dispatch to `PostService.findByIdHydrated` or `EventService.findByIdHydrated` based on `kind` | `PublicUserContentDetail` |
| GET | `/profile/:profileId` | `UserContentService.findByProfileId(profileId, opts)` | `LeanUserContent[]` |

The `/api/content/:id` route is the single point in the route layer where a `switch (kind)` exists. All other unified reads stay lean and avoid dispatch.

### 6.3 Per-kind CRUD

`/api/content/posts/*` and `/api/content/events/*` follow an identical surface:

| Method | Path | Behavior |
|---|---|---|
| POST | `/` | Create. Body validated against kind's `Create*Payload`. Returns `Owner*` DTO. |
| GET | `/:id` | Owner if `postedById === viewerProfileId`, else `Public*Detail`. |
| PATCH | `/:id` | Update. Ownership-checked. Returns `Owner*`. |
| DELETE | `/:id` | Soft delete. Inherits base method. |
| GET | `/me` | `findByProfileIdHydrated(myProfileId, { includeInvisible: true })`. |
| GET | `/profile/:profileId` | `findByProfileIdHydrated(profileId, { includeInvisible: viewerIsSelf })`. |

Rate limits: `create` 10/min, `mutate` 5/min — ported from the current `post.route.ts`. Each route file applies these limits on its own handlers; no shared config.

### 6.4 Cluster cache eviction

Both `post.route.ts` and `event.route.ts` call `ClusterService.getInstance().evictAll()` after successful create/update/delete. With three call-sites per route × two kinds, this is six explicit calls — acceptable; no helper introduced.

### 6.5 Registration

In `apps/backend/src/api.ts`:

```ts
fastify.register(contentRoutes, { prefix: '/api/content' })
fastify.register(postRoutes,    { prefix: '/api/content/posts' })
fastify.register(eventRoutes,   { prefix: '/api/content/events' })
```

The previous `/api/posts/*` registration is removed in the same commit.

## 7. Cluster, Supercluster, and Search

These layers see no shape change, only a different source table.

- **`ClusterService`** ([apps/backend/src/services/cluster.service.ts](apps/backend/src/services/cluster.service.ts)) switches from `Post.findInBounds` to `UserContentService.findInBounds`. Cache key remains kind-agnostic; `evictAll()` is invoked from any kind's mutation route.
- **Supercluster (frontend)** receives lean rows with `kind` already populated. Marker icon is selected via a small lookup table keyed by `kind`. Clustering math is unchanged.
- **`SearchService`** ([apps/backend/src/services/search.service.ts](apps/backend/src/services/search.service.ts)) is retargeted from `Post` to `UserContent`. Returns lean rows. A `kind` filter parameter is added, defaulting to "all kinds."

## 8. Frontend

### 8.1 Stores

| Store | Role |
|---|---|
| `apps/frontend/src/features/posts/stores/postStore.ts` | Rewritten — Post CRUD, retargeted to `/api/content/posts/*`, updated to new owner DTO. |
| `apps/frontend/src/features/events/stores/eventStore.ts` | New — near-clone of `postStore`, retargeted to `/api/content/events/*`. |
| `apps/frontend/src/features/browse/stores/browseStore.ts` | Extended — holds the lean unified feed (`LeanUserContent[]`) from `/api/content/feed`. |
| `apps/frontend/src/features/map/stores/mapStore.ts` | Retargeted — `/api/posts/bounds` → `/api/content/bounds`. |

No store factory. Two parallel-but-independent stores stay readable; reconsider at a third kind.

### 8.2 Components

```
apps/frontend/src/features/events/
  components/{EventCard.vue, EventDetail.vue, EventEditForm.vue}
  composables/useEventForm.ts
  stores/eventStore.ts

apps/frontend/src/features/browse/components/
  ContentFeedItem.vue              # picks <PostCard> or <EventCard> by item.kind
```

### 8.3 Routes

| Route | View |
|---|---|
| `/posts` | (existing) Post list |
| `/events` | New — Event list |
| `/me/events/new`, `/me/events/edit/:id` | New |
| `/content/:id` | New — unified detail; switches on `kind` |

## 9. Testing

### 9.1 New / rewritten backend tests

- `userContent.service.spec.ts` — base class: feed, bounds, nearby, softDelete, setVisibility, profile-list.
- `post.service.spec.ts` (rewritten) — Post CRUD over `UserContent + PostExtension` transaction; ownership; payload validation.
- `event.service.spec.ts` — Event CRUD; `startsAt` validation.
- `content.route.spec.ts` — feed, bounds, nearby, unified detail dispatch by kind.
- `post.route.spec.ts` (rewritten under new URL `/api/content/posts`) — full CRUD path.
- `event.route.spec.ts` — full CRUD path.
- `cluster.service.spec.ts` (touched) — verifies cluster works on mixed-kind data.
- `search.service.spec.ts` (touched) — verifies search returns mixed kinds and respects `kind` filter.
- `post.mappers.spec.ts` (rewritten) + `event.mappers.spec.ts` — DTO mapping correctness.
- `post-dto-types.test.ts` (existing type-only) — extended for discriminated-union narrowing on `PublicUserContent`.

### 9.2 New frontend tests

- `eventStore.spec.ts` — mirrors `postStore.spec.ts`.
- `ContentFeedItem.spec.ts` — renders correct child component per `kind`.
- `postStore.spec.ts` (existing) updated for new URL prefix and DTO shape.

### 9.3 Test fixtures

Many existing tests create `Post` rows directly via `prisma.post.create({...})`. Each call site must change to the nested `prisma.userContent.create({ data: { kind: 'post', post: { create: { type } } } })` form. To keep test bodies readable and avoid pervasive duplication, two factory helpers are added:

```
apps/backend/src/__tests__/factories/createPost.ts
apps/backend/src/__tests__/factories/createEvent.ts
```

Every existing test that constructs a `Post` migrates to `createPost(...)` as part of this work.

## 10. Migration & Deployment

### 10.1 Pre-deploy checklist

- Run `SELECT count(*) FROM "Post"` against production. If the count exceeds 100k, batch the migration into chunks (otherwise the single-transaction copy is acceptable).
- Confirm no other in-flight branches reference `prisma.post.*`. Conflicting branches must rebase before merge.
- Take a fresh production database backup immediately before deploy. The `DROP TABLE "Post"` is irreversible without a snapshot.

### 10.2 Deploy ordering

The frontend bundle and backend bundle deploy together in the same release. The atomic URL rename means a stale frontend would 404 on `/api/posts/*`. Standard release process per CLAUDE.md applies.

### 10.3 Changeset

A `minor` bump on `@opencupid/backend`, `@opencupid/frontend`, and the affected shared package — new feature.

## 11. Decisions Log

| Decision | Rationale |
|---|---|
| Class-table inheritance over single-table or sibling-tables | Unified reads (cluster/search/feed/bounds) need a single physical table to query without UNION machinery, while kind-specific writes need typed shapes. CTI gives both. |
| Concrete (not abstract) `UserContentService` base | The base methods are real working queries usable directly by the unified-feed routes. Marking it abstract would force a no-op subclass for unified instantiation. |
| Polymorphic reads, monomorphic writes | Read consumers (feed, map, cluster, search) handle every kind uniformly — discriminated union is valuable. Write consumers (edit screens, route handlers) are intrinsically kind-aware — discriminated payloads would be ceremony. |
| `/api/content/posts/*` URL rename, atomic cutover | Project rule: no backwards-compatibility shims. Frontend and backend ship together. |
| No factory over per-kind routes/stores | PR 1415 was explicitly rejected; two-kind duplication is readable; revisit at a third kind. |
| Discriminated union only for public/detail DTOs, not owner | Owner consumers are already kind-aware by URL; union adds narrowing ceremony with no benefit. |
| `UserContent.kind` enum column over inferred-from-extension | Inference requires LEFT JOIN of every extension table on every unified read — defeats the point. |
| Reuse existing `Post.id` as `UserContent.id` in migration | Free forward compatibility for any cached references. No FK referrers exist outside `Profile`, but cost is zero. |

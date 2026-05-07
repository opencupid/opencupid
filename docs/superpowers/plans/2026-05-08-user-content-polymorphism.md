# UserContent Polymorphism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize `Post` into a polymorphic `UserContent` family using class-table inheritance, add `Event` as a second kind, and route the existing map/cluster/search/feed surfaces through a single kind-agnostic read path.

**Architecture:** A `UserContent` base table holds shared columns (id, kind, postedById, content, location, visibility flags, timestamps). Per-kind extension tables (`PostExtension`, `EventExtension`) hold kind-specific extras with a 1:1 FK to the base. Reads are polymorphic through `/api/content/*` returning a lean kind-agnostic shape (feed/bounds/nearby/search) or a `z.discriminatedUnion('kind', ...)` for unified detail. Writes are monomorphic through `/api/content/posts/*` and `/api/content/events/*` with kind-specific Zod payloads written transactionally to base + extension. Service layer is a class hierarchy: concrete `UserContentService` (unified reads + cross-kind ops) extended by `PostService` and `EventService`.

**Tech Stack:** Prisma + Postgres, Fastify, Zod, Vitest, Vue 3 + Pinia, supercluster.

**Source of truth:** Spec at [`docs/superpowers/specs/2026-05-08-user-content-polymorphism-design.md`](../specs/2026-05-08-user-content-polymorphism-design.md). When a step's behavioral choice is ambiguous, defer to the spec.

**Branch:** Work on `feat/user-content-polymorphism`. The branch is stacked on top of the revert PR (#1436); ensure that PR is merged to `main` before creating this PR (or rebase off `main` once merged).

---

## File Structure

### New files

| Path | Purpose |
|---|---|
| `apps/backend/prisma/migrations/20260508000000_user_content_polymorphism/migration.sql` | Schema + data migration |
| `apps/backend/src/services/userContent.service.ts` | Concrete base class — unified reads + cross-kind ops |
| `apps/backend/src/services/event.service.ts` | Subclass — Event-specific create/update/hydrated reads |
| `apps/backend/src/api/routes/content.route.ts` | `/api/content/*` unified-read plugin |
| `apps/backend/src/api/routes/content/post.route.ts` | `/api/content/posts/*` Post CRUD plugin (replaces `routes/post.route.ts`) |
| `apps/backend/src/api/routes/content/event.route.ts` | `/api/content/events/*` Event CRUD plugin |
| `apps/backend/src/api/mappers/event.mappers.ts` | `EventWithProfile` → DTO mappers |
| `apps/backend/src/api/mappers/userContent.mappers.ts` | Lean projection (`mapLeanContent`) shared by content.route, cluster, search |
| `apps/backend/src/__tests__/factories/createPost.ts` | Test helper for creating Post rows in nested form |
| `apps/backend/src/__tests__/factories/createEvent.ts` | Test helper for creating Event rows |
| `apps/backend/src/__tests__/services/userContent.service.spec.ts` | Base-class unit tests |
| `apps/backend/src/__tests__/services/event.service.spec.ts` | EventService unit tests |
| `apps/backend/src/__tests__/routes/content.route.spec.ts` | Unified-read endpoint tests |
| `apps/backend/src/__tests__/routes/content/post.route.spec.ts` | Replaces `routes/post.route.spec.ts` |
| `apps/backend/src/__tests__/routes/content/event.route.spec.ts` | Event route tests |
| `apps/backend/src/__tests__/api/event.mappers.spec.ts` | Event mapper tests |
| `packages/shared/zod/userContent/userContent.dto.ts` | `ContentKindSchema`, `LeanUserContentSchema`, `PublicUserContentSchema` (discriminated union), detail union |
| `packages/shared/zod/event/event.dto.ts` | Event-specific DTOs |
| `apps/frontend/src/features/events/stores/eventStore.ts` | Pinia store for Event CRUD |
| `apps/frontend/src/features/events/components/EventCard.vue` | List card |
| `apps/frontend/src/features/events/components/EventFullView.vue` | Detail view |
| `apps/frontend/src/features/events/components/EditEventDialog.vue` | Owner edit dialog |
| `apps/frontend/src/features/events/components/EventMapPopup.vue` | Map popup |
| `apps/frontend/src/features/events/components/EventMarker.vue` | Map marker |
| `apps/frontend/src/features/events/components/eventMapIcon.ts` | Marker icon HTML |
| `apps/frontend/src/features/events/components/eventMapIcon.scss` | Marker icon styles |
| `apps/frontend/src/features/events/composables/useEventListViewModel.ts` | List view-model parallel to Post's |
| `apps/frontend/src/features/browse/components/ContentFeedItem.vue` | Renders `<PostCard>` or `<EventCard>` per `kind` |
| `apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts` *(if absent — add)* | Post store tests against new URL prefix |
| `apps/frontend/src/features/events/stores/__tests__/eventStore.spec.ts` | Event store tests |
| `apps/frontend/src/features/browse/components/__tests__/ContentFeedItem.spec.ts` | Per-kind component-dispatch test |
| `.changeset/user-content-polymorphism.md` | `minor` bump on backend, frontend, and shared |

### Modified files

| Path | What changes |
|---|---|
| `apps/backend/prisma/schema.prisma` | Add `enum ContentKind`, `model UserContent`, `model PostExtension`, `model EventExtension`; rewrite `Profile.posts` → `Profile.userContent`; remove `model Post`; remove `Profile.posts` index referencing the old model |
| `apps/backend/src/services/post.service.ts` | Rewritten to extend `UserContentService`; `prisma.post.*` → transactional `prisma.userContent.*` + `postExtension` |
| `apps/backend/src/services/cluster.service.ts` | Source switched from `PostService` to `UserContentService.findInBounds`; `kind` carried through unchanged |
| `apps/backend/src/services/search.service.ts` | `prisma.post.findMany` → `prisma.userContent.findMany` (lean shape); supports `kind` filter |
| `apps/backend/src/api/index.ts` | Register `contentRoutes` at `/content`, `postRoutes` at `/content/posts`, `eventRoutes` at `/content/events`; remove `/posts` registration |
| `apps/backend/src/api/mappers/post.mappers.ts` | Update input row shape (now `UserContentWithProfile + post: PostExtension`); add `mapDbPostToOwner/Public/Detail` matching new shape |
| `packages/shared/zod/post/post.dto.ts` | Restructure: `LeanUserContentSchema` extended with `kind: z.literal('post')` and `type: PostTypeSchema`; owner schema unchanged shape |
| `packages/shared/maps.ts` | `USER_CONTENT_KINDS` adds `'event'`; align with `ContentKindSchema` |
| `apps/backend/src/__tests__/**` | Migrate every `prisma.post.create({...})` call to `createPost(...)` factory |
| `apps/frontend/src/features/posts/stores/postStore.ts` | URL prefix `/posts` → `/content/posts`; DTOs follow new shape |
| `apps/frontend/src/features/posts/components/PostCard.vue` and siblings | DTO type updates only (extension fields now on `item.kind === 'post'` narrowing path); no behavior change |
| `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts` | Switch unified feed source from `postStore` to a new `/api/content/feed` call |
| `apps/frontend/src/features/browse/views/BrowseProfiles.vue` | Render `ContentFeedItem` instead of `PostCard` for the unified feed; update map popup dispatch on `kind` |
| `apps/frontend/src/router/index.ts` | Add Event routes (`me/events`, `me/events/new`, `me/events/:id/edit`, public `events/:eventId`) and unified `/content/:id` |

---

## Conventions

- **TDD discipline:** every new behavioral unit gets its failing test first, then the minimal code to pass.
- **One commit per task** unless the task explicitly says otherwise.
- **No backwards-compatibility shims.** When a file changes shape, callers update in the same commit.
- **Run scoped Vitest for fast iteration:** `pnpm --filter backend exec vitest run path/to/test.spec.ts -t "specific name"`. Reserve full `pnpm test` for finalization.
- **Format only the files you edited:** `pnpm exec prettier --write <files>`.
- **`prisma generate` after every schema edit.** Run `pnpm --filter backend prisma:generate` whenever `schema.prisma` changes.

---

## Phase 0 — Pre-flight

### Task 0.1: Confirm baseline is post-revert

**Files:** none (sanity)

- [ ] **Step 1: Verify branch and base**

```bash
git branch --show-current
git log --oneline main..HEAD
```

Expected: branch is `feat/user-content-polymorphism`. Log shows revert commits + spec commit, OR (if revert PR is merged) only the spec commit atop the latest `main`.

- [ ] **Step 2: Verify post.service has no UserContent abstraction**

```bash
test ! -f apps/backend/src/services/userContent.service.ts && echo "OK: no leftover userContent.service.ts"
test ! -f apps/backend/src/api/routes/userContent.route-factory.ts && echo "OK: no leftover route factory"
test ! -f apps/frontend/src/store/composables/useUserContentActions.ts && echo "OK: no leftover composable"
```

Expected: all three "OK" lines printed. If any file is present, the revert wasn't applied — stop and resolve before continuing.

- [ ] **Step 3: Run baseline tests so we have a known-green starting point**

```bash
pnpm --filter backend test 2>&1 | tail -5
pnpm --filter frontend test 2>&1 | tail -5
```

Expected: backend ≥ 700 pass, frontend ≥ 600 pass, 0 failures. Record the exact numbers in your scratch notes — they're the regression baseline.

- [ ] **Step 4: No commit — pre-flight only.**

---

## Phase 1 — Schema and Data Migration

### Task 1.1: Add ContentKind enum and UserContent model to Prisma schema

**Files:** Modify `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: Add the enum near the existing PostType enum**

After `enum PostType { OFFER REQUEST }` (around line 82), add:

```prisma
enum ContentKind {
  post
  event
}
```

- [ ] **Step 2: Add the base model below the existing Post model**

After `model Post { … }` (around line 413), add:

```prisma
model UserContent {
  id         String      @id @default(cuid())
  kind       ContentKind
  postedById String
  postedBy   Profile     @relation(fields: [postedById], references: [id], onDelete: Cascade)
  content    String
  isDeleted  Boolean     @default(false)
  isVisible  Boolean     @default(true)
  country    String?
  cityName   String?
  lat        Float?
  lon        Float?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  post  PostExtension?
  event EventExtension?

  @@index([postedById])
  @@index([kind])
  @@index([createdAt])
  @@index([kind, isVisible, isDeleted])
  @@index([lat, lon])
}

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

- [ ] **Step 3: Update `Profile` to relate to UserContent instead of Post**

In `model Profile` (around line 165), find the line:
```prisma
  posts Post[]
```
and replace with:
```prisma
  userContent UserContent[]
```

- [ ] **Step 4: Remove the old Post model**

Delete the entire `model Post { … }` block.

- [ ] **Step 5: Generate Prisma client**

```bash
pnpm --filter backend prisma:generate
```

Expected: succeeds. The generated client now exposes `prisma.userContent`, `prisma.postExtension`, `prisma.eventExtension`. `prisma.post` no longer exists — type errors will appear in services/routes/tests; that's expected and fixed in later tasks.

- [ ] **Step 6: Commit (schema only — no migration file yet)**

```bash
git add apps/backend/prisma/schema.prisma
git commit -m "feat(schema): add UserContent base + extension tables"
```

### Task 1.2: Write the Prisma migration with data copy

**Files:** Create `apps/backend/prisma/migrations/20260508000000_user_content_polymorphism/migration.sql`

- [ ] **Step 1: Generate the migration scaffolding**

```bash
pnpm --filter backend exec prisma migrate dev --create-only --name user_content_polymorphism
```

This produces a SQL file with the schema diff. Open the generated file at `apps/backend/prisma/migrations/<timestamp>_user_content_polymorphism/migration.sql`.

- [ ] **Step 2: Insert data-copy SQL between the CREATE TABLE statements and the DROP TABLE statement**

Prisma will have ordered the SQL roughly as: create enum → create UserContent → create PostExtension → create EventExtension → drop old Post FK → drop Post. **Insert the data copy AFTER all CREATE TABLE statements, BEFORE the DROP TABLE "Post"**. The two INSERT statements:

```sql
-- Copy existing Post rows into the new base table, preserving id
INSERT INTO "UserContent" (
  id, kind, "postedById", content, "isDeleted", "isVisible",
  country, "cityName", lat, lon, "createdAt", "updatedAt"
)
SELECT
  id, 'post'::"ContentKind", "postedById", content, "isDeleted", "isVisible",
  country, "cityName", lat, lon, "createdAt", "updatedAt"
FROM "Post";

-- Copy Post.type into PostExtension
INSERT INTO "PostExtension" ("userContentId", type)
SELECT id, type
FROM "Post";
```

If Prisma's diff drops `Post` columns one-at-a-time before dropping the table, replace that with a single `DROP TABLE "Post";` at the end.

- [ ] **Step 3: Apply the migration to the dev database**

```bash
pnpm --filter backend exec prisma migrate dev
```

Expected: migration applies cleanly. `prisma db pull --print` (optional sanity) shows `UserContent`, `PostExtension`, `EventExtension`; no `Post`.

- [ ] **Step 4: Verify dev data was migrated**

```bash
docker compose exec db psql -U appuser -d app -c "SELECT count(*) FROM \"UserContent\" WHERE kind = 'post';"
docker compose exec db psql -U appuser -d app -c "SELECT count(*) FROM \"PostExtension\";"
```

Both counts must match (each migrated post = one row in each table).

- [ ] **Step 5: Commit migration**

```bash
git add apps/backend/prisma/migrations/
git commit -m "feat(db): migrate Post rows into UserContent + PostExtension"
```

---

## Phase 2 — DTO Layer

### Task 2.1: Create userContent DTO module

**Files:** Create `packages/shared/zod/userContent/userContent.dto.ts`

- [ ] **Step 1: Write the file in full**

```ts
import { z } from 'zod'
import { ProfileSummarySchema } from '../profile/profile.dto'
import { ConversationContextSchema } from '../interaction/interactionContext.dto'
import { LocationSchema } from '@zod/dto/location.dto'

export const ContentKindSchema = z.enum(['post', 'event'])
export type ContentKind = z.infer<typeof ContentKindSchema>

/**
 * Lean shape used by feed/bounds/nearby/search and supercluster.
 * No extension fields; consumers branch on `kind` only when they need them.
 */
export const LeanUserContentSchema = z.object({
  id: z.string(),
  kind: ContentKindSchema,
  content: z.string(),
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  createdAt: z.date(),
  isOwn: z.boolean().default(false),
})
export type LeanUserContent = z.infer<typeof LeanUserContentSchema>

export const UserContentQueryShape = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  kind: ContentKindSchema.optional(),
} as const

export const UserContentQuerySchema = z.object(UserContentQueryShape)
export type UserContentQuery = z.infer<typeof UserContentQuerySchema>

export const NearbyContentQueryShape = {
  ...UserContentQueryShape,
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  radius: z.coerce.number().int().min(1).max(500).default(50),
} as const

export const NearbyContentQuerySchema = z.object(NearbyContentQueryShape)
export type NearbyContentQuery = z.infer<typeof NearbyContentQuerySchema>

export const ContentParamsSchema = z.object({ id: z.string().cuid() })
export type ContentParams = z.infer<typeof ContentParamsSchema>

/**
 * Detail-with-context shape: postedBy carries conversation context for non-owner viewers.
 * The discriminated union of `PublicUserContentDetailSchema` is composed in this module
 * after the per-kind DTO files import this base.
 */
export const PublicUserContentDetailBaseSchema = LeanUserContentSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})
```

- [ ] **Step 2: Verify it type-checks in isolation**

```bash
pnpm --filter @opencupid/shared exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/zod/userContent/userContent.dto.ts
git commit -m "feat(dto): add base userContent DTO module"
```

### Task 2.2: Rewrite post DTO module to extend the lean base

**Files:** Modify `packages/shared/zod/post/post.dto.ts`

- [ ] **Step 1: Replace file contents in full**

```ts
import { z } from 'zod'
import { PostTypeSchema } from '../generated'
import {
  LeanUserContentSchema,
  PublicUserContentDetailBaseSchema,
  UserContentQueryShape,
  NearbyContentQueryShape,
  ContentKindSchema,
} from '../userContent/userContent.dto'

const POST_KIND = z.literal('post')

export const PublicPostSchema = LeanUserContentSchema.extend({
  kind: POST_KIND,
  type: PostTypeSchema,
})
export type PublicPost = z.infer<typeof PublicPostSchema>

export const PublicPostWithProfileSchema = PublicPostSchema
export type PublicPostWithProfile = PublicPost

export const PublicPostDetailSchema = PublicUserContentDetailBaseSchema.extend({
  kind: POST_KIND,
  type: PostTypeSchema,
})
export type PublicPostDetail = z.infer<typeof PublicPostDetailSchema>

export const OwnerPostSchema = PublicPostSchema.extend({
  isDeleted: z.boolean(),
  isVisible: z.boolean(),
  isOwn: z.literal(true),
  updatedAt: z.date(),
})
export type OwnerPost = z.infer<typeof OwnerPostSchema>

export const PostSummarySchema = z.object({
  id: z.string(),
  kind: POST_KIND,
  type: PostTypeSchema,
  content: z.string(),
  location: z.any(), // matches existing LocationSchema use
  postedBy: z.any(),
})
export type PostSummary = z.infer<typeof PostSummarySchema>

export const CreatePostPayloadSchema = z.object({
  content: z.string().min(1).max(2000),
  type: PostTypeSchema,
  country: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})
export type CreatePostPayload = z.infer<typeof CreatePostPayloadSchema>

export const UpdatePostPayloadSchema = CreatePostPayloadSchema.partial().extend({
  isVisible: z.boolean().optional(),
})
export type UpdatePostPayload = z.infer<typeof UpdatePostPayloadSchema>

export const PostParamsSchema = z.object({ id: z.string().cuid() })
export type PostParams = z.infer<typeof PostParamsSchema>

export const PostQuerySchema = z.object({
  ...UserContentQueryShape,
  type: PostTypeSchema.optional(),
})
export type PostQuery = z.infer<typeof PostQuerySchema>
export type PostQueryInput = z.input<typeof PostQuerySchema>

export const NearbyPostQuerySchema = z.object({
  ...NearbyContentQueryShape,
  type: PostTypeSchema.optional(),
})
export type NearbyPostQuery = z.infer<typeof NearbyPostQuerySchema>
export type NearbyPostQueryInput = z.input<typeof NearbyPostQuerySchema>

export type PostScope = 'all' | 'nearby' | 'recent' | 'my'
```

- [ ] **Step 2: Type-check shared package**

```bash
pnpm --filter @opencupid/shared exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/zod/post/post.dto.ts
git commit -m "refactor(dto): post DTOs extend lean userContent base"
```

### Task 2.3: Create event DTO module

**Files:** Create `packages/shared/zod/event/event.dto.ts`

- [ ] **Step 1: Write the file**

```ts
import { z } from 'zod'
import {
  LeanUserContentSchema,
  PublicUserContentDetailBaseSchema,
  UserContentQueryShape,
  NearbyContentQueryShape,
} from '../userContent/userContent.dto'

const EVENT_KIND = z.literal('event')

export const PublicEventSchema = LeanUserContentSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.date(),
})
export type PublicEvent = z.infer<typeof PublicEventSchema>

export const PublicEventDetailSchema = PublicUserContentDetailBaseSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.date(),
})
export type PublicEventDetail = z.infer<typeof PublicEventDetailSchema>

export const OwnerEventSchema = PublicEventSchema.extend({
  isDeleted: z.boolean(),
  isVisible: z.boolean(),
  isOwn: z.literal(true),
  updatedAt: z.date(),
})
export type OwnerEvent = z.infer<typeof OwnerEventSchema>

export const CreateEventPayloadSchema = z.object({
  content: z.string().min(1).max(2000),
  startsAt: z.coerce.date(),
  country: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})
export type CreateEventPayload = z.infer<typeof CreateEventPayloadSchema>

export const UpdateEventPayloadSchema = CreateEventPayloadSchema.partial().extend({
  isVisible: z.boolean().optional(),
})
export type UpdateEventPayload = z.infer<typeof UpdateEventPayloadSchema>

export const EventParamsSchema = z.object({ id: z.string().cuid() })

export const EventQuerySchema = z.object(UserContentQueryShape)
export type EventQuery = z.infer<typeof EventQuerySchema>
export type EventQueryInput = z.input<typeof EventQuerySchema>

export const NearbyEventQuerySchema = z.object(NearbyContentQueryShape)
export type NearbyEventQuery = z.infer<typeof NearbyEventQuerySchema>
export type NearbyEventQueryInput = z.input<typeof NearbyEventQuerySchema>
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @opencupid/shared exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/zod/event/event.dto.ts
git commit -m "feat(dto): add event DTOs"
```

### Task 2.4: Compose discriminated unions in userContent module

**Files:** Modify `packages/shared/zod/userContent/userContent.dto.ts` (append to bottom)

- [ ] **Step 1: Append to the existing file**

```ts
// Imports must be added at top of file:
//   import { PublicPostSchema, PublicPostDetailSchema } from '../post/post.dto'
//   import { PublicEventSchema, PublicEventDetailSchema } from '../event/event.dto'
//
// Discriminated unions must be defined AFTER the per-kind DTOs import this module's
// LeanUserContentSchema/etc. — so we put the union definitions in this file but
// import the variants from the per-kind modules.

export const PublicUserContentSchema = z.discriminatedUnion('kind', [
  PublicPostSchema,
  PublicEventSchema,
])
export type PublicUserContent = z.infer<typeof PublicUserContentSchema>

export const PublicUserContentDetailSchema = z.discriminatedUnion('kind', [
  PublicPostDetailSchema,
  PublicEventDetailSchema,
])
export type PublicUserContentDetail = z.infer<typeof PublicUserContentDetailSchema>
```

Add the imports near the top of the file:
```ts
import { PublicPostSchema, PublicPostDetailSchema } from '../post/post.dto'
import { PublicEventSchema, PublicEventDetailSchema } from '../event/event.dto'
```

- [ ] **Step 2: Verify no circular import error**

```bash
pnpm --filter @opencupid/shared exec tsc --noEmit
```

Expected: no errors. (`post.dto.ts` and `event.dto.ts` import only from `userContent.dto.ts`; `userContent.dto.ts` imports the union variants — Zod schemas are values defined at module-init, so the cycle is resolved at runtime in dependency order.)

If a circular import warning surfaces in practice (Zod is value-level, so init order can bite), move the discriminated unions into a third file `packages/shared/zod/userContent/userContent.unions.ts` that imports from both per-kind modules and re-exports from `userContent.dto.ts`.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/zod/userContent/userContent.dto.ts
git commit -m "feat(dto): add PublicUserContent discriminated unions"
```

---

## Phase 3 — Backend Service Layer

### Task 3.1: Write failing test for `UserContentService.findFeed`

**Files:** Create `apps/backend/src/__tests__/services/userContent.service.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { UserContentService } from '@/services/userContent.service'
import { createPost } from '../factories/createPost'
import { createEvent } from '../factories/createEvent'
import { createTestProfile } from '../factories/createProfile' // assumes existing helper

describe('UserContentService.findFeed', () => {
  beforeEach(async () => {
    await prisma.userContent.deleteMany()
  })

  it('returns mixed-kind items ordered by createdAt DESC', async () => {
    const profile = await createTestProfile()
    const post = await createPost({ profileId: profile.id, content: 'p1', type: 'OFFER' })
    const event = await createEvent({ profileId: profile.id, content: 'e1', startsAt: new Date('2027-01-01') })

    const svc = UserContentService.getInstance()
    const rows = await svc.findFeed({ limit: 20, offset: 0 })

    expect(rows.map((r) => r.id)).toContain(post.id)
    expect(rows.map((r) => r.id)).toContain(event.id)
    expect(rows.map((r) => r.kind).sort()).toEqual(['event', 'post'])
  })

  it('filters by kind when provided', async () => {
    const profile = await createTestProfile()
    await createPost({ profileId: profile.id, content: 'p1', type: 'OFFER' })
    await createEvent({ profileId: profile.id, content: 'e1', startsAt: new Date('2027-01-01') })

    const svc = UserContentService.getInstance()
    const rows = await svc.findFeed({ limit: 20, offset: 0, kind: 'event' })

    expect(rows.every((r) => r.kind === 'event')).toBe(true)
  })

  it('excludes isDeleted and isVisible=false', async () => {
    const profile = await createTestProfile()
    const visible = await createPost({ profileId: profile.id, content: 'p1', type: 'OFFER' })
    const deleted = await createPost({ profileId: profile.id, content: 'p2', type: 'OFFER' })
    await prisma.userContent.update({ where: { id: deleted.id }, data: { isDeleted: true } })

    const svc = UserContentService.getInstance()
    const rows = await svc.findFeed({ limit: 20, offset: 0 })

    expect(rows.map((r) => r.id)).toContain(visible.id)
    expect(rows.map((r) => r.id)).not.toContain(deleted.id)
  })
})
```

- [ ] **Step 2: Run — expect failure (factories don't exist yet)**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/userContent.service.spec.ts
```

Expected: FAIL with `Cannot find module '../factories/createPost'`. That's correct — we write the factories next.

- [ ] **Step 3: No commit yet — Task 3.2 produces a runnable state**

### Task 3.2: Write the test factories

**Files:** Create `apps/backend/src/__tests__/factories/createPost.ts`, `apps/backend/src/__tests__/factories/createEvent.ts`. Inspect existing test helpers for `createTestProfile` (under `apps/backend/src/__tests__/`) — if it already exists, import it; if not, create the smallest viable helper.

- [ ] **Step 1: Inspect existing profile factory**

```bash
grep -rln "createTestProfile\|createProfile" apps/backend/src/__tests__ | head -5
```

If a helper exists, note its export name. If none exists, create `apps/backend/src/__tests__/factories/createProfile.ts`:

```ts
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'node:crypto'

export async function createTestProfile() {
  return prisma.profile.create({
    data: {
      publicName: `Test ${randomUUID().slice(0, 8)}`,
      country: 'CZ',
      isActive: true,
    },
  })
}
```

(Adjust required fields if Profile has more `@required` columns — check `schema.prisma` for `model Profile`.)

- [ ] **Step 2: Write `createPost.ts`**

```ts
import { prisma } from '@/lib/prisma'
import type { PostType } from '@prisma/client'

export async function createPost(input: {
  profileId: string
  content: string
  type: PostType
  isVisible?: boolean
  country?: string | null
  cityName?: string | null
  lat?: number | null
  lon?: number | null
}) {
  return prisma.userContent.create({
    data: {
      kind: 'post',
      postedById: input.profileId,
      content: input.content,
      isVisible: input.isVisible ?? true,
      country: input.country ?? null,
      cityName: input.cityName ?? null,
      lat: input.lat ?? null,
      lon: input.lon ?? null,
      post: { create: { type: input.type } },
    },
    include: { post: true, postedBy: { include: { profileImages: true } } },
  })
}
```

- [ ] **Step 3: Write `createEvent.ts`**

```ts
import { prisma } from '@/lib/prisma'

export async function createEvent(input: {
  profileId: string
  content: string
  startsAt: Date
  isVisible?: boolean
  country?: string | null
  cityName?: string | null
  lat?: number | null
  lon?: number | null
}) {
  return prisma.userContent.create({
    data: {
      kind: 'event',
      postedById: input.profileId,
      content: input.content,
      isVisible: input.isVisible ?? true,
      country: input.country ?? null,
      cityName: input.cityName ?? null,
      lat: input.lat ?? null,
      lon: input.lon ?? null,
      event: { create: { startsAt: input.startsAt } },
    },
    include: { event: true, postedBy: { include: { profileImages: true } } },
  })
}
```

- [ ] **Step 4: Re-run the failing test**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/userContent.service.spec.ts
```

Expected: NEW failure: `Cannot find module '@/services/userContent.service'`. Factories load correctly; service module is missing — that's next.

- [ ] **Step 5: Commit factories**

```bash
git add apps/backend/src/__tests__/factories/
git commit -m "test: add UserContent test factories"
```

### Task 3.3: Implement `UserContentService` with `findFeed`

**Files:** Create `apps/backend/src/services/userContent.service.ts`

- [ ] **Step 1: Write the minimal class**

```ts
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'

export interface ListOptions {
  limit?: number
  offset?: number
  kind?: 'post' | 'event'
}

export interface BoundsBox {
  south: number
  north: number
  west: number
  east: number
}

const profileSummaryInclude = {
  postedBy: { include: { profileImages: true } },
} as const

const profileWithContextInclude = (viewerProfileId: string) => ({
  postedBy: {
    include: {
      profileImages: true,
      ...conversationContextInclude(viewerProfileId),
    },
  },
}) as const

export type LeanContentRow = Prisma.UserContentGetPayload<{
  include: typeof profileSummaryInclude
}>

export type LeanContentRowWithContext = Prisma.UserContentGetPayload<{
  include: ReturnType<typeof profileWithContextInclude>
}>

export class UserContentService {
  private static instance: UserContentService
  protected constructor() {}
  static getInstance(): UserContentService {
    if (!UserContentService.instance) UserContentService.instance = new UserContentService()
    return UserContentService.instance
  }

  async findFeed(opts: ListOptions): Promise<LeanContentRow[]> {
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(opts.kind ? { kind: opts.kind } : {}),
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    })
  }
}
```

- [ ] **Step 2: Run the tests**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/userContent.service.spec.ts
```

Expected: all three tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/services/userContent.service.ts
git commit -m "feat(service): UserContentService base with findFeed"
```

### Task 3.4: Add `findInBounds`, `findNearby`, `findByProfileId`, `findByIdLean`

**Files:** Modify `apps/backend/src/services/userContent.service.ts` and `apps/backend/src/__tests__/services/userContent.service.spec.ts`

- [ ] **Step 1: Add failing tests for each method**

Append to `userContent.service.spec.ts`:

```ts
describe('UserContentService.findInBounds', () => {
  beforeEach(async () => { await prisma.userContent.deleteMany() })

  it('returns rows whose lat/lon falls inside the box', async () => {
    const profile = await createTestProfile()
    const inside = await createPost({ profileId: profile.id, content: 'in', type: 'OFFER', lat: 50.0, lon: 14.0 })
    await createPost({ profileId: profile.id, content: 'out', type: 'OFFER', lat: 60.0, lon: 14.0 })

    const rows = await UserContentService.getInstance().findInBounds({
      south: 49, north: 51, west: 13, east: 15,
    })
    expect(rows.map((r) => r.id)).toContain(inside.id)
    expect(rows.length).toBe(1)
  })
})

describe('UserContentService.findNearby', () => {
  beforeEach(async () => { await prisma.userContent.deleteMany() })

  it('returns rows within radius (km) of (lat, lon)', async () => {
    const profile = await createTestProfile()
    const near = await createPost({ profileId: profile.id, content: 'near', type: 'OFFER', lat: 50.0, lon: 14.0 })
    await createPost({ profileId: profile.id, content: 'far', type: 'OFFER', lat: 60.0, lon: 14.0 })

    const rows = await UserContentService.getInstance().findNearby(50.0, 14.0, 100, { limit: 20, offset: 0 })
    expect(rows.map((r) => r.id)).toContain(near.id)
    expect(rows.length).toBe(1)
  })
})

describe('UserContentService.findByIdLean', () => {
  beforeEach(async () => { await prisma.userContent.deleteMany() })

  it('returns the row with profile context when viewer != owner', async () => {
    const owner = await createTestProfile()
    const viewer = await createTestProfile()
    const post = await createPost({ profileId: owner.id, content: 'p1', type: 'OFFER' })

    const row = await UserContentService.getInstance().findByIdLean(post.id, viewer.id)
    expect(row).not.toBeNull()
    expect(row!.id).toBe(post.id)
    expect(row!.postedBy.id).toBe(owner.id)
  })

  it('returns null when row is missing or deleted', async () => {
    const row = await UserContentService.getInstance().findByIdLean('nonexistent-cuid', 'viewer-cuid')
    expect(row).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect failures**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/userContent.service.spec.ts
```

Expected: 3 new tests fail with "is not a function".

- [ ] **Step 3: Add the methods to `UserContentService`**

```ts
  async findInBounds(box: BoundsBox): Promise<LeanContentRow[]> {
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        lat: { gte: box.south, lte: box.north },
        lon: { gte: box.west, lte: box.east },
      },
      include: profileSummaryInclude,
    })
  }

  async findNearby(
    lat: number,
    lon: number,
    radiusKm: number,
    opts: ListOptions
  ): Promise<LeanContentRow[]> {
    // Approximate bounding-box prefilter (1 deg lat ≈ 111 km).
    const dLat = radiusKm / 111
    const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(opts.kind ? { kind: opts.kind } : {}),
        lat: { gte: lat - dLat, lte: lat + dLat },
        lon: { gte: lon - dLon, lte: lon + dLon },
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    })
  }

  async findByProfileId(
    profileId: string,
    opts: ListOptions & { includeInvisible?: boolean }
  ): Promise<LeanContentRow[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        isDeleted: false,
        ...(opts.includeInvisible ? {} : { isVisible: true }),
        ...(opts.kind ? { kind: opts.kind } : {}),
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    })
  }

  async findByIdLean(
    id: string,
    viewerProfileId: string
  ): Promise<LeanContentRowWithContext | null> {
    return prisma.userContent.findFirst({
      where: { id, isDeleted: false },
      include: profileWithContextInclude(viewerProfileId),
    })
  }
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/userContent.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/userContent.service.ts apps/backend/src/__tests__/services/userContent.service.spec.ts
git commit -m "feat(service): UserContentService bounds/nearby/profile/byIdLean"
```

### Task 3.5: Add `softDelete` and `setVisibility` to base

**Files:** Modify `apps/backend/src/services/userContent.service.ts` and the spec file

- [ ] **Step 1: Failing tests**

Append:

```ts
describe('UserContentService.softDelete', () => {
  beforeEach(async () => { await prisma.userContent.deleteMany() })

  it('marks own content as isDeleted', async () => {
    const profile = await createTestProfile()
    const post = await createPost({ profileId: profile.id, content: 'p1', type: 'OFFER' })

    const result = await UserContentService.getInstance().softDelete(post.id, profile.id)
    expect(result).toEqual({ id: post.id })

    const row = await prisma.userContent.findUnique({ where: { id: post.id } })
    expect(row!.isDeleted).toBe(true)
  })

  it('returns null and does not modify when viewer is not owner', async () => {
    const owner = await createTestProfile()
    const stranger = await createTestProfile()
    const post = await createPost({ profileId: owner.id, content: 'p1', type: 'OFFER' })

    const result = await UserContentService.getInstance().softDelete(post.id, stranger.id)
    expect(result).toBeNull()
    const row = await prisma.userContent.findUnique({ where: { id: post.id } })
    expect(row!.isDeleted).toBe(false)
  })
})

describe('UserContentService.setVisibility', () => {
  beforeEach(async () => { await prisma.userContent.deleteMany() })

  it('toggles isVisible for own content', async () => {
    const profile = await createTestProfile()
    const post = await createPost({ profileId: profile.id, content: 'p1', type: 'OFFER' })

    await UserContentService.getInstance().setVisibility(post.id, profile.id, false)
    const row = await prisma.userContent.findUnique({ where: { id: post.id } })
    expect(row!.isVisible).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect failures**

- [ ] **Step 3: Implement**

```ts
  async softDelete(id: string, profileId: string): Promise<{ id: string } | null> {
    const result = await prisma.userContent.updateMany({
      where: { id, postedById: profileId, isDeleted: false },
      data: { isDeleted: true },
    })
    return result.count === 1 ? { id } : null
  }

  async setVisibility(
    id: string,
    profileId: string,
    isVisible: boolean
  ): Promise<{ id: string } | null> {
    const result = await prisma.userContent.updateMany({
      where: { id, postedById: profileId, isDeleted: false },
      data: { isVisible },
    })
    return result.count === 1 ? { id } : null
  }
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/userContent.service.ts apps/backend/src/__tests__/services/userContent.service.spec.ts
git commit -m "feat(service): softDelete + setVisibility on base"
```

### Task 3.6: Rewrite `PostService` to extend `UserContentService`

**Files:** Modify `apps/backend/src/services/post.service.ts`. Update `apps/backend/src/__tests__/services/post.service.spec.ts` (or create if missing) for new shape.

- [ ] **Step 1: Inspect existing test file**

```bash
ls apps/backend/src/__tests__/services/post.service.spec.ts && head -30 apps/backend/src/__tests__/services/post.service.spec.ts
```

If absent, create one. If present, the existing tests reference `prisma.post.*` — they'll be rewritten as part of this task.

- [ ] **Step 2: Write a focused failing test for `PostService.create` first**

`apps/backend/src/__tests__/services/post.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { PostService } from '@/services/post.service'
import { createTestProfile } from '../factories/createProfile'

describe('PostService.create', () => {
  beforeEach(async () => { await prisma.userContent.deleteMany() })

  it('writes UserContent + PostExtension transactionally', async () => {
    const profile = await createTestProfile()
    const created = await PostService.getInstance().create(profile.id, {
      content: 'hello',
      type: 'OFFER',
    })

    const base = await prisma.userContent.findUnique({ where: { id: created.id } })
    const ext = await prisma.postExtension.findUnique({ where: { userContentId: created.id } })
    expect(base!.kind).toBe('post')
    expect(base!.content).toBe('hello')
    expect(ext!.type).toBe('OFFER')
  })
})

describe('PostService.update', () => {
  beforeEach(async () => { await prisma.userContent.deleteMany() })

  it('returns null on ownership mismatch', async () => {
    const owner = await createTestProfile()
    const stranger = await createTestProfile()
    const created = await PostService.getInstance().create(owner.id, {
      content: 'hello', type: 'OFFER',
    })

    const result = await PostService.getInstance().update(created.id, stranger.id, {
      content: 'tampered',
    })
    expect(result).toBeNull()
  })

  it('updates base + extension fields when caller is owner', async () => {
    const owner = await createTestProfile()
    const created = await PostService.getInstance().create(owner.id, {
      content: 'hello', type: 'OFFER',
    })
    const updated = await PostService.getInstance().update(created.id, owner.id, {
      content: 'updated', type: 'REQUEST',
    })
    expect(updated!.content).toBe('updated')
    expect(updated!.post!.type).toBe('REQUEST')
  })
})
```

- [ ] **Step 3: Run — expect compile failure (PostService doesn't have new methods)**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/post.service.spec.ts
```

- [ ] **Step 4: Rewrite `post.service.ts` in full**

```ts
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserContentService } from './userContent.service'
import type { CreatePostPayload, UpdatePostPayload } from '@zod/post/post.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'

const postWithExtensionInclude = {
  post: true,
  postedBy: { include: { profileImages: true } },
} as const

const postWithExtensionAndContextInclude = (viewerProfileId: string) => ({
  post: true,
  postedBy: {
    include: {
      profileImages: true,
      ...conversationContextInclude(viewerProfileId),
    },
  },
}) as const

export type PostWithExtension = Prisma.UserContentGetPayload<{
  include: typeof postWithExtensionInclude
}>

export type PostWithExtensionAndContext = Prisma.UserContentGetPayload<{
  include: ReturnType<typeof postWithExtensionAndContextInclude>
}>

export class PostService extends UserContentService {
  private static postInstance: PostService
  static getInstance(): PostService {
    if (!PostService.postInstance) PostService.postInstance = new PostService()
    return PostService.postInstance
  }

  async create(profileId: string, data: CreatePostPayload): Promise<PostWithExtension> {
    return prisma.userContent.create({
      data: {
        kind: 'post',
        postedById: profileId,
        content: data.content,
        country: data.country ?? null,
        cityName: data.cityName ?? null,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
        post: { create: { type: data.type } },
      },
      include: postWithExtensionInclude,
    })
  }

  async update(
    id: string,
    profileId: string,
    data: UpdatePostPayload
  ): Promise<PostWithExtension | null> {
    const owns = await prisma.userContent.findFirst({
      where: { id, postedById: profileId, kind: 'post', isDeleted: false },
      select: { id: true },
    })
    if (!owns) return null

    const baseUpdate: Prisma.UserContentUpdateInput = {}
    if (data.content !== undefined) baseUpdate.content = data.content
    if (data.country !== undefined) baseUpdate.country = data.country
    if (data.cityName !== undefined) baseUpdate.cityName = data.cityName
    if (data.lat !== undefined) baseUpdate.lat = data.lat
    if (data.lon !== undefined) baseUpdate.lon = data.lon
    if (data.isVisible !== undefined) baseUpdate.isVisible = data.isVisible

    if (data.type !== undefined) {
      baseUpdate.post = { update: { type: data.type } }
    }

    return prisma.userContent.update({
      where: { id },
      data: baseUpdate,
      include: postWithExtensionInclude,
    })
  }

  async findByIdHydrated(
    id: string,
    viewerProfileId: string
  ): Promise<PostWithExtensionAndContext | null> {
    return prisma.userContent.findFirst({
      where: { id, kind: 'post', isDeleted: false },
      include: postWithExtensionAndContextInclude(viewerProfileId),
    })
  }

  async findByProfileIdHydrated(
    profileId: string,
    opts: { limit?: number; offset?: number; includeInvisible?: boolean }
  ): Promise<PostWithExtension[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        kind: 'post',
        isDeleted: false,
        ...(opts.includeInvisible ? {} : { isVisible: true }),
      },
      include: postWithExtensionInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    })
  }
}
```

- [ ] **Step 5: Run — expect pass**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/post.service.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/services/post.service.ts apps/backend/src/__tests__/services/post.service.spec.ts
git commit -m "feat(service): PostService extends UserContentService with extension table"
```

### Task 3.7: Implement `EventService` (mirror of PostService)

**Files:** Create `apps/backend/src/services/event.service.ts` and `apps/backend/src/__tests__/services/event.service.spec.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { EventService } from '@/services/event.service'
import { createTestProfile } from '../factories/createProfile'

describe('EventService', () => {
  beforeEach(async () => { await prisma.userContent.deleteMany() })

  it('creates a UserContent + EventExtension transactionally', async () => {
    const profile = await createTestProfile()
    const created = await EventService.getInstance().create(profile.id, {
      content: 'party',
      startsAt: new Date('2027-06-01T18:00:00Z'),
    })
    const ext = await prisma.eventExtension.findUnique({ where: { userContentId: created.id } })
    expect(created.kind).toBe('event')
    expect(ext!.startsAt.toISOString()).toBe('2027-06-01T18:00:00.000Z')
  })

  it('updates startsAt for the owner', async () => {
    const owner = await createTestProfile()
    const created = await EventService.getInstance().create(owner.id, {
      content: 'party',
      startsAt: new Date('2027-06-01T18:00:00Z'),
    })
    const updated = await EventService.getInstance().update(created.id, owner.id, {
      startsAt: new Date('2027-07-01T18:00:00Z'),
    })
    expect(updated!.event!.startsAt.toISOString()).toBe('2027-07-01T18:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run — expect failure (no module)**

- [ ] **Step 3: Write `event.service.ts`** (mirror of `post.service.ts`)

```ts
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserContentService } from './userContent.service'
import type { CreateEventPayload, UpdateEventPayload } from '@zod/event/event.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'

const eventWithExtensionInclude = {
  event: true,
  postedBy: { include: { profileImages: true } },
} as const

const eventWithExtensionAndContextInclude = (viewerProfileId: string) => ({
  event: true,
  postedBy: {
    include: {
      profileImages: true,
      ...conversationContextInclude(viewerProfileId),
    },
  },
}) as const

export type EventWithExtension = Prisma.UserContentGetPayload<{
  include: typeof eventWithExtensionInclude
}>

export type EventWithExtensionAndContext = Prisma.UserContentGetPayload<{
  include: ReturnType<typeof eventWithExtensionAndContextInclude>
}>

export class EventService extends UserContentService {
  private static eventInstance: EventService
  static getInstance(): EventService {
    if (!EventService.eventInstance) EventService.eventInstance = new EventService()
    return EventService.eventInstance
  }

  async create(profileId: string, data: CreateEventPayload): Promise<EventWithExtension> {
    return prisma.userContent.create({
      data: {
        kind: 'event',
        postedById: profileId,
        content: data.content,
        country: data.country ?? null,
        cityName: data.cityName ?? null,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
        event: { create: { startsAt: data.startsAt } },
      },
      include: eventWithExtensionInclude,
    })
  }

  async update(
    id: string,
    profileId: string,
    data: UpdateEventPayload
  ): Promise<EventWithExtension | null> {
    const owns = await prisma.userContent.findFirst({
      where: { id, postedById: profileId, kind: 'event', isDeleted: false },
      select: { id: true },
    })
    if (!owns) return null

    const baseUpdate: Prisma.UserContentUpdateInput = {}
    if (data.content !== undefined) baseUpdate.content = data.content
    if (data.country !== undefined) baseUpdate.country = data.country
    if (data.cityName !== undefined) baseUpdate.cityName = data.cityName
    if (data.lat !== undefined) baseUpdate.lat = data.lat
    if (data.lon !== undefined) baseUpdate.lon = data.lon
    if (data.isVisible !== undefined) baseUpdate.isVisible = data.isVisible
    if (data.startsAt !== undefined) {
      baseUpdate.event = { update: { startsAt: data.startsAt } }
    }

    return prisma.userContent.update({
      where: { id },
      data: baseUpdate,
      include: eventWithExtensionInclude,
    })
  }

  async findByIdHydrated(
    id: string,
    viewerProfileId: string
  ): Promise<EventWithExtensionAndContext | null> {
    return prisma.userContent.findFirst({
      where: { id, kind: 'event', isDeleted: false },
      include: eventWithExtensionAndContextInclude(viewerProfileId),
    })
  }

  async findByProfileIdHydrated(
    profileId: string,
    opts: { limit?: number; offset?: number; includeInvisible?: boolean }
  ): Promise<EventWithExtension[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        kind: 'event',
        isDeleted: false,
        ...(opts.includeInvisible ? {} : { isVisible: true }),
      },
      include: eventWithExtensionInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    })
  }
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/event.service.ts apps/backend/src/__tests__/services/event.service.spec.ts
git commit -m "feat(service): EventService"
```

---

## Phase 4 — Backend Mappers and Cluster/Search

### Task 4.1: Add `mapLeanContent` mapper for unified reads

**Files:** Create `apps/backend/src/api/mappers/userContent.mappers.ts`, test in `apps/backend/src/__tests__/api/userContent.mappers.spec.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { mapLeanContent, mapLeanContentDetail } from '@/api/mappers/userContent.mappers'
import type { LeanContentRow } from '@/services/userContent.service'

describe('mapLeanContent', () => {
  it('produces LeanUserContent shape with isOwn=true when viewer is poster', () => {
    const row: LeanContentRow = {
      id: 'c1', kind: 'post', content: 'x',
      isDeleted: false, isVisible: true,
      country: 'CZ', cityName: 'Prague', lat: 50, lon: 14,
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
      postedById: 'p1',
      postedBy: { id: 'p1', publicName: 'X', profileImages: [] } as any,
    }
    const dto = mapLeanContent(row, 'p1')
    expect(dto.isOwn).toBe(true)
    expect(dto.kind).toBe('post')
  })
})
```

- [ ] **Step 2: Implement**

```ts
import type { LeanContentRow, LeanContentRowWithContext } from '@/services/userContent.service'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { extractLocation } from './location.mappers'
import type {
  LeanUserContent,
} from '@zod/userContent/userContent.dto'

export function mapLeanContent(
  row: LeanContentRow,
  viewerProfileId: string
): LeanUserContent {
  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row),
  }
}

export function mapLeanContentDetail(
  row: LeanContentRowWithContext,
  viewerProfileId: string
) {
  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: {
      ...mapProfileSummary(row.postedBy),
      ...mapConversationContext(row.postedBy, viewerProfileId),
    },
    location: extractLocation(row),
  }
}
```

- [ ] **Step 3: Run — expect pass; commit**

```bash
pnpm --filter backend exec vitest run src/__tests__/api/userContent.mappers.spec.ts
git add apps/backend/src/api/mappers/userContent.mappers.ts apps/backend/src/__tests__/api/userContent.mappers.spec.ts
git commit -m "feat(mapper): mapLeanContent for unified reads"
```

### Task 4.2: Update Post mappers for new row shape

**Files:** Modify `apps/backend/src/api/mappers/post.mappers.ts` and its existing spec

- [ ] **Step 1: Inspect existing spec to understand current expectations**

```bash
cat apps/backend/src/__tests__/api/post.mappers.spec.ts
```

- [ ] **Step 2: Update tests for new input row shape**

The existing `mapDbPostToOwner(post)` etc. will now receive `PostWithExtension` (from `post.service.ts`) instead of the old `PostWithProfile` (which had `type` directly on `post`). Update tests' fixture rows to:
```ts
const row: PostWithExtension = {
  id: 'c1', kind: 'post', content: 'x',
  isDeleted: false, isVisible: true,
  country: null, cityName: null, lat: null, lon: null,
  createdAt: new Date(), updatedAt: new Date(),
  postedById: 'p1',
  post: { userContentId: 'c1', type: 'OFFER' },
  postedBy: { ...minimalProfileFixture },
} as any
```
Then assert `mapDbPostToOwner(row).type === 'OFFER'`.

- [ ] **Step 3: Update the mapper implementations**

```ts
import type {
  PostWithExtension,
  PostWithExtensionAndContext,
} from '@/services/post.service'
import { OwnerPostSchema, type OwnerPost, type PublicPost, type PublicPostDetail } from '@zod/post/post.dto'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { extractLocation } from './location.mappers'

export function mapDbPostToOwner(row: PostWithExtension): OwnerPost {
  return OwnerPostSchema.parse({
    id: row.id,
    kind: 'post',
    type: row.post!.type,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: row.isDeleted,
    isVisible: row.isVisible,
    isOwn: true,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row),
  })
}

export function mapDbPostToPublic(
  row: PostWithExtension,
  viewerProfileId: string
): PublicPost {
  return {
    id: row.id,
    kind: 'post',
    type: row.post!.type,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row),
  }
}

export function mapDbPostToDetail(
  row: PostWithExtensionAndContext,
  viewerProfileId: string
): PublicPostDetail {
  return {
    id: row.id,
    kind: 'post',
    type: row.post!.type,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: false,
    postedBy: {
      ...mapProfileSummary(row.postedBy),
      ...mapConversationContext(row.postedBy, viewerProfileId),
    },
    location: extractLocation(row),
  }
}

// mapPostSummary stays — its DbPostForSummary type is now sourced from a UserContent row.
```

- [ ] **Step 4: Run — expect pass; commit**

```bash
pnpm --filter backend exec vitest run src/__tests__/api/post.mappers.spec.ts
git add apps/backend/src/api/mappers/post.mappers.ts apps/backend/src/__tests__/api/post.mappers.spec.ts
git commit -m "refactor(mapper): post mappers consume PostWithExtension rows"
```

### Task 4.3: Add Event mappers

**Files:** Create `apps/backend/src/api/mappers/event.mappers.ts`, `apps/backend/src/__tests__/api/event.mappers.spec.ts`

- [ ] **Step 1: Failing test**

Mirror `post.mappers.spec.ts` substituting `event` everywhere — fixture row has `event: { userContentId, startsAt }` instead of `post: { ... }`.

- [ ] **Step 2: Implement** — mirror `post.mappers.ts` substituting Event schemas/types and `event` extension. Replace `type: row.post!.type` with `startsAt: row.event!.startsAt`.

- [ ] **Step 3: Run + commit**

```bash
git add apps/backend/src/api/mappers/event.mappers.ts apps/backend/src/__tests__/api/event.mappers.spec.ts
git commit -m "feat(mapper): event mappers"
```

### Task 4.4: Update ClusterService to use UserContentService

**Files:** Modify `apps/backend/src/services/cluster.service.ts` and its spec; modify `packages/shared/maps.ts`

- [ ] **Step 1: Add `'event'` to `USER_CONTENT_KINDS`**

In `packages/shared/maps.ts`, change:
```ts
export const USER_CONTENT_KINDS = ['profile', 'post'] as const
```
to:
```ts
export const USER_CONTENT_KINDS = ['profile', 'post', 'event'] as const
```

- [ ] **Step 2: Inspect cluster.service.ts to find the post-source call site**

```bash
grep -n "PostService\|prisma.post\|findInBounds" apps/backend/src/services/cluster.service.ts
```

Note the line number where `PostService.getInstance().findInBounds(...)` (or equivalent) is called.

- [ ] **Step 3: Update the test first**

Update `apps/backend/src/__tests__/services/cluster.service.spec.ts` to add a test that mixed kinds appear in the index (one Post + one Event in bounds → both appear with correct `kind`).

- [ ] **Step 4: Update the source**

Replace the `PostService.findInBounds(...)` call with `UserContentService.getInstance().findInBounds(...)`. Update the `PointProperties` shape in cluster.service.ts so `kind: 'profile' | 'post' | 'event'`. Where `postType` is set, branch on the row's `kind` and pull `row.post?.type` (after a Prisma `include: { post: true }`) or skip for events.

The exact diff depends on the file's current state — read it first, write the change, run the spec, iterate.

- [ ] **Step 5: Run — expect pass**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/cluster.service.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/services/cluster.service.ts apps/backend/src/__tests__/services/cluster.service.spec.ts packages/shared/maps.ts
git commit -m "refactor(cluster): source from UserContentService; add event kind"
```

### Task 4.5: Update SearchService to query UserContent

**Files:** Modify `apps/backend/src/services/search.service.ts` and its spec

- [ ] **Step 1: Failing test**

Add to `search.service.spec.ts`: a test that searches return mixed-kind results when both a matching Post and Event exist; a test that `kind` filter narrows results.

- [ ] **Step 2: Update source**

Replace `prisma.post.findMany({ where: { content: { contains: term } } })` with:

```ts
prisma.userContent.findMany({
  where: {
    isDeleted: false,
    isVisible: true,
    content: { contains: term, mode: 'insensitive' },
    ...(kindFilter ? { kind: kindFilter } : {}),
    // existing blocklist where clause
  },
  include: { post: true, event: true, postedBy: { include: { profileImages: true } } },
  take: 20,
})
```

Update the result mapper accordingly — search result items should carry `kind` and the relevant extension fields.

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/search.service.spec.ts
git add apps/backend/src/services/search.service.ts apps/backend/src/__tests__/services/search.service.spec.ts
git commit -m "refactor(search): query UserContent; supports kind filter"
```

---

## Phase 5 — Backend Routes

### Task 5.1: Write the unified content route

**Files:** Create `apps/backend/src/api/routes/content.route.ts`, test in `apps/backend/src/__tests__/routes/content.route.spec.ts`

- [ ] **Step 1: Failing test for `GET /feed`**

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import buildApp from '@/main.test-helper'  // or however the test app is built
import { createTestProfile } from '../factories/createProfile'
import { createPost } from '../factories/createPost'
import { createEvent } from '../factories/createEvent'

describe('GET /api/content/feed', () => {
  // ... beforeAll boots app, authenticates as a profile, etc.

  it('returns mixed-kind lean items', async () => {
    const profile = await createTestProfile()
    await createPost({ profileId: profile.id, content: 'p1', type: 'OFFER' })
    await createEvent({ profileId: profile.id, content: 'e1', startsAt: new Date('2027-01-01') })

    const res = await app.inject({
      method: 'GET',
      url: '/api/content/feed',
      headers: { /* auth */ },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.items.map((i: any) => i.kind).sort()).toEqual(['event', 'post'])
  })
})
```

(Mirror the existing `routes/post.route.spec.ts` pattern for app boot + auth.)

- [ ] **Step 2: Run — expect 404 / route not found**

- [ ] **Step 3: Implement `content.route.ts`**

```ts
import type { FastifyPluginAsync } from 'fastify'
import { UserContentService } from '@/services/userContent.service'
import { PostService } from '@/services/post.service'
import { EventService } from '@/services/event.service'
import { mapLeanContent, mapLeanContentDetail } from '../mappers/userContent.mappers'
import { mapDbPostToDetail, mapDbPostToOwner } from '../mappers/post.mappers'
import { mapDbEventToDetail, mapDbEventToOwner } from '../mappers/event.mappers'
import {
  UserContentQuerySchema,
  NearbyContentQuerySchema,
  ContentParamsSchema,
} from '@zod/userContent/userContent.dto'
import { BoundsQuerySchema } from '@zod/dto/bounds.dto'
import { sendError } from '../helpers'

const contentRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = UserContentService.getInstance()

  fastify.get('/feed', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const query = UserContentQuerySchema.parse(req.query)
    const rows = await svc.findFeed(query)
    const items = rows.map((r) => mapLeanContent(r, req.session.profileId))
    return reply.code(200).send({ success: true, items })
  })

  fastify.get('/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const parsed = BoundsQuerySchema.safeParse(req.query)
    if (!parsed.success) return sendError(reply, 400, 'Invalid bounds')
    const rows = await svc.findInBounds(parsed.data)
    const items = rows.map((r) => mapLeanContent(r, req.session.profileId))
    return reply.code(200).send({ success: true, items })
  })

  fastify.get('/nearby', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const q = NearbyContentQuerySchema.parse(req.query)
    const rows = await svc.findNearby(q.lat, q.lon, q.radius, q)
    const items = rows.map((r) => mapLeanContent(r, req.session.profileId))
    return reply.code(200).send({ success: true, items })
  })

  fastify.get('/profile/:profileId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = (req.params as any).profileId as string
    const q = UserContentQuerySchema.parse(req.query)
    const rows = await svc.findByProfileId(profileId, {
      ...q,
      includeInvisible: req.session.profileId === profileId,
    })
    const items = rows.map((r) => mapLeanContent(r, req.session.profileId))
    return reply.code(200).send({ success: true, items })
  })

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = ContentParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId
    const lean = await svc.findByIdLean(id, viewerProfileId)
    if (!lean) return sendError(reply, 404, 'Content not found')

    const isOwner = lean.postedById === viewerProfileId

    if (lean.kind === 'post') {
      const hydrated = await PostService.getInstance().findByIdHydrated(id, viewerProfileId)
      if (!hydrated) return sendError(reply, 404, 'Content not found')
      const item = isOwner ? mapDbPostToOwner(hydrated) : mapDbPostToDetail(hydrated, viewerProfileId)
      return reply.code(200).send({ success: true, item })
    }

    const hydrated = await EventService.getInstance().findByIdHydrated(id, viewerProfileId)
    if (!hydrated) return sendError(reply, 404, 'Content not found')
    const item = isOwner ? mapDbEventToOwner(hydrated) : mapDbEventToDetail(hydrated, viewerProfileId)
    return reply.code(200).send({ success: true, item })
  })
}

export default contentRoutes
```

- [ ] **Step 4: Register in `apps/backend/src/api/index.ts`**

Add (next to other route registrations):
```ts
import contentRoutes from './routes/content.route'
// ...
fastify.register(contentRoutes, { prefix: '/content' })
```

- [ ] **Step 5: Run — expect pass; commit**

```bash
pnpm --filter backend exec vitest run src/__tests__/routes/content.route.spec.ts
git add apps/backend/src/api/routes/content.route.ts apps/backend/src/api/index.ts apps/backend/src/__tests__/routes/content.route.spec.ts
git commit -m "feat(route): unified /api/content reads"
```

### Task 5.2: Move post route under /content/posts

**Files:** Create `apps/backend/src/api/routes/content/post.route.ts`. Delete old `apps/backend/src/api/routes/post.route.ts`. Move `apps/backend/src/__tests__/routes/post.route.spec.ts` → `apps/backend/src/__tests__/routes/content/post.route.spec.ts` and update.

- [ ] **Step 1: Read existing route file**

```bash
cat apps/backend/src/api/routes/post.route.ts
```

- [ ] **Step 2: Create the new file at the new path**

The handlers stay similar; only the service shape (now returns `PostWithExtension`) and mapper shape have changed. Replace every reference to the old `PostService` row type with `PostWithExtension`.

```ts
import type { FastifyPluginAsync } from 'fastify'
import { PostService } from '@/services/post.service'
import { ClusterService } from '@/services/cluster.service'
import {
  CreatePostPayloadSchema,
  UpdatePostPayloadSchema,
  PostParamsSchema,
} from '@zod/post/post.dto'
import { mapDbPostToOwner, mapDbPostToDetail } from '../../mappers/post.mappers'
import { rateLimitConfig, sendError, validateBody } from '../../helpers'

const postRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = PostService.getInstance()
  const cluster = ClusterService.getInstance()

  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 10),
    },
    async (req, reply) => {
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const data = validateBody(CreatePostPayloadSchema, req, reply)
      if (!data) return
      const created = await svc.create(profileId, data)
      await cluster.evictAll()
      return reply.code(201).send({ success: true, post: mapDbPostToOwner(created) })
    }
  )

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = PostParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId
    const row = await svc.findByIdHydrated(id, viewerProfileId)
    if (!row) return sendError(reply, 404, 'Post not found')
    const isOwner = row.postedById === viewerProfileId
    const post = isOwner ? mapDbPostToOwner(row) : mapDbPostToDetail(row, viewerProfileId)
    return reply.code(200).send({ success: true, post })
  })

  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const { id } = PostParamsSchema.parse(req.params)
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const data = validateBody(UpdatePostPayloadSchema, req, reply)
      if (!data) return
      const row = await svc.update(id, profileId, data)
      if (!row) return sendError(reply, 404, 'Post not found or access denied')
      await cluster.evictAll()
      return reply.code(200).send({ success: true, post: mapDbPostToOwner(row) })
    }
  )

  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const { id } = PostParamsSchema.parse(req.params)
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const result = await svc.softDelete(id, profileId)
      if (!result) return sendError(reply, 404, 'Post not found or access denied')
      await cluster.evictAll()
      return reply.code(200).send({ success: true })
    }
  )

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 401, 'Profile required')
    const rows = await svc.findByProfileIdHydrated(profileId, { includeInvisible: true })
    return reply.code(200).send({ success: true, posts: rows.map(mapDbPostToOwner) })
  })

  fastify.get('/profile/:profileId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = (req.params as any).profileId as string
    const viewerProfileId = req.session.profileId
    const rows = await svc.findByProfileIdHydrated(profileId, {
      includeInvisible: viewerProfileId === profileId,
    })
    return reply.code(200).send({
      success: true,
      posts: rows.map((r) =>
        viewerProfileId === profileId ? mapDbPostToOwner(r) : mapDbPostToDetail(r as any, viewerProfileId)
      ),
    })
  })
}

export default postRoutes
```

- [ ] **Step 3: Delete old route file**

```bash
git rm apps/backend/src/api/routes/post.route.ts
```

- [ ] **Step 4: Register in `api/index.ts`**

Replace `fastify.register(postRoutes, { prefix: '/posts' })` with:
```ts
import postRoutes from './routes/content/post.route'
// ...
fastify.register(postRoutes, { prefix: '/content/posts' })
```

- [ ] **Step 5: Move + update the existing route spec**

```bash
git mv apps/backend/src/__tests__/routes/post.route.spec.ts apps/backend/src/__tests__/routes/content/post.route.spec.ts
```

Open it, replace every `/api/posts/...` URL with `/api/content/posts/...`, and replace any `prisma.post.create` calls with `createPost(...)` factory. Update assertions on `post.type` to read `post.type` from the response (the wire shape still has `type` on the post DTO).

- [ ] **Step 6: Run + commit**

```bash
pnpm --filter backend exec vitest run src/__tests__/routes/content/post.route.spec.ts
git add -A
git commit -m "feat(route): move post routes to /content/posts"
```

### Task 5.3: Add Event routes

**Files:** Create `apps/backend/src/api/routes/content/event.route.ts`, test in `apps/backend/src/__tests__/routes/content/event.route.spec.ts`

- [ ] **Step 1: Mirror post.route.ts** — same shape, replacing `PostService` with `EventService`, `Create/UpdatePostPayloadSchema` with Event equivalents, `mapDbPostTo*` with `mapDbEventTo*`, response key `post` → `event` (singular) / `events` (plural).

- [ ] **Step 2: Register in api/index.ts**

```ts
import eventRoutes from './routes/content/event.route'
// ...
fastify.register(eventRoutes, { prefix: '/content/events' })
```

- [ ] **Step 3: Mirror the post route spec for event coverage**

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter backend exec vitest run src/__tests__/routes/content/event.route.spec.ts
git add -A
git commit -m "feat(route): /content/events CRUD"
```

### Task 5.4: Run full backend suite to catch regressions

- [ ] **Step 1: Migrate any remaining `prisma.post.*` references in tests**

```bash
grep -rln "prisma.post\b" apps/backend/src/__tests__
```

For every hit, replace with `createPost(...)` from the factory. Commit per logical batch:

```bash
git commit -m "test: migrate prisma.post.create calls to createPost factory"
```

- [ ] **Step 2: Run full backend suite**

```bash
pnpm --filter backend test 2>&1 | tail -10
```

Expected: all green. If any test fails because it referenced removed symbols (`PostService.findById`, `PostService.findByIdWithContext`, etc.), update its expectations to the new API. Each fix in its own commit.

- [ ] **Step 3: Run type-check**

```bash
pnpm type-check 2>&1 | tail -5
```

Expected: green.

---

## Phase 6 — Frontend

### Task 6.1: Update postStore for new URL prefix and DTO

**Files:** Modify `apps/frontend/src/features/posts/stores/postStore.ts`. Update `apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts` (if absent, create).

- [ ] **Step 1: Inspect the current store**

```bash
cat apps/frontend/src/features/posts/stores/postStore.ts
```

- [ ] **Step 2: Update URL prefix in every API call**

Replace every `/api/posts/...` with `/api/content/posts/...`. The DTO shape change is minimal at the wire level (kind: 'post' is now present), so existing TS types from `@zod/post/post.dto` will recompile against the new schemas.

- [ ] **Step 3: Run frontend tests**

```bash
pnpm --filter frontend exec vitest run src/features/posts/stores/__tests__/postStore.spec.ts
```

Update any test assertions that check `currentItem.type` directly — same shape applies.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(post-store): retarget to /api/content/posts"
```

### Task 6.2: Add eventStore (parallel to postStore, no shared abstraction)

**Files:** Create `apps/frontend/src/features/events/stores/eventStore.ts`, `apps/frontend/src/features/events/stores/__tests__/eventStore.spec.ts`

- [ ] **Step 1: Inspect the post store as the template**

```bash
cat apps/frontend/src/features/posts/stores/postStore.ts | head -120
```

- [ ] **Step 2: Failing test (mirroring postStore tests)**

```ts
// eventStore.spec.ts — minimal first test
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEventStore } from '../eventStore'

describe('useEventStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts with empty items', () => {
    const store = useEventStore()
    expect(store.items).toEqual([])
  })
})
```

- [ ] **Step 3: Implement `eventStore.ts` as a near-clone of postStore** — replace Post types with Event types, basePath `/posts` with `/content/events`, store name `'posts'` with `'events'`. **Do not extract a shared abstraction** — the duplication is intentional per the spec.

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter frontend exec vitest run src/features/events/stores/__tests__/eventStore.spec.ts
git add apps/frontend/src/features/events/
git commit -m "feat(event-store): add Pinia store for events"
```

### Task 6.3: Add Event UI components

**Files:** Create the components listed in "File Structure" → events. Each is a near-clone of its Post counterpart:
- `EventCard.vue` ← `PostCard.vue` (replace post fields with event; `startsAt` rendered as a formatted date)
- `EventFullView.vue` ← `PostFullView.vue`
- `EditEventDialog.vue` ← `EditPostDialog.vue` with date-time picker for `startsAt`
- `EventMapPopup.vue` ← `PostMapPopup.vue`
- `EventMarker.vue` ← `PostMarker.vue` with different icon
- `eventMapIcon.ts` + `.scss` ← post equivalents
- `useEventListViewModel.ts` ← `usePostListViewModel.ts`

- [ ] **Step 1: For each component, copy → rename → swap Post types and store** to Event. Run `pnpm --filter frontend exec vitest run` after each component to catch regressions.

- [ ] **Step 2: Commit per component**

```bash
git commit -m "feat(event-ui): add <ComponentName>"
```

### Task 6.4: Add ContentFeedItem dispatcher and unified feed wiring

**Files:** Create `apps/frontend/src/features/browse/components/ContentFeedItem.vue`. Modify `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts` and `apps/frontend/src/features/browse/views/BrowseProfiles.vue`.

- [ ] **Step 1: Failing test for `ContentFeedItem.vue`**

```ts
// __tests__/ContentFeedItem.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ContentFeedItem from '../ContentFeedItem.vue'

describe('ContentFeedItem', () => {
  it('renders PostCard for kind=post', () => {
    const w = mount(ContentFeedItem, {
      props: { item: { id: '1', kind: 'post', /* ... */ } as any },
      global: { stubs: { PostCard: { template: '<div data-test="post-card" />' }, EventCard: true } },
    })
    expect(w.find('[data-test="post-card"]').exists()).toBe(true)
  })

  it('renders EventCard for kind=event', () => {
    const w = mount(ContentFeedItem, {
      props: { item: { id: '1', kind: 'event', /* ... */ } as any },
      global: { stubs: { PostCard: true, EventCard: { template: '<div data-test="event-card" />' } } },
    })
    expect(w.find('[data-test="event-card"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Implement**

```vue
<template>
  <PostCard v-if="item.kind === 'post'" :post="item" />
  <EventCard v-else-if="item.kind === 'event'" :event="item" />
</template>

<script setup lang="ts">
import PostCard from '@/features/posts/components/PostCard.vue'
import EventCard from '@/features/events/components/EventCard.vue'
import type { LeanUserContent } from '@zod/userContent/userContent.dto'
defineProps<{ item: LeanUserContent }>()
</script>
```

- [ ] **Step 3: Wire the unified feed in `useBrowseViewModel.ts`**

Add a `fetchUnifiedFeed()` action that calls `/api/content/feed` and stores results. The browse view renders `<ContentFeedItem v-for="item in items" :item="item" />` instead of `<PostCard>`.

- [ ] **Step 4: Update `BrowseProfiles.vue`** — swap the `<PostCard>` v-for for `<ContentFeedItem>`. Map popup dispatch: branch on `feature.kind` to render `<PostMapPopup>` or `<EventMapPopup>`.

- [ ] **Step 5: Run frontend tests + commit**

```bash
pnpm --filter frontend test 2>&1 | tail -10
git add -A
git commit -m "feat(browse): unified feed renders mixed kinds via ContentFeedItem"
```

### Task 6.5: Add unified `/content/:id` route and Event router entries

**Files:** Modify `apps/frontend/src/router/index.ts`. Possibly create `apps/frontend/src/views/ContentDetailView.vue`.

- [ ] **Step 1: Add Event routes**

In `router/index.ts`, parallel to the existing `me/posts` block:

```ts
browseRoute('events/:eventId', 'PublicEvent'),
// ... and within the me/* block:
browseRoute('me/events', 'MeEvents'),
browseRoute('me/events/new', 'MeCreateEvent'),
browseRoute('me/events/:eventId/edit', 'MeEditEvent'),
```

- [ ] **Step 2: Add unified detail route**

```ts
browseRoute('content/:contentId', 'ContentDetail'),
```

with `ContentDetailView.vue` calling `GET /api/content/:id`, then rendering `EventFullView` or `PostFullView` based on `kind`.

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter frontend test 2>&1 | tail -5
git add -A
git commit -m "feat(router): add event + unified content routes"
```

---

## Phase 7 — Finalization

### Task 7.1: Add changeset

**Files:** Create `.changeset/user-content-polymorphism.md`

- [ ] **Step 1: Write file**

```markdown
---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

Generalize Post into UserContent polymorphic family. Adds Event as a second content kind. Unified `/api/content/*` reads (feed/bounds/nearby/detail) operate on all kinds uniformly via class-table inheritance. Per-kind CRUD moves to `/api/content/posts/*` and `/api/content/events/*`. Map cluster, search, and supercluster layers see all kinds without per-kind branching.
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/user-content-polymorphism.md
git commit -m "chore: changeset for UserContent polymorphism"
```

### Task 7.2: Run full CI suite locally

- [ ] **Step 1: Format only modified files**

```bash
git diff --name-only main..HEAD | grep -E '\.(ts|vue|json|md)$' | xargs pnpm exec prettier --write
git add -A
git diff --staged --name-only | head
git commit -m "style: prettier-format edited files" || echo "nothing to commit"
```

- [ ] **Step 2: Run the full CI mirror**

```bash
pnpm run ci:test 2>&1 | tail -30
```

Expected: green. If anything fails, fix and add a follow-up commit. Repeat until clean.

### Task 7.3: Push and open PR

- [ ] **Step 1: Push**

```bash
git push -u origin feat/user-content-polymorphism
```

- [ ] **Step 2: Open PR** (only when revert PR #1436 is merged to main, OR set base = `revert/user-content-abstraction-1406-1407` if not yet merged)

```bash
gh pr create --title "feat(content): UserContent polymorphism with class-table inheritance" \
  --body "$(cat <<'EOF'
## Summary
- Introduces `UserContent` base table + per-kind extension tables (`PostExtension`, `EventExtension`)
- Adds `Event` as a second content kind alongside Post
- Unified `/api/content/*` reads operate kind-agnostically (feed, bounds, nearby, profile-list)
- Per-kind CRUD lives at `/api/content/posts/*` and `/api/content/events/*` with kind-specific Zod payloads
- Service hierarchy: concrete `UserContentService` (unified reads + cross-kind ops) extended by `PostService` and `EventService`
- Frontend: per-kind stores (no shared composable), unified feed via `ContentFeedItem` dispatcher

## Design
[`docs/superpowers/specs/2026-05-08-user-content-polymorphism-design.md`](docs/superpowers/specs/2026-05-08-user-content-polymorphism-design.md)

## Test plan
- [ ] CI passes on this PR
- [ ] Manual smoke test in dev: create/edit/delete a Post; create/edit/delete an Event; map shows mixed pins; search returns mixed results; unified feed list renders correctly
- [ ] Verify migration on a copy of production data before deploy
EOF
)"
```

- [ ] **Step 3: Watch CI in the background**

```bash
gh run watch --exit-status &
```

If CI fails, follow CLAUDE.md's CI workflow: `gh run view --log-failed`, fix, push, re-watch.

---

## Self-Review

**Spec coverage:**
- §3.1 ContentKind enum → Task 1.1
- §3.2 UserContent base table → Task 1.1
- §3.3 Extension tables → Task 1.1
- §3.4 Profile relation change → Task 1.1
- §3.6 Data migration → Task 1.2
- §4 DTO layer → Tasks 2.1, 2.2, 2.3, 2.4
- §5.1 UserContentService base → Tasks 3.3, 3.4, 3.5
- §5.2 PostService subclass → Task 3.6
- §5.3 EventService subclass → Task 3.7
- §5.4 transactional helper → *not added as a separate helper; the create/update logic in 3.6 and 3.7 is small enough to inline. Spec said "subclasses go through this helper"; this plan inlines instead, accepting minor duplication. **Acceptable simplification given two kinds.***
- §6.1 file layout → Task 5.1, 5.2, 5.3
- §6.2 unified reads → Task 5.1
- §6.3 per-kind CRUD → Tasks 5.2, 5.3
- §6.4 cluster cache eviction → Tasks 5.2, 5.3 (each route calls `cluster.evictAll()`)
- §6.5 registration → Tasks 5.1, 5.2, 5.3
- §7 Cluster + supercluster + search → Tasks 4.4, 4.5
- §8.1 Frontend stores → Tasks 6.1, 6.2
- §8.2 Components → Task 6.3, 6.4
- §8.3 Routes → Task 6.5
- §9.1 New backend tests → tasks throughout Phase 3, 4, 5
- §9.2 New frontend tests → Tasks 6.2, 6.4
- §9.3 Test fixtures → Task 3.2
- §10 Migration & deployment → Task 1.2 (`Pre-deploy checklist` lives in spec — engineer references the spec at deploy time)
- §11 Decisions log → no task; documentation only

**Placeholder scan:** No "TBD"/"TODO" markers remain. A few "(if absent — add)" notes for tests are inspect-then-act, not placeholders.

**Type consistency:**
- `LeanContentRow` defined in 3.3, referenced in 4.1 ✓
- `PostWithExtension`, `PostWithExtensionAndContext` defined in 3.6, used in 4.2, 5.2 ✓
- `EventWithExtension`, `EventWithExtensionAndContext` defined in 3.7, used in 4.3, 5.3 ✓
- `ContentKindSchema`, `LeanUserContentSchema` defined in 2.1, used everywhere ✓
- `mapLeanContent` defined in 4.1, used in 5.1 ✓
- `mapDbPostToOwner/Detail/Public` defined in 4.2, used in 5.1, 5.2 ✓
- `mapDbEventToOwner/Detail` defined in 4.3, used in 5.1, 5.3 ✓

All matches. Plan is internally consistent.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-08-user-content-polymorphism.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration through the ~25 tasks.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**

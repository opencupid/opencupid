# UserContent Backend Abstraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a UserContent abstraction layer behind the API boundary (Zod base schemas, mapper projection helpers, service interface, and Fastify route factory) so a future Event content type can compose with Post on the same shared infrastructure — *without changing the wire format or any consumer code*.

**Architecture:** The wire format and all public type names (`PublicPostWithProfile`, `OwnerPost`, `PostSummary`, `PublicPostDetail`, `CreatePostPayload`, etc.) are preserved exactly. The refactor introduces:
- `packages/shared/zod/userContent/userContent.dto.ts` — shared field sets and base Zod schemas
- `apps/backend/src/api/mappers/userContent.mappers.ts` — projection helpers for shared fields
- `apps/backend/src/services/userContent.service.ts` — `UserContentService<...>` interface
- `apps/backend/src/api/routes/userContent.route-factory.ts` — `makeUserContentRoutes(config)` Fastify plugin factory

Then the existing post-side files become thin compositions: `post.dto.ts` extends UserContent schemas with `type`, `post.mappers.ts` is one-line overlays, `post.service.ts` adds `implements UserContentService<...>` plus return-type annotations, `post.route.ts` becomes a ~40-line config call.

**Tech Stack:** TypeScript, Zod, Prisma, Fastify, pnpm/Turbo monorepo, Vitest.

**Branch:** `refactor/user-content-backend-abstraction` (already created).
**Worktree:** `.worktrees/user-content-backend-abstraction` (already created).

---

## Out of scope (explicitly deferred)

- Frontend Pinia store refactor — separate PR (PR 2).
- Event Prisma model — separate PR (PR 3, when Event is wanted).
- `findInBounds` SELECT narrowing (perf optimization) — separate standalone PR.
- Wire envelope standardization (`{item: ...}` instead of `{post: ...}`) — not needed; factory accepts configurable `wire.singular`/`wire.plural`.
- Equalizing the parse asymmetry between Public partial-parse and Owner full-parse — preserved as-is.
- Promoting `ProfileParamsSchema` to `@zod/dto/params.dto.ts` — declared locally for now.

---

## Pre-flight verification (Task 0)

### Task 0: Verify clean baseline

**Files:** none modified

- [ ] **Step 1: Confirm we're on the correct branch in the worktree**

Run from the worktree root:
```bash
git rev-parse --abbrev-ref HEAD
```
Expected: `refactor/user-content-backend-abstraction`

- [ ] **Step 2: Confirm dependencies are installed**

```bash
ls node_modules/.pnpm | head -3
```
Expected: pnpm dirs present (e.g. `vue@3...`).

- [ ] **Step 3: Run type-check to confirm pre-existing baseline is green**

```bash
pnpm type-check
```
Expected: 0 errors.

- [ ] **Step 4: Run backend post tests to confirm pre-existing baseline is green**

```bash
pnpm --filter backend exec vitest run --dir src/api/routes --dir src/api/mappers --dir src/services
```
Expected: all green.

If any of the above fail, stop and investigate before proceeding — these are pre-existing issues unrelated to this refactor.

---

## Task 1: Create UserContent shared field sets and base schemas

**Files:**
- Create: `packages/shared/zod/userContent/userContent.dto.ts`

**Context:** UserContent is initially derived from the Post Prisma model (since Post is the only concrete content type today). When Event is introduced in PR 3, we'll evaluate whether to switch the source of truth to a hand-built definition that both Post and Event satisfy. For now, deriving from Post is safe because Post has all the shared fields by definition.

- [ ] **Step 1: Create the file**

```ts
// packages/shared/zod/userContent/userContent.dto.ts

import { PostSchema } from '../generated'
import { ProfileSummarySchema } from '../profile/profile.dto'
import { ConversationContextSchema } from '../interaction/interactionContext.dto'
import { LocationSchema } from '../dto/location.dto'
import { z } from 'zod'

/**
 * Fields shared by all UserContent concrete content types (Post today; Event tomorrow).
 * Used by concrete schemas to .pick() consistently.
 */
export const userContentPublicFields = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  postedById: true,
  country: true,
  cityName: true,
  lat: true,
  lon: true,
} as const

/** Owner-visible fields = public + visibility/deletion metadata. */
export const userContentOwnerFields = {
  ...userContentPublicFields,
  isDeleted: true,
  isVisible: true,
} as const

/**
 * Provisional source of truth for the runtime shape of UserContent's shared fields.
 * Today derived from PostSchema; when EventSchema lands, revisit whether to split this
 * into a hand-rolled definition that both PostSchema and EventSchema satisfy.
 */
export const PublicUserContentSchema = PostSchema.pick(userContentPublicFields).extend({
  isOwn: z.boolean().optional(),
})
export type PublicUserContent = z.infer<typeof PublicUserContentSchema>

export const OwnerUserContentSchema = PostSchema.pick(userContentOwnerFields).extend({
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  isOwn: z.boolean().default(true),
})
export type OwnerUserContent = z.infer<typeof OwnerUserContentSchema>

export const PublicUserContentWithProfileSchema = PublicUserContentSchema.extend({
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  isOwn: z.boolean().default(false),
})
export type PublicUserContentWithProfile = z.infer<typeof PublicUserContentWithProfileSchema>

export const PublicUserContentDetailSchema = PublicUserContentWithProfileSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})
export type PublicUserContentDetail = z.infer<typeof PublicUserContentDetailSchema>

export const UserContentSummarySchema = z.object({
  id: z.string(),
  content: z.string(),
  location: LocationSchema,
  postedBy: ProfileSummarySchema,
})
export type UserContentSummary = z.infer<typeof UserContentSummarySchema>

/** Shared payload field shapes (concrete content types add their type-specific discriminator). */
export const CreateUserContentPayloadShape = {
  content: z.string().min(1).max(2000),
  country: z.string().optional(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
} as const

export const UpdateUserContentPayloadShape = {
  content: z.string().min(1).max(2000).optional(),
  isVisible: z.boolean().optional(),
  country: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
} as const

export const UserContentQueryShape = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
} as const

export const NearbyUserContentQueryShape = {
  ...UserContentQueryShape,
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  radius: z.coerce.number().int().min(1).max(500).default(50),
} as const
```

- [ ] **Step 2: Run type-check to confirm the new file is valid**

```bash
pnpm --filter @opencupid/shared type-check
```
Expected: 0 errors. (If the shared package doesn't have its own type-check script, run `pnpm type-check` from the root.)

- [ ] **Step 3: Commit**

```bash
git add packages/shared/zod/userContent/userContent.dto.ts
git commit -m "feat(shared): add UserContent base Zod schemas and field sets

Introduces a shared abstraction layer for content types (Post today,
Event tomorrow). Field sets and base schemas are used by concrete
content types via .pick() / .extend() to compose without duplication.

Refs #user-content-abstraction"
```

---

## Task 2: Refactor `post.dto.ts` to compose from UserContent base

**Files:**
- Modify: `packages/shared/zod/post/post.dto.ts`

**Context:** Every exported name and inferred TS type must remain structurally identical so downstream callers (backend mappers, frontend store, components) compile unchanged.

- [ ] **Step 1: Replace file contents**

```ts
// packages/shared/zod/post/post.dto.ts

import { z } from 'zod'
import { PostSchema, PostTypeSchema } from '../generated'
import { DbMinimalProfileSchema } from '../profile/profile.db'
import {
  userContentPublicFields,
  userContentOwnerFields,
  PublicUserContentSchema,
  OwnerUserContentSchema,
  PublicUserContentWithProfileSchema,
  PublicUserContentDetailSchema,
  UserContentSummarySchema,
  CreateUserContentPayloadShape,
  UpdateUserContentPayloadShape,
  UserContentQueryShape,
  NearbyUserContentQueryShape,
} from '../userContent/userContent.dto'

const publicPostFields = {
  ...userContentPublicFields,
  type: true,
} as const

const ownerPostFields = {
  ...userContentOwnerFields,
  type: true,
} as const

export const PostWithProfileSchema = PostSchema.extend({
  postedBy: DbMinimalProfileSchema,
})
export type PostWithProfile = z.infer<typeof PostWithProfileSchema>

// Public post — UserContent base + type discriminator
export const PublicPostSchema = PostSchema.pick(publicPostFields).extend({
  isOwn: z.boolean().optional(),
})
export type PublicPost = z.infer<typeof PublicPostSchema>

// Owner — UserContent owner shape + type discriminator
export const OwnerPostSchema = OwnerUserContentSchema.extend({
  type: PostTypeSchema,
})
export type OwnerPost = z.infer<typeof OwnerPostSchema>

// Public with profile — UserContent variant + type
export const PublicPostWithProfileSchema = PublicUserContentWithProfileSchema.extend({
  type: PostTypeSchema,
})
export type PublicPostWithProfile = z.infer<typeof PublicPostWithProfileSchema>

// Detail — public detail base + type
export const PublicPostDetailSchema = PublicUserContentDetailSchema.extend({
  type: PostTypeSchema,
})
export type PublicPostDetail = z.infer<typeof PublicPostDetailSchema>

// Summary — UserContent summary + type
export const PostSummarySchema = UserContentSummarySchema.extend({
  type: PostTypeSchema,
})
export type PostSummary = z.infer<typeof PostSummarySchema>

// Payloads
export const CreatePostPayloadSchema = z.object({
  ...CreateUserContentPayloadShape,
  type: PostTypeSchema,
})
export type CreatePostPayload = z.infer<typeof CreatePostPayloadSchema>

export const UpdatePostPayloadSchema = z.object({
  ...UpdateUserContentPayloadShape,
  type: PostTypeSchema.optional(),
})
export type UpdatePostPayload = z.infer<typeof UpdatePostPayloadSchema>

// Params
export const PostParamsSchema = z.object({
  id: z.string().cuid(),
})
export type PostParams = z.infer<typeof PostParamsSchema>

// Queries
export const PostQuerySchema = z.object({
  ...UserContentQueryShape,
  type: PostTypeSchema.optional(),
})
export type PostQuery = z.infer<typeof PostQuerySchema>
export type PostQueryInput = z.input<typeof PostQuerySchema>

export const NearbyPostQuerySchema = z.object({
  ...NearbyUserContentQueryShape,
  type: PostTypeSchema.optional(),
})
export type NearbyPostQuery = z.infer<typeof NearbyPostQuerySchema>
export type NearbyPostQueryInput = z.input<typeof NearbyPostQuerySchema>

export type PostScope = 'all' | 'nearby' | 'recent' | 'my'
```

- [ ] **Step 2: Run type-check across the monorepo**

```bash
pnpm type-check
```
Expected: 0 errors. If this fails, the inferred shapes have drifted; fix the schema composition until inferred types match the original.

- [ ] **Step 3: Run all backend Zod-using tests to confirm runtime parse behavior is preserved**

```bash
pnpm --filter backend test
```
Expected: all green.

- [ ] **Step 4: Run frontend tests to confirm consumer types still compose**

```bash
pnpm --filter frontend test
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/zod/post/post.dto.ts
git commit -m "refactor(shared): compose post.dto from UserContent base schemas

Post schemas now extend UserContent base schemas / field sets instead
of being defined ad-hoc. Every exported name and inferred TS type is
preserved exactly so downstream callers compile unchanged.

Refs #user-content-abstraction"
```

---

## Task 3: Add structural-equality canary test for Post DTOs

**Files:**
- Create: `packages/shared/zod/post/__tests__/post.dto.types.test.ts`

**Context:** This test pins each Post DTO's keyset and acts as a drift canary: any future change that adds/removes a field from these wire-contract types must update the canary, surfacing the wire-format change immediately.

- [ ] **Step 1: Write the test**

```ts
// packages/shared/zod/post/__tests__/post.dto.types.test.ts

import { describe, it, expectTypeOf } from 'vitest'
import type {
  PublicPost,
  PublicPostWithProfile,
  OwnerPost,
  PublicPostDetail,
  PostSummary,
  CreatePostPayload,
  UpdatePostPayload,
  PostQuery,
  NearbyPostQuery,
} from '../post.dto'

/**
 * These tests pin the structural shape of each post DTO. If a field is
 * added or removed from any of these types, this test will fail, surfacing
 * the wire-format change explicitly.
 */
describe('post.dto type contracts', () => {
  it('PublicPost keyset', () => {
    expectTypeOf<keyof PublicPost>().toEqualTypeOf<
      | 'id'
      | 'content'
      | 'type'
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

  it('PublicPostWithProfile keyset', () => {
    expectTypeOf<keyof PublicPostWithProfile>().toEqualTypeOf<
      keyof PublicPost | 'postedBy' | 'location'
    >()
  })

  it('OwnerPost keyset includes visibility flags', () => {
    expectTypeOf<keyof OwnerPost>().toEqualTypeOf<
      | keyof PublicPostWithProfile
      | 'isVisible'
      | 'isDeleted'
    >()
  })

  it('PublicPostDetail keyset matches PublicPostWithProfile', () => {
    expectTypeOf<keyof PublicPostDetail>().toEqualTypeOf<keyof PublicPostWithProfile>()
  })

  it('PostSummary keyset', () => {
    expectTypeOf<keyof PostSummary>().toEqualTypeOf<
      'id' | 'content' | 'type' | 'location' | 'postedBy'
    >()
  })

  it('CreatePostPayload keyset', () => {
    expectTypeOf<keyof CreatePostPayload>().toEqualTypeOf<
      'content' | 'type' | 'country' | 'cityName' | 'lat' | 'lon'
    >()
  })

  it('UpdatePostPayload keyset', () => {
    expectTypeOf<keyof UpdatePostPayload>().toEqualTypeOf<
      'content' | 'type' | 'isVisible' | 'country' | 'cityName' | 'lat' | 'lon'
    >()
  })

  it('PostQuery keyset', () => {
    expectTypeOf<keyof PostQuery>().toEqualTypeOf<'type' | 'limit' | 'offset'>()
  })

  it('NearbyPostQuery keyset', () => {
    expectTypeOf<keyof NearbyPostQuery>().toEqualTypeOf<
      keyof PostQuery | 'lat' | 'lon' | 'radius'
    >()
  })
})
```

- [ ] **Step 2: Run the canary test to confirm it passes**

```bash
pnpm --filter @opencupid/shared exec vitest run packages/shared/zod/post/__tests__/post.dto.types.test.ts 2>/dev/null || \
pnpm --filter shared exec vitest run zod/post/__tests__/post.dto.types.test.ts
```
Expected: all 9 type-contract tests pass.

If the shared package has no vitest config, fall back to running it via the backend or frontend package's vitest:
```bash
pnpm --filter backend exec vitest run ../packages/shared/zod/post/__tests__/post.dto.types.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/zod/post/__tests__/post.dto.types.test.ts
git commit -m "test(shared): pin Post DTO structural shapes as drift canary

These type-level tests ensure that any future change to a Post wire
shape (adding/removing fields) surfaces explicitly via test failure.

Refs #user-content-abstraction"
```

---

## Task 4: Create UserContent mapper projection helpers

**Files:**
- Create: `apps/backend/src/api/mappers/userContent.mappers.ts`

**Context:** These are TS-only structural projections that handle the shared parts of every public/detail/owner/summary mapper: splitting `postedBy`, computing `isOwn`, mapping the profile summary, extracting location. Concrete content type mappers (Post, Event) wrap them with type-discriminator overlays.

- [ ] **Step 1: Create the file**

```ts
// apps/backend/src/api/mappers/userContent.mappers.ts

import type { DbMinimalProfile, DbProfileSummary } from '@zod/profile/profile.db'
import {
  PublicUserContentSchema,
  type PublicUserContentWithProfile,
  type PublicUserContentDetail,
  type UserContentSummary,
} from '@zod/userContent/userContent.dto'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { DbLocationToLocationDTO, extractLocation } from './location.mappers'

/** Minimum row shape any concrete UserContent row must satisfy for the public/owner mappers. */
export type DbUserContentRow = {
  id: string
  content: string
  isDeleted: boolean
  isVisible: boolean
  createdAt: Date
  updatedAt: Date
  country: string | null
  cityName: string | null
  lat: number | null
  lon: number | null
  postedById: string
  postedBy: DbMinimalProfile
}

/** Row shape for the detail mapper — postedBy carries conversation context hydration. */
export type DbUserContentRowWithContext = Omit<DbUserContentRow, 'postedBy'> & {
  postedBy: Parameters<typeof mapConversationContext>[0]
}

/** Lightweight row for the summary projection (no profile images, minimal profile). */
export type DbUserContentForSummary = {
  id: string
  content: string
  country: string | null
  cityName: string | null
  lat: number | null
  lon: number | null
  postedBy: DbProfileSummary
}

/**
 * Public projection — base for any "PublicXWithProfile" wire shape.
 * Matches today's Post mapper behavior: partial Zod parse on the shared
 * UserContent fields, then unparsed overlay (isOwn, postedBy, location).
 * Caller attaches type-specific fields after this projection.
 */
export function projectPublicUserContent<T extends DbUserContentRow>(
  row: T,
  viewerProfileId: string,
): Omit<PublicUserContentWithProfile, 'type'> {
  const { postedBy, ...rest } = row
  return {
    ...PublicUserContentSchema.parse(rest),
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(postedBy),
    location: extractLocation(rest),
  }
}

/**
 * Detail projection — adds conversation context to postedBy.
 * `isOwn` is hardcoded `false` because detail is only requested by non-owners
 * (the owner branch in the GET /:id route uses the owner mapper).
 */
export function projectDetailUserContent<T extends DbUserContentRowWithContext>(
  row: T,
  viewerProfileId: string,
): Omit<PublicUserContentDetail, 'type'> {
  const { postedBy, ...rest } = row
  return {
    ...PublicUserContentSchema.parse(rest),
    isOwn: false,
    postedBy: {
      ...mapProfileSummary(postedBy),
      ...mapConversationContext(postedBy, viewerProfileId),
    },
    location: extractLocation(rest),
  }
}

/**
 * Owner projection — returns the unparsed structural intermediate; the caller's
 * wire schema (`OwnerPostSchema` / `OwnerEventSchema`) does the final parse.
 * Mirrors today's `OwnerPostSchema.parse(mapped)` placement.
 */
export function projectOwnerUserContent<T extends DbUserContentRow>(row: T) {
  const { postedBy, ...rest } = row
  return {
    ...rest,
    postedBy: mapProfileSummary(postedBy),
    location: extractLocation(rest),
  }
}

/** Summary projection for /search omnibox / map teaser layers. */
export function projectUserContentSummary<T extends DbUserContentForSummary>(
  row: T,
): Omit<UserContentSummary, 'type'> & { id: string; content: string } {
  return {
    id: row.id,
    content: row.content,
    location: DbLocationToLocationDTO(row),
    postedBy: mapProfileSummary(row.postedBy),
  }
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm --filter backend type-check
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/api/mappers/userContent.mappers.ts
git commit -m "feat(backend): add UserContent mapper projection helpers

projectPublicUserContent, projectDetailUserContent, projectOwnerUserContent,
and projectUserContentSummary handle the shared parts of every concrete
content type mapper (postedBy summary, location extraction, isOwn flag,
conversation context overlay). Concrete mappers compose by spreading the
projection result and attaching their type-discriminator field.

Refs #user-content-abstraction"
```

---

## Task 5: Refactor `post.mappers.ts` to use projection helpers

**Files:**
- Modify: `apps/backend/src/api/mappers/post.mappers.ts`

- [ ] **Step 1: Replace file contents**

```ts
// apps/backend/src/api/mappers/post.mappers.ts

import {
  OwnerPostSchema,
  type PostWithProfile,
  type PublicPostWithProfile,
  type PublicPostDetail,
  type OwnerPost,
  type PostSummary,
} from '@zod/post/post.dto'
import type { PostWithProfileAndContext } from '@/services/post.service'
import type { DbProfileSummary } from '@zod/profile/profile.db'
import type { PostType } from '@prisma/client'
import {
  projectPublicUserContent,
  projectDetailUserContent,
  projectOwnerUserContent,
  projectUserContentSummary,
  type DbUserContentForSummary,
} from './userContent.mappers'

export function mapDbPostToPublic(
  post: PostWithProfile,
  viewerProfileId: string,
): PublicPostWithProfile {
  return {
    ...projectPublicUserContent(post, viewerProfileId),
    type: post.type,
  }
}

export function mapDbPostToDetail(
  post: PostWithProfileAndContext,
  viewerProfileId: string,
): PublicPostDetail {
  return {
    ...projectDetailUserContent(post, viewerProfileId),
    type: post.type,
  }
}

export function mapDbPostToOwner(post: PostWithProfile): OwnerPost {
  return OwnerPostSchema.parse({
    ...projectOwnerUserContent(post),
    type: post.type,
  })
}

/** Input shape for `mapPostSummary` — what the search query hydrates. */
export type DbPostForSummary = DbUserContentForSummary & {
  type: PostType
}

/** Lightweight post mapper used by /search omnibox and /bounds map results. */
export function mapPostSummary(post: DbPostForSummary): PostSummary {
  return {
    ...projectUserContentSummary(post),
    type: post.type,
  }
}
```

- [ ] **Step 2: Run mapper tests if they exist**

```bash
pnpm --filter backend exec vitest run --dir src/api/mappers
```
Expected: all green. Existing tests should pass with no assertion changes since output shapes are preserved.

- [ ] **Step 3: Run full backend tests**

```bash
pnpm --filter backend test
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/api/mappers/post.mappers.ts
git commit -m "refactor(backend): post mappers compose from UserContent projections

mapDbPostToPublic, mapDbPostToDetail, mapDbPostToOwner, and mapPostSummary
become thin overlays that attach the type discriminator to the shared
UserContent projection. Behavior preserved exactly.

Refs #user-content-abstraction"
```

---

## Task 6: Create `UserContentService` interface

**Files:**
- Create: `apps/backend/src/services/userContent.service.ts`

- [ ] **Step 1: Create the file**

```ts
// apps/backend/src/services/userContent.service.ts

/**
 * Route-facing contract every UserContent service must satisfy.
 *
 * Type parameters:
 *   - TRow         standard list/CRUD row shape (postedBy hydrated, no viewer context)
 *   - TDetailRow   single-item row including viewer-relative conversation context
 *   - TBoundsRow   row used for map-bounds summary projection
 *   - TCreatePayload / TUpdatePayload  validated request bodies
 *
 * Optional capabilities (`findNearby`, `findRecent`, `findInBounds`) let each
 * concrete content type opt out — the route factory only registers the
 * corresponding endpoint when the method is present.
 */
export interface UserContentService<
  TRow,
  TDetailRow,
  TBoundsRow,
  TCreatePayload,
  TUpdatePayload,
> {
  create(profileId: string, data: TCreatePayload): Promise<TRow>
  update(id: string, profileId: string, data: TUpdatePayload): Promise<TRow | null>
  delete(id: string, profileId: string): Promise<{ id: string } | null>

  findByIdWithContext(id: string, viewerProfileId: string): Promise<TDetailRow | null>

  findAll(options: ListOptions): Promise<TRow[]>
  findByProfileId(
    profileId: string,
    options: ListOptions & { includeInvisible?: boolean },
  ): Promise<TRow[]>

  findNearby?(
    lat: number,
    lon: number,
    radius: number,
    options: ListOptions,
  ): Promise<TRow[]>
  findRecent?(options: ListOptions): Promise<TRow[]>
  findInBounds?(bounds: BoundsBox): Promise<TBoundsRow[]>
}

export interface ListOptions {
  limit?: number
  offset?: number
  /**
   * Discriminator filter (e.g. PostType for Post; absent for Event).
   * Loosely typed — concrete services interpret/validate.
   */
  type?: string
}

export interface BoundsBox {
  south: number
  north: number
  west: number
  east: number
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm --filter backend type-check
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/services/userContent.service.ts
git commit -m "feat(backend): add UserContentService interface

Defines the route-facing service contract every UserContent concrete
service must satisfy. Optional capabilities let content types opt out
of endpoints they don't support (e.g. Event without /nearby).

Refs #user-content-abstraction"
```

---

## Task 7: Update `PostService` for `UserContentService` compliance

**Files:**
- Modify: `apps/backend/src/services/post.service.ts`

**Context:** Three changes — (1) export `PostWithProfile` as a named type, (2) add explicit return-type annotations to all public methods, (3) drop the unused `options` arg on `findInBounds`, and (4) add `implements UserContentService<...>` to the class header.

- [ ] **Step 1: Verify no caller passes the second arg to `findInBounds`**

```bash
grep -rn "findInBounds(" apps/backend/src --include="*.ts" | grep -v "findInBounds(bounds:"
```
Expected: only the one call site in `apps/backend/src/api/routes/post.route.ts`, which passes only `parsed.data` (one argument).

- [ ] **Step 2: Replace file contents**

```ts
// apps/backend/src/services/post.service.ts

import { PostType, Prisma } from '@prisma/client'
import type { CreatePostPayload, UpdatePostPayload } from '@zod/post/post.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { prisma } from '@/lib/prisma'
import type {
  UserContentService,
  ListOptions,
  BoundsBox,
} from './userContent.service'

const postedByInclude = {
  include: {
    postedBy: {
      include: {
        profileImages: true,
      },
    },
  },
} satisfies Prisma.PostFindFirstArgs

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
  }) satisfies Prisma.PostFindFirstArgs

export type PostWithProfile = Prisma.PostGetPayload<typeof postedByInclude>

export type PostWithProfileAndContext = Prisma.PostGetPayload<
  ReturnType<typeof postedByWithConversationInclude>
>

export class PostService
  implements
    UserContentService<
      PostWithProfile,
      PostWithProfileAndContext,
      PostWithProfile,
      CreatePostPayload,
      UpdatePostPayload
    >
{
  private static instance: PostService

  private constructor() {}

  static getInstance(): PostService {
    if (!PostService.instance) {
      PostService.instance = new PostService()
    }
    return PostService.instance
  }

  async create(profileId: string, data: CreatePostPayload): Promise<PostWithProfile> {
    return prisma.post.create({
      data: {
        content: data.content,
        type: data.type,
        postedById: profileId,
        country: data.country ?? null,
        cityName: data.cityName ?? null,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
      },
      ...postedByInclude,
    })
  }

  async findById(id: string): Promise<PostWithProfile | null> {
    return prisma.post.findFirst({
      where: { id, isDeleted: false },
      ...postedByInclude,
    })
  }

  async findByIdWithContext(
    id: string,
    viewerProfileId: string,
  ): Promise<PostWithProfileAndContext | null> {
    const post = await prisma.post.findFirst({
      where: { id, isDeleted: false },
      ...postedByWithConversationInclude(viewerProfileId),
    })

    // Non-owners can only see visible posts
    if (post && post.postedById !== viewerProfileId && !post.isVisible) {
      return null
    }

    return post
  }

  async findByProfileId(
    profileId: string,
    options: ListOptions & { includeInvisible?: boolean } = {},
  ): Promise<PostWithProfile[]> {
    const { type, limit = 20, offset = 0, includeInvisible = false } = options

    return prisma.post.findMany({
      where: {
        postedById: profileId,
        isDeleted: false,
        ...(includeInvisible ? {} : { isVisible: true }),
        ...(type ? { type: type as PostType } : {}),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findAll(options: ListOptions = {}): Promise<PostWithProfile[]> {
    const { type, limit = 20, offset = 0 } = options

    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(type ? { type: type as PostType } : {}),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findNearby(
    lat: number,
    lon: number,
    radius: number,
    options: ListOptions = {},
  ): Promise<PostWithProfile[]> {
    const { type, limit = 20, offset = 0 } = options

    const latRange = radius / 111.0
    const lonRange = radius / (111.0 * Math.cos((lat * Math.PI) / 180))

    const minLat = lat - latRange
    const maxLat = lat + latRange
    const minLon = lon - lonRange
    const maxLon = lon + lonRange

    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(type ? { type: type as PostType } : {}),
        lat: { gte: minLat, lte: maxLat },
        lon: { gte: minLon, lte: maxLon },
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findInBounds(bounds: BoundsBox): Promise<PostWithProfile[]> {
    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        lat: { gte: bounds.south, lte: bounds.north },
        lon: { gte: bounds.west, lte: bounds.east },
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async findAllWithLocation(viewerProfileId: string, limit = 500): Promise<PostWithProfile[]> {
    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        lat: { not: null },
        lon: { not: null },
        postedBy: blocklistWhereClause(viewerProfileId),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async findRecent(options: ListOptions = {}): Promise<PostWithProfile[]> {
    const { type, limit = 20, offset = 0 } = options
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        createdAt: { gte: oneWeekAgo },
        ...(type ? { type: type as PostType } : {}),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async update(
    id: string,
    profileId: string,
    data: UpdatePostPayload,
  ): Promise<PostWithProfile | null> {
    const post = await prisma.post.findFirst({
      where: { id, postedById: profileId, isDeleted: false },
    })

    if (!post) {
      return null
    }

    return prisma.post.update({
      where: { id },
      data: {
        content: data.content,
        type: data.type,
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

  async delete(id: string, profileId: string): Promise<{ id: string } | null> {
    const post = await prisma.post.findFirst({
      where: { id, postedById: profileId, isDeleted: false },
    })

    if (!post) {
      return null
    }

    return prisma.post.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })
  }
}
```

- [ ] **Step 2 (verification): Run type-check**

```bash
pnpm --filter backend type-check
```
Expected: 0 errors. The `implements` clause will surface any drift between PostService and the interface.

- [ ] **Step 3: Run backend tests**

```bash
pnpm --filter backend test
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/post.service.ts
git commit -m "refactor(backend): PostService implements UserContentService

- Add 'implements UserContentService<...>' to class header for static contract enforcement
- Export PostWithProfile as a named type (was previously anonymous)
- Add explicit return-type annotations to all public methods
- Drop unused 'options' arg on findInBounds (only callsite passes one arg)

Refs #user-content-abstraction"
```

---

## Task 8: Create the `userContent.route-factory.ts`

**Files:**
- Create: `apps/backend/src/api/routes/userContent.route-factory.ts`

- [ ] **Step 1: Create the file**

```ts
// apps/backend/src/api/routes/userContent.route-factory.ts

import { FastifyPluginAsync } from 'fastify'
import { type ZodSchema } from 'zod'
import { BoundsQuerySchema } from '@zod/dto/bounds.dto'
import { validateBody } from '@/utils/zodValidate'
import { rateLimitConfig, sendError } from '../helpers'
import type {
  UserContentService,
  ListOptions,
} from '@/services/userContent.service'

interface UserContentMappers<TRow, TDetailRow, TBoundsRow, TOwner, TPublic, TDetail, TSummary> {
  toOwner(raw: TRow): TOwner
  toPublic(raw: TRow, viewerProfileId: string): TPublic
  toDetail(raw: TDetailRow, viewerProfileId: string): TDetail
  toSummary(raw: TBoundsRow): TSummary
}

interface UserContentSchemas<TCreatePayload, TUpdatePayload> {
  create: ZodSchema<TCreatePayload>
  update: ZodSchema<TUpdatePayload>
  params: ZodSchema<{ id: string }>
  profileParams: ZodSchema<{ profileId: string }>
  listQuery: ZodSchema<ListOptions>
  nearbyQuery?: ZodSchema<ListOptions & { lat: number; lon: number; radius: number }>
}

export interface UserContentRouteConfig<
  TRow,
  TDetailRow,
  TBoundsRow,
  TCreatePayload,
  TUpdatePayload,
  TOwner,
  TPublic,
  TDetail,
  TSummary,
> {
  service: UserContentService<TRow, TDetailRow, TBoundsRow, TCreatePayload, TUpdatePayload>
  mappers: UserContentMappers<TRow, TDetailRow, TBoundsRow, TOwner, TPublic, TDetail, TSummary>
  schemas: UserContentSchemas<TCreatePayload, TUpdatePayload>

  /** Wire response key per content type. */
  wire: {
    singular: string
    plural: string
  }

  rateLimits?: {
    create?: { window: string; max: number }
    mutate?: { window: string; max: number }
  }

  features?: {
    nearby?: boolean
    recent?: boolean
    bounds?: boolean
    publicProfileList?: boolean
  }

  onMutation?: () => void | Promise<void>

  errorLabel?: string
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function makeUserContentRoutes<
  TRow,
  TDetailRow,
  TBoundsRow,
  TCreatePayload,
  TUpdatePayload,
  TOwner,
  TPublic,
  TDetail,
  TSummary,
>(
  config: UserContentRouteConfig<
    TRow,
    TDetailRow,
    TBoundsRow,
    TCreatePayload,
    TUpdatePayload,
    TOwner,
    TPublic,
    TDetail,
    TSummary
  >,
): FastifyPluginAsync {
  const { service, mappers, schemas, wire } = config
  const label = config.errorLabel ?? wire.singular
  const rate = {
    create: config.rateLimits?.create ?? { window: '1 minute', max: 10 },
    mutate: config.rateLimits?.mutate ?? { window: '1 minute', max: 5 },
  }
  const features = {
    nearby: config.features?.nearby ?? !!service.findNearby,
    recent: config.features?.recent ?? !!service.findRecent,
    bounds: config.features?.bounds ?? !!service.findInBounds,
    publicProfileList: config.features?.publicProfileList ?? true,
  }

  return async (fastify) => {
    // POST /
    fastify.post(
      '/',
      {
        onRequest: [fastify.authenticate],
        config: rateLimitConfig(fastify, rate.create.window, rate.create.max),
      },
      async (req, reply) => {
        const profileId = req.session.profileId
        if (!profileId) return sendError(reply, 401, 'Profile required')

        const data = validateBody(schemas.create, req, reply)
        if (!data) return

        try {
          const created = await service.create(profileId, data)
          await config.onMutation?.()
          return reply
            .code(201)
            .send({ success: true, [wire.singular]: mappers.toOwner(created) })
        } catch (err: any) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to create ${label}`)
        }
      },
    )

    // GET /:id  — owner-vs-public branching
    fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
      const { id } = schemas.params.parse(req.params)
      const viewerProfileId = req.session.profileId

      try {
        const raw = await service.findByIdWithContext(id, viewerProfileId)
        if (!raw) return sendError(reply, 404, `${capitalize(label)} not found`)

        const isOwner = (raw as { postedById: string }).postedById === viewerProfileId
        const item = isOwner
          ? mappers.toOwner(raw as unknown as TRow)
          : mappers.toDetail(raw, viewerProfileId)

        return reply.code(200).send({ success: true, [wire.singular]: item })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, `Failed to fetch ${label}`)
      }
    })

    // PATCH /:id
    fastify.patch(
      '/:id',
      {
        onRequest: [fastify.authenticate],
        config: rateLimitConfig(fastify, rate.mutate.window, rate.mutate.max),
      },
      async (req, reply) => {
        const { id } = schemas.params.parse(req.params)
        const profileId = req.session.profileId
        if (!profileId) return sendError(reply, 401, 'Profile required')

        const data = validateBody(schemas.update, req, reply)
        if (!data) return

        try {
          const raw = await service.update(id, profileId, data)
          if (!raw)
            return sendError(reply, 404, `${capitalize(label)} not found or access denied`)
          await config.onMutation?.()
          return reply
            .code(200)
            .send({ success: true, [wire.singular]: mappers.toOwner(raw) })
        } catch (err: any) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to update ${label}`)
        }
      },
    )

    // DELETE /:id
    fastify.delete(
      '/:id',
      {
        onRequest: [fastify.authenticate],
        config: rateLimitConfig(fastify, rate.mutate.window, rate.mutate.max),
      },
      async (req, reply) => {
        const { id } = schemas.params.parse(req.params)
        const profileId = req.session.profileId
        if (!profileId) return sendError(reply, 401, 'Profile required')

        try {
          const result = await service.delete(id, profileId)
          if (!result)
            return sendError(reply, 404, `${capitalize(label)} not found or access denied`)
          await config.onMutation?.()
          return reply.code(200).send({ success: true })
        } catch (err: any) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to delete ${label}`)
        }
      },
    )

    // GET /
    fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
      const query = schemas.listQuery.parse(req.query)
      try {
        const raw = await service.findAll(query)
        const items = raw.map((r) => mappers.toPublic(r, req.session.profileId))
        return reply.code(200).send({ success: true, [wire.plural]: items })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, `Failed to fetch ${wire.plural}`)
      }
    })

    // GET /nearby
    if (features.nearby && service.findNearby && schemas.nearbyQuery) {
      fastify.get('/nearby', { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const query = schemas.nearbyQuery!.parse(req.query)
        try {
          const raw = await service.findNearby!(query.lat, query.lon, query.radius, query)
          const items = raw.map((r) => mappers.toPublic(r, req.session.profileId))
          return reply.code(200).send({ success: true, [wire.plural]: items })
        } catch (err) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to fetch nearby ${wire.plural}`)
        }
      })
    }

    // GET /recent
    if (features.recent && service.findRecent) {
      fastify.get('/recent', { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const query = schemas.listQuery.parse(req.query)
        try {
          const raw = await service.findRecent!(query)
          const items = raw.map((r) => mappers.toPublic(r, req.session.profileId))
          return reply.code(200).send({ success: true, [wire.plural]: items })
        } catch (err) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to fetch recent ${wire.plural}`)
        }
      })
    }

    // GET /bounds
    if (features.bounds && service.findInBounds) {
      fastify.get('/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const parsed = BoundsQuerySchema.safeParse(req.query)
        if (!parsed.success) {
          return sendError(
            reply,
            400,
            'Missing or invalid bounds parameters (south, north, west, east)',
          )
        }
        try {
          const raw = await service.findInBounds!(parsed.data)
          const items = raw.map((r) => mappers.toSummary(r))
          return reply.code(200).send({ success: true, [wire.plural]: items })
        } catch (err) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to fetch ${wire.plural} in bounds`)
        }
      })
    }

    // GET /profile/:profileId
    if (features.publicProfileList) {
      fastify.get(
        '/profile/:profileId',
        { onRequest: [fastify.authenticate] },
        async (req, reply) => {
          const { profileId } = schemas.profileParams.parse(req.params)
          const viewerProfileId = req.session.profileId
          const query = schemas.listQuery.parse(req.query)
          try {
            const raw = await service.findByProfileId(profileId, {
              ...query,
              includeInvisible: viewerProfileId === profileId,
            })
            const items = raw.map((r) => mappers.toPublic(r, viewerProfileId))
            return reply.code(200).send({ success: true, [wire.plural]: items })
          } catch (err) {
            fastify.log.error(err)
            return sendError(reply, 500, `Failed to fetch profile ${wire.plural}`)
          }
        },
      )
    }

    // GET /profile/me
    fastify.get('/profile/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const query = schemas.listQuery.parse(req.query)
      try {
        const raw = await service.findByProfileId(profileId, {
          ...query,
          includeInvisible: true,
        })
        const items = raw.map((r) => mappers.toOwner(r))
        return reply.code(200).send({ success: true, [wire.plural]: items })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, `Failed to fetch profile ${wire.plural}`)
      }
    })
  }
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm --filter backend type-check
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/api/routes/userContent.route-factory.ts
git commit -m "feat(backend): add UserContent route factory

makeUserContentRoutes registers a standard set of REST endpoints
(POST/GET/PATCH/DELETE /:id, GET /, /nearby, /recent, /bounds,
/profile/:profileId, /profile/me) parameterized by service contract,
mappers, schemas, and wire response keys. Optional endpoints
auto-register based on which optional service methods exist.

Refs #user-content-abstraction"
```

---

## Task 9: Refactor `post.route.ts` to use the factory

**Files:**
- Modify: `apps/backend/src/api/routes/post.route.ts`

- [ ] **Step 1: Replace file contents**

```ts
// apps/backend/src/api/routes/post.route.ts

import { z } from 'zod'
import { ClusterService } from '@/services/cluster.service'
import { PostService } from '@/services/post.service'
import {
  CreatePostPayloadSchema,
  UpdatePostPayloadSchema,
  PostParamsSchema,
  PostQuerySchema,
  NearbyPostQuerySchema,
} from '@zod/post/post.dto'
import {
  mapDbPostToOwner,
  mapDbPostToPublic,
  mapDbPostToDetail,
  mapPostSummary,
} from '../mappers/post.mappers'
import { makeUserContentRoutes } from './userContent.route-factory'

const ProfileParamsSchema = z.object({ profileId: z.string().cuid() })

const postRoutes = makeUserContentRoutes({
  service: PostService.getInstance(),
  mappers: {
    toOwner: mapDbPostToOwner,
    toPublic: mapDbPostToPublic,
    toDetail: mapDbPostToDetail,
    toSummary: mapPostSummary,
  },
  schemas: {
    create: CreatePostPayloadSchema,
    update: UpdatePostPayloadSchema,
    params: PostParamsSchema,
    profileParams: ProfileParamsSchema,
    listQuery: PostQuerySchema,
    nearbyQuery: NearbyPostQuerySchema,
  },
  wire: { singular: 'post', plural: 'posts' },
  rateLimits: {
    create: { window: '1 minute', max: 10 },
    mutate: { window: '1 minute', max: 5 },
  },
  features: { nearby: true, recent: true, bounds: true, publicProfileList: true },
  onMutation: () => ClusterService.getInstance().evictAll(),
})

export default postRoutes
```

- [ ] **Step 2: Run type-check**

```bash
pnpm --filter backend type-check
```
Expected: 0 errors. If types fail to flow through the factory's generic constraints, fix the factory's type parameters until inference succeeds.

- [ ] **Step 3: Run backend route tests**

```bash
pnpm --filter backend exec vitest run --dir src/api/routes
```
Expected: all green. Existing route tests should pass without modification because wire format is preserved.

- [ ] **Step 4: Run full backend test suite**

```bash
pnpm --filter backend test
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/routes/post.route.ts
git commit -m "refactor(backend): post routes use UserContent route factory

post.route.ts shrinks from 358 lines to ~40 lines of configuration.
All endpoints, error messages, rate limits, and wire format preserved
exactly. The factory handles auth, parsing, error wrapping, mapper
dispatch, and response shaping for every endpoint.

Refs #user-content-abstraction"
```

---

## Task 10: Final verification — full test suite, type-check, format

**Files:** none modified

- [ ] **Step 1: Run full type-check across the monorepo**

```bash
pnpm type-check
```
Expected: 0 errors.

- [ ] **Step 2: Run full test suite**

```bash
pnpm test
```
Expected: all green.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```
Expected: 0 errors. Fix any new violations introduced by this refactor.

- [ ] **Step 4: Run the full CI mirror**

```bash
pnpm run ci:test
```
Expected: 0 errors.

- [ ] **Step 5: Format only the files modified in this PR**

```bash
pnpm exec prettier --write \
  packages/shared/zod/userContent/userContent.dto.ts \
  packages/shared/zod/post/post.dto.ts \
  packages/shared/zod/post/__tests__/post.dto.types.test.ts \
  apps/backend/src/api/mappers/userContent.mappers.ts \
  apps/backend/src/api/mappers/post.mappers.ts \
  apps/backend/src/services/userContent.service.ts \
  apps/backend/src/services/post.service.ts \
  apps/backend/src/api/routes/userContent.route-factory.ts \
  apps/backend/src/api/routes/post.route.ts
```

- [ ] **Step 6: Commit any formatting changes (if any)**

```bash
git add -u
git diff --cached --quiet || git commit -m "chore: prettier format"
```

---

## Task 11: Add changeset and create PR

**Files:**
- Create: `.changeset/user-content-backend-refactor.md`

- [ ] **Step 1: Write the changeset file**

```bash
cat > .changeset/user-content-backend-refactor.md << 'EOF'
---
'@opencupid/backend': minor
'@opencupid/shared': minor
---

Extract UserContent abstraction layer (Zod base schemas, mapper projections, service interface, route factory) so future content types (e.g. Event) can compose with Post on shared infrastructure. No wire-format or behavior changes.
EOF
```

- [ ] **Step 2: Commit the changeset**

```bash
git add .changeset/user-content-backend-refactor.md
git commit -m "chore: add changeset for user-content backend refactor"
```

- [ ] **Step 3: Manual smoke test (local dev)**

Start the dev server and verify the post endpoints still behave correctly.

```bash
pnpm dev
```

In another terminal or in the browser:
- Login at https://localhost:5173/auth
- Browse posts, verify the public feed renders
- Open a single post, verify owner toolbar appears for own posts
- Create a new post via the UI; verify it appears in /me
- Edit the post; verify changes persist
- Toggle visibility; verify post disappears/reappears in browse
- Delete the post; verify it's removed from both /me and /browse

If anything breaks, stop and investigate. Wire format must be preserved.

- [ ] **Step 4: Push branch and create PR**

```bash
git push -u origin refactor/user-content-backend-abstraction
gh pr create --title "refactor: extract UserContent backend abstraction (Post-only pass)" --body "$(cat <<'EOF'
## Summary

Extracts a UserContent abstraction layer behind the API boundary so a future Event content type (PR 3) can compose with Post on shared infrastructure. **No wire-format or behavior changes** — every consumer (frontend store, components, admin) compiles unchanged.

### What's new

- \`packages/shared/zod/userContent/userContent.dto.ts\` — shared field sets and base Zod schemas
- \`apps/backend/src/api/mappers/userContent.mappers.ts\` — projection helpers (\`projectPublicUserContent\`, \`projectDetailUserContent\`, \`projectOwnerUserContent\`, \`projectUserContentSummary\`)
- \`apps/backend/src/services/userContent.service.ts\` — \`UserContentService<...>\` interface
- \`apps/backend/src/api/routes/userContent.route-factory.ts\` — \`makeUserContentRoutes(config)\` Fastify plugin factory

### What changed (without behavior change)

- \`packages/shared/zod/post/post.dto.ts\` — composes from UserContent base; all exports preserved
- \`apps/backend/src/api/mappers/post.mappers.ts\` — each mapper is now a one-line overlay
- \`apps/backend/src/services/post.service.ts\` — \`implements UserContentService<...>\`, exports \`PostWithProfile\`, explicit return types, dropped unused \`findInBounds\` options arg
- \`apps/backend/src/api/routes/post.route.ts\` — shrinks from 358 lines to ~40 lines of factory config

### Out of scope (deferred to follow-ups)

- Frontend Pinia store generalization (PR 2)
- Event Prisma model and routes (PR 3, when Event is wanted)
- \`findInBounds\` SELECT narrowing (perf optimization)

## Test plan

- [x] \`pnpm type-check\` green
- [x] \`pnpm test\` green
- [x] \`pnpm lint\` green
- [x] \`pnpm run ci:test\` green
- [x] Manual smoke: create/edit/hide/show/delete a post in the UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Watch CI in background (per CLAUDE.md guidance)**

Spawn a subagent or background process:

```bash
gh run list --limit 1
gh run watch --exit-status
```

If CI fails, investigate via `gh run view --log-failed`, fix, push again.

---

## Self-review checklist

After completing all tasks:

1. **Spec coverage:** Each layer of the architecture is implemented:
   - ✅ Shared Zod base schemas (Task 1)
   - ✅ Refactored post.dto.ts (Task 2)
   - ✅ Drift canary test (Task 3)
   - ✅ Mapper projections (Task 4)
   - ✅ Refactored post.mappers.ts (Task 5)
   - ✅ Service interface (Task 6)
   - ✅ Refactored PostService (Task 7)
   - ✅ Route factory (Task 8)
   - ✅ Refactored post.route.ts (Task 9)
   - ✅ Verification (Task 10)
   - ✅ Changeset + PR (Task 11)

2. **Placeholder scan:** No "TBD" / "TODO" / "fill in details" / "similar to" placeholders. Every step has actual code or actual commands.

3. **Type consistency:** Names align across tasks:
   - `projectPublicUserContent` / `projectDetailUserContent` / `projectOwnerUserContent` / `projectUserContentSummary` — used identically in Task 4 and Task 5
   - `UserContentService<TRow, TDetailRow, TBoundsRow, TCreatePayload, TUpdatePayload>` — same parameter ordering in Task 6 and Task 7
   - `PublicUserContentSchema` / `OwnerUserContentSchema` / `PublicUserContentWithProfileSchema` / `PublicUserContentDetailSchema` / `UserContentSummarySchema` — defined Task 1, consumed Task 2 + Task 4
   - `PostWithProfile` — exported Task 7, imported by Task 4 mappers and Task 9 route config
   - `wire.singular` / `wire.plural` — Task 8 factory consumed by Task 9 config (`'post'` / `'posts'`)

---

## Estimated time

12 tasks × ~5–15 minutes each ≈ 1.5–2 hours of focused implementation, plus CI watch time.

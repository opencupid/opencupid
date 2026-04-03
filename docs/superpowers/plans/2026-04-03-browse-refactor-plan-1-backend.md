# Browse Refactor — Plan 1: Backend Unified Bounds Endpoint

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single `GET /browse/bounds` endpoint that returns profiles, posts, and available tags for a geographic bounding box in one request.

**Architecture:** New `browse.route.ts` route handler + `BrowseService` that delegates to the existing `ProfileMatchService` and `PostService`. Tags are derived server-side from the profile results (unique tags on returned profiles). No changes to existing routes or services.

**Tech Stack:** Fastify, Prisma, Zod, TypeScript. All existing service methods are reused — no new DB queries.

**Spec reference:** `docs/superpowers/specs/2026-04-03-browse-gui-refactor-design.md` § 2 (API changes)

---

## File Map

| Action | Path |
|--------|------|
| Create | `apps/backend/src/api/routes/browse.route.ts` |
| Create | `apps/backend/src/services/browse.service.ts` |
| Create | `apps/backend/src/api/routes/__tests__/browse.route.test.ts` |
| Modify | `packages/shared/zod/apiResponse.dto.ts` — add `BrowseBoundsResponse` type |
| Modify | `apps/backend/src/main.ts` — register `/browse` route prefix |

---

### Task 1: Add `BrowseBoundsResponse` DTO

**Files:**
- Modify: `packages/shared/zod/apiResponse.dto.ts`

- [ ] **Step 1: Add the response type**

Open `packages/shared/zod/apiResponse.dto.ts`. After the existing `PostsResponse` export, add:

```ts
export type BrowseBoundsResponse = ApiSuccess<{
  profiles: PublicProfileWithContext[]
  posts: PublicPostWithProfile[]
  tags: PublicTag[]
}>
```

- [ ] **Step 2: Verify type-check**

```bash
pnpm type-check
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/zod/apiResponse.dto.ts
git commit -m "feat: add BrowseBoundsResponse DTO"
```

---

### Task 2: Create `BrowseService`

**Files:**
- Create: `apps/backend/src/services/browse.service.ts`

The service delegates to existing `ProfileMatchService` and `PostService`, then derives tags from profile results.

- [ ] **Step 1: Write the service**

```ts
// apps/backend/src/services/browse.service.ts
import { ProfileMatchService } from './profileMatch.service'
import { PostService } from './post.service'
import type { PrismaClient } from '@prisma/client'
import { mapProfileToPublic } from '../api/mappers/profile.mappers'
import { mapDbPostToPublic } from '../api/mappers/post.mappers'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'
import type { PublicPostWithProfile } from '@zod/post/post.dto'
import type { PublicTag } from '@zod/tag/tag.dto'

export type Bounds = { south: number; north: number; west: number; east: number }

export class BrowseService {
  private static instance: BrowseService

  static getInstance(prisma: PrismaClient): BrowseService {
    if (!BrowseService.instance) {
      BrowseService.instance = new BrowseService(prisma)
    }
    return BrowseService.instance
  }

  private constructor(private readonly prisma: PrismaClient) {}

  async findInBounds(
    viewerProfileId: string,
    bounds: Bounds,
    locale: string
  ): Promise<{
    profiles: PublicProfileWithContext[]
    posts: PublicPostWithProfile[]
    tags: PublicTag[]
  }> {
    const profileMatchService = ProfileMatchService.getInstance()
    const postService = PostService.getInstance(this.prisma)

    const [rawProfiles, rawPosts] = await Promise.all([
      profileMatchService.findSocialProfilesInBounds(viewerProfileId, bounds, [
        { updatedAt: 'desc' },
      ]),
      postService.findInBounds(bounds),
    ])

    const profiles = rawProfiles.map((p) => mapProfileToPublic(p, false, locale))
    const posts = rawPosts.map((p) => mapDbPostToPublic(p, viewerProfileId))

    // Derive unique tags from profile results only (posts have no tags)
    const tagMap = new Map<string, PublicTag>()
    for (const profile of rawProfiles) {
      for (const tag of profile.tags ?? []) {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, { id: tag.id, name: tag.translations?.[locale] ?? tag.name })
        }
      }
    }
    const tags = Array.from(tagMap.values())

    return { profiles, posts, tags }
  }
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: no errors. Fix any import path issues.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/services/browse.service.ts
git commit -m "feat: add BrowseService with findInBounds"
```

---

### Task 3: Write the route test (failing)

**Files:**
- Create: `apps/backend/src/api/routes/__tests__/browse.route.test.ts`

Look at `apps/backend/src/api/routes/__tests__/findProfile.route.test.ts` for the test helper / fastify build pattern used in this codebase.

- [ ] **Step 1: Write the failing test**

```ts
// apps/backend/src/api/routes/__tests__/browse.route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildTestApp } from '../../../test/helpers/buildTestApp'

const mockFindInBounds = vi.fn()

vi.mock('@/services/browse.service', () => ({
  BrowseService: {
    getInstance: () => ({ findInBounds: mockFindInBounds }),
  },
}))

describe('GET /browse/bounds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when bounds params are missing', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/browse/bounds',
      headers: { cookie: 'session=valid' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns profiles, posts and tags for valid bounds', async () => {
    mockFindInBounds.mockResolvedValue({
      profiles: [{ id: 'p1', publicName: 'Mónika', tags: [] }],
      posts: [{ id: 'post1', title: 'Cherry harvest' }],
      tags: [{ id: 't1', name: 'Biokert' }],
    })

    const app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/browse/bounds?south=46.5&north=47.5&west=18.0&east=19.0',
      headers: { cookie: 'session=valid' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.profiles).toHaveLength(1)
    expect(body.posts).toHaveLength(1)
    expect(body.tags).toHaveLength(1)
  })

  it('returns 400 when any bound param is non-numeric', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/browse/bounds?south=abc&north=47.5&west=18.0&east=19.0',
      headers: { cookie: 'session=valid' },
    })
    expect(res.statusCode).toBe(400)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm --filter backend exec vitest run src/api/routes/__tests__/browse.route.test.ts
```

Expected: FAIL — route not found / 404.

---

### Task 4: Create `browse.route.ts`

**Files:**
- Create: `apps/backend/src/api/routes/browse.route.ts`

- [ ] **Step 1: Write the route handler**

```ts
// apps/backend/src/api/routes/browse.route.ts
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { sendError } from '../helpers'
import { BrowseService } from '@/services/browse.service'
import type { BrowseBoundsResponse } from '@zod/apiResponse.dto'

const BoundsQuerySchema = z.object({
  south: z.coerce.number(),
  north: z.coerce.number(),
  west: z.coerce.number(),
  east: z.coerce.number(),
})

const browseRoutes: FastifyPluginAsync = async (fastify) => {
  const browseService = BrowseService.getInstance(fastify.prisma)

  /**
   * GET /browse/bounds
   * Returns profiles, posts, and available tags within a geographic bounding box.
   * Tags are derived from profile results only — posts carry no tags.
   * @query {number} south
   * @query {number} north
   * @query {number} west
   * @query {number} east
   * @returns {BrowseBoundsResponse}
   */
  fastify.get('/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const parsed = BoundsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(reply, 400, 'Missing or invalid bounds parameters (south, north, west, east)')
    }

    const viewerProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const result = await browseService.findInBounds(viewerProfileId, parsed.data, locale)
      const response: BrowseBoundsResponse = { success: true, ...result }
      return reply.code(200).send(response)
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch browse data')
    }
  })
}

export default browseRoutes
```

- [ ] **Step 2: Register route in `main.ts`**

Open `apps/backend/src/main.ts`. Find the block where other routes are registered with `fastify.register(...)`. Add alongside the existing registrations:

```ts
import browseRoutes from './api/routes/browse.route'
// ...
fastify.register(browseRoutes, { prefix: '/browse' })
```

- [ ] **Step 3: Run the tests**

```bash
pnpm --filter backend exec vitest run src/api/routes/__tests__/browse.route.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 4: Run full backend test suite**

```bash
pnpm --filter backend test
```

Expected: all passing, no regressions.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/routes/browse.route.ts apps/backend/src/main.ts \
        apps/backend/src/api/routes/__tests__/browse.route.test.ts
git commit -m "feat: add GET /browse/bounds endpoint returning profiles, posts and tags"
```

---

### Task 5: Add shared Zod DTO for bounds query (frontend reuse)

**Files:**
- Modify: `packages/shared/zod/dto/bounds.dto.ts` (create if not exists)

- [ ] **Step 1: Check if a bounds DTO already exists**

```bash
grep -r "BoundsQuery\|boundsSchema" packages/shared/zod/
```

If a shared bounds schema already exists, skip to Step 3.

- [ ] **Step 2: Create shared bounds DTO**

```ts
// packages/shared/zod/dto/bounds.dto.ts
import { z } from 'zod'

export const BoundsSchema = z.object({
  south: z.number(),
  north: z.number(),
  west: z.number(),
  east: z.number(),
})

export type Bounds = z.infer<typeof BoundsSchema>
```

- [ ] **Step 3: Update browse.route.ts to import from shared**

Replace the inline `BoundsQuerySchema` in `browse.route.ts` with a coercing wrapper around the shared type:

```ts
import { BoundsSchema } from '@shared/zod/dto/bounds.dto'
const BoundsQuerySchema = BoundsSchema.extend({
  south: z.coerce.number(),
  north: z.coerce.number(),
  west: z.coerce.number(),
  east: z.coerce.number(),
})
```

- [ ] **Step 4: Type-check and test**

```bash
pnpm type-check && pnpm --filter backend test
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/zod/dto/bounds.dto.ts apps/backend/src/api/routes/browse.route.ts
git commit -m "feat: add shared Bounds DTO for /browse/bounds query params"
```

---

## Verification

After all tasks complete:

```bash
pnpm --filter backend test        # all passing
pnpm type-check                   # no errors
```

Manual smoke test via curl (with a valid session cookie from the dev app):

```bash
curl -s "https://localhost:3000/browse/bounds?south=46.5&north=47.5&west=18.0&east=19.0" \
  -H "Cookie: session=<token>" | jq '{profiles: (.profiles | length), posts: (.posts | length), tags: (.tags | length)}'
```

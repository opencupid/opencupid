# Admin Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the profile-trust quarantine system (PR #1368) in the admin GUI: a Moderation list page, manual flag/clear flow from the ProfilesPage detail modal, and the schema/worker changes needed to support admin-set flags alongside the existing heuristic ones.

**Architecture:** Reuse `PROFILE_UNVETTED` reason for admin-set flags, distinguished by `flaggedBy: 'admin:manual'` prefix. Workers filter on this prefix to leave admin flags immune to auto-clear. Add `clearedBy String?` to make flag lifecycle self-documenting. Three new admin endpoints (list / clear / flag), one modified endpoint (profile listing gains `hasActiveTrustFlag`), one new admin endpoint for single-profile fetch (used for cross-page deep-links). New `/moderation` page; ProfilesPage detail modal grows a Trust section with action affordances.

**Tech Stack:** Backend — Fastify, Prisma, BullMQ, Vitest. Frontend (admin) — Vue 3 Composition API, Bootstrap-Vue-Next, Vitest, vue-router 4. Spec: `docs/superpowers/specs/2026-04-25-admin-moderation-design.md`.

**Branch:** `feat/admin-moderation` (already created and contains the spec commit).

---

## File structure

**Backend — modify:**

- `apps/backend/prisma/schema.prisma` — add `clearedBy String?` to `ProfileTrustFlag`
- `apps/backend/src/services/profileTrust.service.ts` — populate `clearedBy` in existing else-branch + add three new methods
- `apps/backend/src/workers/profileTrustWorker.ts` — populate `clearedBy` on auto-clear + filter `flaggedBy NOT LIKE 'admin:%'`
- `apps/backend/src/api/routes/admin.route.ts` — add three new endpoints + extend `GET /admin/profiles` + add `GET /admin/profiles/:id`
- `apps/backend/src/__tests__/services/profileTrust.service.spec.ts` — adjust existing assertions for `clearedBy`, add coverage for new methods
- `apps/backend/src/__tests__/workers/profileTrustWorker.spec.ts` — adjust for `clearedBy` + cover admin-flag-skip
- `apps/backend/src/__tests__/routes/admin.route.spec.ts` — extend with new endpoint tests

**Backend — create:**

- `apps/backend/prisma/migrations/<TIMESTAMP>_add_cleared_by_to_trust_flag/migration.sql` — single ALTER TABLE statement (Prisma generates filename)

**Admin frontend — modify:**

- `apps/admin/src/router.ts` — add `/moderation` route; ProfilesPage now accepts `?profileId=` query
- `apps/admin/src/App.vue` — add "Moderation" sidebar entry
- `apps/admin/src/pages/ProfilesPage.vue` — `hasActiveTrustFlag` interface + table-warning row class + detail modal Trust section + Quarantine/Clear actions + deep-link auto-open
- `apps/admin/package.json` — add `@vue/test-utils` if not already hoisted

**Admin frontend — create:**

- `apps/admin/src/composables/useTrustFlags.ts` — typed wrappers around the trust-flag API endpoints
- `apps/admin/src/pages/ModerationPage.vue` — the new Moderation list page
- `apps/admin/src/pages/__tests__/ModerationPage.spec.ts` — component tests
- `apps/admin/src/pages/__tests__/ProfilesPage.spec.ts` — component tests for the new behaviour

---

## Task 1: Schema — add `clearedBy` column

**Files:**

- Modify: `apps/backend/prisma/schema.prisma:432-446`
- Create: `apps/backend/prisma/migrations/<auto-named>_add_cleared_by_to_trust_flag/migration.sql`

- [ ] **Step 1: Add `clearedBy` to the Prisma schema**

Edit `apps/backend/prisma/schema.prisma`:

```prisma
model ProfileTrustFlag {
  id        String      @id @default(cuid())
  profileId String
  reason    TrustReason
  flaggedAt DateTime    @default(now())
  clearedAt DateTime?
  clearedBy String?
  evidence  Json
  flaggedBy String

  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId, clearedAt])
}
```

- [ ] **Step 2: Generate the migration**

Ensure dev DB is running (`docker compose up -d db`), then:

```bash
pnpm --filter backend exec prisma migrate dev --name add_cleared_by_to_trust_flag
```

Expected: a new migration directory under `apps/backend/prisma/migrations/`, containing a SQL file equivalent to:

```sql
ALTER TABLE "ProfileTrustFlag" ADD COLUMN "clearedBy" TEXT;
```

- [ ] **Step 3: Verify the zod schema regenerated**

```bash
grep -n "clearedBy" packages/shared/zod/generated/index.ts
```

Expected: `clearedBy` appears in `ProfileTrustFlagSchema` and the related select/include schemas. If not, run `pnpm --filter backend prisma:generate` and re-grep.

- [ ] **Step 4: Type-check**

```bash
pnpm type-check
```

Expected: PASS. (No code reads `clearedBy` yet, so a nullable column addition is type-compatible.)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations packages/shared/zod/generated/index.ts
git commit -m "feat(backend): add clearedBy column to ProfileTrustFlag"
```

---

## Task 2: Populate `clearedBy` at existing auto-clear sites

**Files:**

- Modify: `apps/backend/src/services/profileTrust.service.ts:106-110`
- Modify: `apps/backend/src/workers/profileTrustWorker.ts:49-52`
- Modify: `apps/backend/src/__tests__/services/profileTrust.service.spec.ts`
- Modify: `apps/backend/src/__tests__/workers/profileTrustWorker.spec.ts`

- [ ] **Step 1: Write failing test — reconcile-clear writes `clearedBy`**

Add to `apps/backend/src/__tests__/services/profileTrust.service.spec.ts` inside the `reconcileSpamBurst` describe block:

```ts
it('records clearedBy when clearing on threshold-down', async () => {
  // Setup: a profile already has SPAM_BURST flag, count is now below threshold
  const profile = await createTestProfile()
  await prisma.profileTrustFlag.create({
    data: {
      profileId: profile.id,
      reason: 'SPAM_BURST',
      evidence: {},
      flaggedBy: 'heuristic:spam_burst',
    },
  })

  await ProfileTrustService.getInstance().reconcileSpamBurst(profile.id)

  const cleared = await prisma.profileTrustFlag.findFirst({
    where: { profileId: profile.id, reason: 'SPAM_BURST' },
  })
  expect(cleared?.clearedAt).toBeTruthy()
  expect(cleared?.clearedBy).toBe('heuristic:spam_burst_below_threshold')
})
```

- [ ] **Step 2: Run failing test**

```bash
pnpm --filter backend exec vitest run -t "records clearedBy when clearing on threshold-down"
```

Expected: FAIL — `clearedBy` is null.

- [ ] **Step 3: Implement — set `clearedBy` in the threshold-down branch**

In `apps/backend/src/services/profileTrust.service.ts`, edit the else-if clause (around line 106):

```ts
} else if (alreadyFlagged) {
  await prisma.profileTrustFlag.updateMany({
    where: { profileId, reason: 'SPAM_BURST', clearedAt: null },
    data: { clearedAt: new Date(), clearedBy: 'heuristic:spam_burst_below_threshold' },
  })
  // ...existing dynamic-import + queue.add stays the same
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
pnpm --filter backend exec vitest run -t "records clearedBy when clearing on threshold-down"
```

Expected: PASS.

- [ ] **Step 5: Write failing test — unvetted-window worker writes `clearedBy`**

Add to `apps/backend/src/__tests__/workers/profileTrustWorker.spec.ts` inside the `clear-unvetted-window` describe block:

```ts
it('records clearedBy=system:unvetted_window on auto-clear', async () => {
  const profile = await createTestProfile()
  await prisma.profileTrustFlag.create({
    data: {
      profileId: profile.id,
      reason: 'PROFILE_UNVETTED',
      evidence: { source: 'default_on_create' },
      flaggedBy: 'system:profile_create',
      flaggedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h ago
    },
  })

  await processProfileTrustJob(makeJob({ kind: 'clear-unvetted-window' }))

  const cleared = await prisma.profileTrustFlag.findFirst({
    where: { profileId: profile.id, reason: 'PROFILE_UNVETTED' },
  })
  expect(cleared?.clearedAt).toBeTruthy()
  expect(cleared?.clearedBy).toBe('system:unvetted_window')
})
```

(`makeJob` is the existing test helper in this file — reuse it. If not present, follow the helper pattern of nearby tests.)

- [ ] **Step 6: Run failing test**

```bash
pnpm --filter backend exec vitest run -t "records clearedBy=system:unvetted_window"
```

Expected: FAIL.

- [ ] **Step 7: Implement — set `clearedBy` in the worker**

In `apps/backend/src/workers/profileTrustWorker.ts:49-52`:

```ts
await prisma.profileTrustFlag.update({
  where: { id },
  data: { clearedAt: new Date(), clearedBy: 'system:unvetted_window' },
})
```

- [ ] **Step 8: Run test, expect PASS**

```bash
pnpm --filter backend exec vitest run -t "records clearedBy=system:unvetted_window"
```

Expected: PASS.

- [ ] **Step 9: Run full backend test suite to check no regressions**

```bash
pnpm --filter backend test
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/services/profileTrust.service.ts apps/backend/src/workers/profileTrustWorker.ts apps/backend/src/__tests__
git commit -m "feat(backend): populate clearedBy on heuristic and worker clears"
```

---

## Task 3: Add `flaggedBy` filter to clear-unvetted-window worker

**Files:**

- Modify: `apps/backend/src/workers/profileTrustWorker.ts:25-31`
- Modify: `apps/backend/src/__tests__/workers/profileTrustWorker.spec.ts`

- [ ] **Step 1: Write failing test — admin flag is NOT cleared at 24h**

Add to `apps/backend/src/__tests__/workers/profileTrustWorker.spec.ts`:

```ts
it('skips PROFILE_UNVETTED flags with flaggedBy starting with "admin:"', async () => {
  const profile = await createTestProfile()
  await prisma.profileTrustFlag.create({
    data: {
      profileId: profile.id,
      reason: 'PROFILE_UNVETTED',
      evidence: { note: 'manual hold' },
      flaggedBy: 'admin:manual',
      flaggedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    },
  })

  await processProfileTrustJob(makeJob({ kind: 'clear-unvetted-window' }))

  const flag = await prisma.profileTrustFlag.findFirst({
    where: { profileId: profile.id },
  })
  expect(flag?.clearedAt).toBeNull()
})
```

- [ ] **Step 2: Run failing test**

```bash
pnpm --filter backend exec vitest run -t "skips PROFILE_UNVETTED flags with flaggedBy starting with"
```

Expected: FAIL — admin flag is currently cleared.

- [ ] **Step 3: Implement — extend the where clause**

In `apps/backend/src/workers/profileTrustWorker.ts`, edit the query at line 27-30:

```ts
const flagsToClear = await prisma.profileTrustFlag.findMany({
  where: {
    reason: 'PROFILE_UNVETTED',
    clearedAt: null,
    flaggedAt: { lte: cutoff },
    flaggedBy: { not: { startsWith: 'admin:' } },
  },
  select: { id: true, profileId: true },
})
```

- [ ] **Step 4: Run test, expect PASS**

```bash
pnpm --filter backend exec vitest run -t "skips PROFILE_UNVETTED flags with flaggedBy starting with"
```

Expected: PASS.

- [ ] **Step 5: Re-run full worker test suite**

```bash
pnpm --filter backend exec vitest run profileTrustWorker
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/workers/profileTrustWorker.ts apps/backend/src/__tests__/workers/profileTrustWorker.spec.ts
git commit -m "feat(backend): exempt admin-set flags from unvetted-window auto-clear"
```

---

## Task 4: Service method — `listTrustFlags`

**Files:**

- Modify: `apps/backend/src/services/profileTrust.service.ts`
- Modify: `apps/backend/src/__tests__/services/profileTrust.service.spec.ts`

- [ ] **Step 1: Write failing tests for `listTrustFlags`**

Add a new describe block in `profileTrust.service.spec.ts`:

```ts
describe('listTrustFlags', () => {
  it('returns active flags by default, ordered by flaggedAt DESC', async () => {
    const p1 = await createTestProfile()
    const p2 = await createTestProfile()
    const older = await prisma.profileTrustFlag.create({
      data: { profileId: p1.id, reason: 'PROFILE_UNVETTED', evidence: {}, flaggedBy: 'system:profile_create', flaggedAt: new Date('2026-01-01') },
    })
    const newer = await prisma.profileTrustFlag.create({
      data: { profileId: p2.id, reason: 'PROFILE_UNVETTED', evidence: {}, flaggedBy: 'admin:manual', flaggedAt: new Date('2026-04-01') },
    })

    const { flags, total } = await ProfileTrustService.getInstance().listTrustFlags({ page: 1, pageSize: 10 })

    expect(total).toBe(2)
    expect(flags.map((f) => f.id)).toEqual([newer.id, older.id])
    expect(flags[0].profile.id).toBe(p2.id)
  })

  it('filters by reason', async () => {
    const p = await createTestProfile()
    await prisma.profileTrustFlag.create({
      data: { profileId: p.id, reason: 'PROFILE_UNVETTED', evidence: {}, flaggedBy: 'system:profile_create' },
    })
    await prisma.profileTrustFlag.create({
      data: { profileId: p.id, reason: 'SPAM_BURST', evidence: {}, flaggedBy: 'heuristic:spam_burst' },
    })

    const { flags } = await ProfileTrustService.getInstance().listTrustFlags({ page: 1, pageSize: 10, reason: 'SPAM_BURST' })

    expect(flags).toHaveLength(1)
    expect(flags[0].reason).toBe('SPAM_BURST')
  })

  it('includes cleared flags when activeOnly is false', async () => {
    const p = await createTestProfile()
    await prisma.profileTrustFlag.create({
      data: { profileId: p.id, reason: 'PROFILE_UNVETTED', evidence: {}, flaggedBy: 'system:profile_create', clearedAt: new Date(), clearedBy: 'system:unvetted_window' },
    })

    const activeOnly = await ProfileTrustService.getInstance().listTrustFlags({ page: 1, pageSize: 10 })
    const all = await ProfileTrustService.getInstance().listTrustFlags({ page: 1, pageSize: 10, activeOnly: false })

    expect(activeOnly.flags).toHaveLength(0)
    expect(all.flags).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm --filter backend exec vitest run -t "listTrustFlags"
```

Expected: FAIL — method doesn't exist.

- [ ] **Step 3: Implement `listTrustFlags`**

Add to `apps/backend/src/services/profileTrust.service.ts` (in the class body):

```ts
async listTrustFlags(opts: {
  activeOnly?: boolean
  reason?: TrustReasonType
  page: number
  pageSize: number
}): Promise<{
  flags: Array<{
    id: string
    profileId: string
    reason: TrustReasonType
    flaggedAt: Date
    flaggedBy: string
    clearedAt: Date | null
    clearedBy: string | null
    evidence: unknown
    profile: { id: string; publicName: string; country: string; cityName: string }
  }>
  total: number
}> {
  const { activeOnly = true, reason, page, pageSize } = opts
  const where = {
    ...(activeOnly ? { clearedAt: null } : {}),
    ...(reason ? { reason } : {}),
  }
  const [flags, total] = await Promise.all([
    prisma.profileTrustFlag.findMany({
      where,
      orderBy: { flaggedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        profile: { select: { id: true, publicName: true, country: true, cityName: true } },
      },
    }),
    prisma.profileTrustFlag.count({ where }),
  ])
  return { flags, total }
}
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
pnpm --filter backend exec vitest run -t "listTrustFlags"
```

Expected: all three PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/profileTrust.service.ts apps/backend/src/__tests__/services/profileTrust.service.spec.ts
git commit -m "feat(backend): add listTrustFlags service method"
```

---

## Task 5: Service method — `clearFlag`

**Files:**

- Modify: `apps/backend/src/services/profileTrust.service.ts`
- Modify: `apps/backend/src/__tests__/services/profileTrust.service.spec.ts`

- [ ] **Step 1: Write failing tests for `clearFlag`**

Add a new describe block:

```ts
describe('clearFlag', () => {
  it('writes clearedAt + clearedBy and enqueues promote-pendings on admin flag', async () => {
    const profile = await createTestProfile()
    const flag = await prisma.profileTrustFlag.create({
      data: { profileId: profile.id, reason: 'PROFILE_UNVETTED', evidence: { note: 'hold' }, flaggedBy: 'admin:manual' },
    })

    await ProfileTrustService.getInstance().clearFlag(flag.id, 'admin:manual')

    const updated = await prisma.profileTrustFlag.findUnique({ where: { id: flag.id } })
    expect(updated?.clearedAt).toBeTruthy()
    expect(updated?.clearedBy).toBe('admin:manual')
    // promote-pendings job is enqueued; assert via the queue mock used elsewhere in this file
  })

  it('throws 409 when flag is non-admin', async () => {
    const profile = await createTestProfile()
    const flag = await prisma.profileTrustFlag.create({
      data: { profileId: profile.id, reason: 'SPAM_BURST', evidence: {}, flaggedBy: 'heuristic:spam_burst' },
    })

    await expect(ProfileTrustService.getInstance().clearFlag(flag.id, 'admin:manual')).rejects.toThrow(/non-admin/i)
  })

  it('throws 409 when flag is already cleared', async () => {
    const profile = await createTestProfile()
    const flag = await prisma.profileTrustFlag.create({
      data: { profileId: profile.id, reason: 'PROFILE_UNVETTED', evidence: {}, flaggedBy: 'admin:manual', clearedAt: new Date(), clearedBy: 'admin:manual' },
    })

    await expect(ProfileTrustService.getInstance().clearFlag(flag.id, 'admin:manual')).rejects.toThrow(/already cleared/i)
  })

  it('throws 404 when flag does not exist', async () => {
    await expect(ProfileTrustService.getInstance().clearFlag('nonexistent', 'admin:manual')).rejects.toThrow(/not found/i)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm --filter backend exec vitest run -t "clearFlag"
```

Expected: FAIL.

- [ ] **Step 3: Implement `clearFlag`**

Add to `profileTrust.service.ts`. Define a typed error first, then the method:

```ts
export class ClearFlagError extends Error {
  constructor(message: string, public status: 404 | 409) {
    super(message)
    this.name = 'ClearFlagError'
  }
}

// inside the class:
async clearFlag(flagId: string, clearedBy: string): Promise<void> {
  const flag = await prisma.profileTrustFlag.findUnique({ where: { id: flagId } })
  if (!flag) throw new ClearFlagError('flag not found', 404)
  if (flag.clearedAt) throw new ClearFlagError('flag already cleared', 409)
  if (!flag.flaggedBy.startsWith('admin:')) {
    throw new ClearFlagError('cannot clear non-admin flag from admin UI', 409)
  }

  await prisma.profileTrustFlag.update({
    where: { id: flagId },
    data: { clearedAt: new Date(), clearedBy },
  })

  const { profileTrustQueue } = await import('@/queues/profileTrustQueue')
  await profileTrustQueue.add(
    'promote-pendings',
    { kind: 'promote-pendings', profileId: flag.profileId },
    {
      jobId: promotePendingsJobId(flag.profileId),
      removeOnComplete: { count: 0 },
      removeOnFail: { count: 100 },
    }
  )
}
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
pnpm --filter backend exec vitest run -t "clearFlag"
```

Expected: all four PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/profileTrust.service.ts apps/backend/src/__tests__/services/profileTrust.service.spec.ts
git commit -m "feat(backend): add clearFlag service method (admin-only, idempotency-safe)"
```

---

## Task 6: Service method — `flagProfile`

**Files:**

- Modify: `apps/backend/src/services/profileTrust.service.ts`
- Modify: `apps/backend/src/__tests__/services/profileTrust.service.spec.ts`

- [ ] **Step 1: Write failing tests for `flagProfile`**

```ts
describe('flagProfile', () => {
  it('writes a PROFILE_UNVETTED flag with note in evidence', async () => {
    const profile = await createTestProfile()

    const flag = await ProfileTrustService.getInstance().flagProfile(profile.id, 'sketchy account', 'admin:manual')

    expect(flag.reason).toBe('PROFILE_UNVETTED')
    expect(flag.flaggedBy).toBe('admin:manual')
    expect((flag.evidence as { note: string }).note).toBe('sketchy account')
  })

  it('is idempotent — second call returns the existing admin flag', async () => {
    const profile = await createTestProfile()
    const first = await ProfileTrustService.getInstance().flagProfile(profile.id, 'first', 'admin:manual')
    const second = await ProfileTrustService.getInstance().flagProfile(profile.id, 'second', 'admin:manual')

    expect(second.id).toBe(first.id)
    expect((second.evidence as { note: string }).note).toBe('first')

    const count = await prisma.profileTrustFlag.count({ where: { profileId: profile.id, flaggedBy: 'admin:manual' } })
    expect(count).toBe(1)
  })

  it('coexists with an existing system flag on the same profile', async () => {
    const profile = await createTestProfile()
    await prisma.profileTrustFlag.create({
      data: { profileId: profile.id, reason: 'PROFILE_UNVETTED', evidence: {}, flaggedBy: 'system:profile_create' },
    })

    const adminFlag = await ProfileTrustService.getInstance().flagProfile(profile.id, 'manual hold', 'admin:manual')

    const all = await prisma.profileTrustFlag.findMany({ where: { profileId: profile.id } })
    expect(all).toHaveLength(2)
    expect(adminFlag.flaggedBy).toBe('admin:manual')
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm --filter backend exec vitest run -t "flagProfile"
```

Expected: FAIL.

- [ ] **Step 3: Implement `flagProfile`**

```ts
async flagProfile(
  profileId: string,
  note: string,
  flaggedBy: string
): Promise<{
  id: string
  profileId: string
  reason: TrustReasonType
  flaggedAt: Date
  flaggedBy: string
  evidence: unknown
}> {
  const existing = await prisma.profileTrustFlag.findFirst({
    where: { profileId, clearedAt: null, flaggedBy: { startsWith: 'admin:' } },
  })
  if (existing) return existing

  return prisma.profileTrustFlag.create({
    data: {
      profileId,
      reason: 'PROFILE_UNVETTED',
      flaggedBy,
      evidence: { note },
    },
  })
}
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
pnpm --filter backend exec vitest run -t "flagProfile"
```

Expected: all three PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/profileTrust.service.ts apps/backend/src/__tests__/services/profileTrust.service.spec.ts
git commit -m "feat(backend): add flagProfile service method (idempotent admin write)"
```

---

## Task 7: Route — `GET /admin/trust-flags`

**Files:**

- Modify: `apps/backend/src/api/routes/admin.route.ts`
- Modify: `apps/backend/src/__tests__/routes/admin.route.spec.ts`

- [ ] **Step 1: Write failing route tests**

Inside the existing admin route describe:

```ts
describe('GET /admin/trust-flags', () => {
  it('rejects request without x-admin-authenticated header', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/trust-flags' })
    expect(res.statusCode).toBe(403)
  })

  it('returns active flags by default', async () => {
    const profile = await createTestProfile()
    await prisma.profileTrustFlag.create({
      data: { profileId: profile.id, reason: 'PROFILE_UNVETTED', evidence: {}, flaggedBy: 'admin:manual' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/admin/trust-flags?page=1&pageSize=25',
      headers: { 'x-admin-authenticated': 'true' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.flags).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  it('respects activeOnly=false', async () => {
    const profile = await createTestProfile()
    await prisma.profileTrustFlag.create({
      data: { profileId: profile.id, reason: 'PROFILE_UNVETTED', evidence: {}, flaggedBy: 'admin:manual', clearedAt: new Date(), clearedBy: 'admin:manual' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/admin/trust-flags?page=1&pageSize=25&activeOnly=false',
      headers: { 'x-admin-authenticated': 'true' },
    })

    expect(res.json().flags).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm --filter backend exec vitest run admin.route -t "GET /admin/trust-flags"
```

Expected: FAIL — route not registered.

- [ ] **Step 3: Implement the route handler**

In `apps/backend/src/api/routes/admin.route.ts`, add inside the plugin function:

```ts
fastify.get('/trust-flags', async (req, reply) => {
  const q = req.query as Record<string, string | undefined>
  const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize ?? '25', 10) || 25))
  const activeOnly = q.activeOnly !== 'false'
  const reason = q.reason as TrustReasonType | undefined

  try {
    const { flags, total } = await ProfileTrustService.getInstance().listTrustFlags({
      page,
      pageSize,
      activeOnly,
      reason,
    })
    return reply.send({ success: true, flags, total, page, pageSize })
  } catch (err) {
    return sendError(reply, err)
  }
})
```

Add the import for `TrustReasonType` at the top of the file:

```ts
import type { TrustReasonType } from '@zod/generated'
import { ProfileTrustService } from '@/services/profileTrust.service'
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
pnpm --filter backend exec vitest run admin.route -t "GET /admin/trust-flags"
```

Expected: all three PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/routes/admin.route.ts apps/backend/src/__tests__/routes/admin.route.spec.ts
git commit -m "feat(backend): add GET /admin/trust-flags endpoint"
```

---

## Task 8: Route — `POST /admin/trust-flags/:id/clear`

**Files:**

- Modify: `apps/backend/src/api/routes/admin.route.ts`
- Modify: `apps/backend/src/__tests__/routes/admin.route.spec.ts`

- [ ] **Step 1: Write failing route tests**

```ts
describe('POST /admin/trust-flags/:id/clear', () => {
  it('clears an admin-set flag', async () => {
    const profile = await createTestProfile()
    const flag = await prisma.profileTrustFlag.create({
      data: { profileId: profile.id, reason: 'PROFILE_UNVETTED', evidence: {}, flaggedBy: 'admin:manual' },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/admin/trust-flags/${flag.id}/clear`,
      headers: { 'x-admin-authenticated': 'true' },
    })

    expect(res.statusCode).toBe(200)
    const updated = await prisma.profileTrustFlag.findUnique({ where: { id: flag.id } })
    expect(updated?.clearedAt).toBeTruthy()
    expect(updated?.clearedBy).toBe('admin:manual')
  })

  it('returns 409 when flag is heuristic', async () => {
    const profile = await createTestProfile()
    const flag = await prisma.profileTrustFlag.create({
      data: { profileId: profile.id, reason: 'SPAM_BURST', evidence: {}, flaggedBy: 'heuristic:spam_burst' },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/admin/trust-flags/${flag.id}/clear`,
      headers: { 'x-admin-authenticated': 'true' },
    })

    expect(res.statusCode).toBe(409)
  })

  it('returns 404 on missing id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/trust-flags/missing/clear',
      headers: { 'x-admin-authenticated': 'true' },
    })

    expect(res.statusCode).toBe(404)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm --filter backend exec vitest run admin.route -t "POST /admin/trust-flags/:id/clear"
```

Expected: FAIL.

- [ ] **Step 3: Implement the route**

```ts
fastify.post('/trust-flags/:id/clear', async (req, reply) => {
  const { id } = req.params as { id: string }
  try {
    await ProfileTrustService.getInstance().clearFlag(id, 'admin:manual')
    return reply.send({ success: true })
  } catch (err) {
    if (err instanceof ClearFlagError) {
      return reply.code(err.status).send({ success: false, message: err.message })
    }
    return sendError(reply, err)
  }
})
```

Import `ClearFlagError` at the top:

```ts
import { ProfileTrustService, ClearFlagError } from '@/services/profileTrust.service'
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
pnpm --filter backend exec vitest run admin.route -t "POST /admin/trust-flags/:id/clear"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/routes/admin.route.ts apps/backend/src/__tests__/routes/admin.route.spec.ts
git commit -m "feat(backend): add POST /admin/trust-flags/:id/clear endpoint"
```

---

## Task 9: Route — `POST /admin/profiles/:id/flag`

**Files:**

- Modify: `apps/backend/src/api/routes/admin.route.ts`
- Modify: `apps/backend/src/__tests__/routes/admin.route.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe('POST /admin/profiles/:id/flag', () => {
  it('creates an admin flag with the provided note', async () => {
    const profile = await createTestProfile()

    const res = await app.inject({
      method: 'POST',
      url: `/admin/profiles/${profile.id}/flag`,
      headers: { 'x-admin-authenticated': 'true' },
      payload: { note: 'spammer reported by support' },
    })

    expect(res.statusCode).toBe(200)
    const flag = res.json().flag
    expect(flag.flaggedBy).toBe('admin:manual')
    expect(flag.evidence.note).toBe('spammer reported by support')
  })

  it('is idempotent on second call', async () => {
    const profile = await createTestProfile()
    const first = await app.inject({
      method: 'POST',
      url: `/admin/profiles/${profile.id}/flag`,
      headers: { 'x-admin-authenticated': 'true' },
      payload: { note: 'first' },
    })
    const second = await app.inject({
      method: 'POST',
      url: `/admin/profiles/${profile.id}/flag`,
      headers: { 'x-admin-authenticated': 'true' },
      payload: { note: 'second' },
    })

    expect(first.json().flag.id).toBe(second.json().flag.id)
  })

  it('returns 400 on empty note', async () => {
    const profile = await createTestProfile()
    const res = await app.inject({
      method: 'POST',
      url: `/admin/profiles/${profile.id}/flag`,
      headers: { 'x-admin-authenticated': 'true' },
      payload: { note: '' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 on note > 1000 chars', async () => {
    const profile = await createTestProfile()
    const res = await app.inject({
      method: 'POST',
      url: `/admin/profiles/${profile.id}/flag`,
      headers: { 'x-admin-authenticated': 'true' },
      payload: { note: 'x'.repeat(1001) },
    })
    expect(res.statusCode).toBe(400)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm --filter backend exec vitest run admin.route -t "POST /admin/profiles/:id/flag"
```

Expected: FAIL.

- [ ] **Step 3: Implement the route**

```ts
fastify.post('/profiles/:id/flag', async (req, reply) => {
  const { id } = req.params as { id: string }
  const body = req.body as { note?: unknown }
  const note = typeof body.note === 'string' ? body.note.trim() : ''

  if (note.length === 0 || note.length > 1000) {
    return reply.code(400).send({ success: false, message: 'note must be 1-1000 characters' })
  }

  try {
    const flag = await ProfileTrustService.getInstance().flagProfile(id, note, 'admin:manual')
    return reply.send({ success: true, flag })
  } catch (err) {
    return sendError(reply, err)
  }
})
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
pnpm --filter backend exec vitest run admin.route -t "POST /admin/profiles/:id/flag"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/routes/admin.route.ts apps/backend/src/__tests__/routes/admin.route.spec.ts
git commit -m "feat(backend): add POST /admin/profiles/:id/flag endpoint"
```

---

## Task 10: Route — extend `GET /admin/profiles` with `hasActiveTrustFlag`

**Files:**

- Modify: `apps/backend/src/api/routes/admin.route.ts` (existing GET /profiles handler around line 357)
- Modify: `apps/backend/src/__tests__/routes/admin.route.spec.ts`

- [ ] **Step 1: Write failing test**

Inside the existing `GET /admin/profiles` describe block (or add new describe):

```ts
it('includes hasActiveTrustFlag on each row', async () => {
  const flagged = await createTestProfile()
  const unflagged = await createTestProfile()
  await prisma.profileTrustFlag.create({
    data: { profileId: flagged.id, reason: 'PROFILE_UNVETTED', evidence: {}, flaggedBy: 'admin:manual' },
  })

  const res = await app.inject({
    method: 'GET',
    url: '/admin/profiles?page=1&pageSize=25',
    headers: { 'x-admin-authenticated': 'true' },
  })

  const rows = res.json().profiles as Array<{ id: string; hasActiveTrustFlag: boolean }>
  expect(rows.find((r) => r.id === flagged.id)?.hasActiveTrustFlag).toBe(true)
  expect(rows.find((r) => r.id === unflagged.id)?.hasActiveTrustFlag).toBe(false)
})
```

- [ ] **Step 2: Run failing test**

```bash
pnpm --filter backend exec vitest run admin.route -t "includes hasActiveTrustFlag"
```

Expected: FAIL — field absent.

- [ ] **Step 3: Implement — add `_count` and map to boolean**

In the existing GET /profiles handler (around line 357 in admin.route.ts), find the `prisma.profile.findMany` call. Add to the `select` (or `include`):

```ts
_count: { select: { trustFlags: { where: { clearedAt: null } } } },
```

Then in the response mapping, derive `hasActiveTrustFlag`:

```ts
const profiles = rows.map((p) => ({
  ...p,
  hasActiveTrustFlag: p._count.trustFlags > 0,
  _count: undefined, // strip from wire
}))
```

(Match the existing select/map style of the handler — adapt the field-stripping pattern to whatever the handler currently uses.)

- [ ] **Step 4: Run test, expect PASS**

```bash
pnpm --filter backend exec vitest run admin.route -t "includes hasActiveTrustFlag"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/routes/admin.route.ts apps/backend/src/__tests__/routes/admin.route.spec.ts
git commit -m "feat(backend): expose hasActiveTrustFlag on admin profile rows"
```

---

## Task 11: Route — `GET /admin/profiles/:id` (single-profile fetch for deep-links)

**Files:**

- Modify: `apps/backend/src/api/routes/admin.route.ts`
- Modify: `apps/backend/src/__tests__/routes/admin.route.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe('GET /admin/profiles/:id', () => {
  it('returns a single profile with trust flag info', async () => {
    const profile = await createTestProfile()
    await prisma.profileTrustFlag.create({
      data: { profileId: profile.id, reason: 'PROFILE_UNVETTED', evidence: { note: 'manual' }, flaggedBy: 'admin:manual' },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/admin/profiles/${profile.id}`,
      headers: { 'x-admin-authenticated': 'true' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.profile.id).toBe(profile.id)
    expect(body.profile.hasActiveTrustFlag).toBe(true)
    expect(body.profile.trustFlags).toHaveLength(1)
    expect(body.profile.trustFlags[0].flaggedBy).toBe('admin:manual')
  })

  it('returns 404 on missing id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/profiles/missing',
      headers: { 'x-admin-authenticated': 'true' },
    })
    expect(res.statusCode).toBe(404)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm --filter backend exec vitest run admin.route -t "GET /admin/profiles/:id"
```

Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
fastify.get('/profiles/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, phonenumber: true } },
      activitySummary: { select: { segment: true, lastSeenAt: true } },
      trustFlags: {
        where: { clearedAt: null },
        orderBy: { flaggedAt: 'desc' },
      },
    },
  })

  if (!profile) {
    return reply.code(404).send({ success: false, message: 'profile not found' })
  }

  const { trustFlags, ...rest } = profile
  return reply.send({
    success: true,
    profile: { ...rest, trustFlags, hasActiveTrustFlag: trustFlags.length > 0 },
  })
})
```

(Place this AFTER any more-specific `/profiles/...` routes — Fastify treats `/profiles/countries` as more specific only if registered first. Verify by re-checking the existing `/profiles/countries` route and putting `/profiles/:id` after it in the file.)

- [ ] **Step 4: Run tests, expect PASS**

```bash
pnpm --filter backend exec vitest run admin.route -t "GET /admin/profiles/:id"
```

Expected: PASS.

- [ ] **Step 5: Run full backend test suite**

```bash
pnpm --filter backend test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/api/routes/admin.route.ts apps/backend/src/__tests__/routes/admin.route.spec.ts
git commit -m "feat(backend): add GET /admin/profiles/:id for deep-link support"
```

---

## Task 12: Frontend — `useTrustFlags` composable

**Files:**

- Create: `apps/admin/src/composables/useTrustFlags.ts`

- [ ] **Step 1: Write the composable**

```ts
import { apiRequest } from './useApi'

export type TrustFlagRow = {
  id: string
  profileId: string
  reason: 'PROFILE_UNVETTED' | 'SPAM_BURST'
  flaggedAt: string
  flaggedBy: string
  clearedAt: string | null
  clearedBy: string | null
  evidence: unknown
  profile: { id: string; publicName: string; country: string; cityName: string }
}

export function listTrustFlags(opts: {
  activeOnly?: boolean
  reason?: 'PROFILE_UNVETTED' | 'SPAM_BURST'
  page: number
  pageSize: number
}) {
  return apiRequest<{ success: true; flags: TrustFlagRow[]; total: number; page: number; pageSize: number }>(
    '/admin/trust-flags',
    {
      params: {
        page: opts.page,
        pageSize: opts.pageSize,
        activeOnly: opts.activeOnly === false ? 'false' : undefined,
        reason: opts.reason,
      },
    }
  )
}

export function clearTrustFlag(id: string) {
  return apiRequest<{ success: true }>(`/admin/trust-flags/${id}/clear`, { method: 'POST' })
}

export function flagProfile(profileId: string, note: string) {
  return apiRequest<{ success: true; flag: TrustFlagRow }>(`/admin/profiles/${profileId}/flag`, {
    method: 'POST',
    body: { note },
  })
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter admin run type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/composables/useTrustFlags.ts
git commit -m "feat(admin): add useTrustFlags composable"
```

---

## Task 13: Frontend — `ModerationPage` skeleton + sidebar entry + route

**Files:**

- Create: `apps/admin/src/pages/ModerationPage.vue`
- Modify: `apps/admin/src/router.ts`
- Modify: `apps/admin/src/App.vue`

- [ ] **Step 1: Add the route**

In `apps/admin/src/router.ts`:

```ts
import ModerationPage from './pages/ModerationPage.vue'

// ...inside routes:
{ path: '/moderation', name: 'moderation', component: ModerationPage },
```

- [ ] **Step 2: Add the sidebar entry**

In `apps/admin/src/App.vue`, between the Profiles and Tags `<li>`:

```vue
<li class="nav-item">
  <router-link
    class="nav-link"
    to="/moderation"
    >Moderation</router-link
  >
</li>
```

- [ ] **Step 3: Create the ModerationPage skeleton**

Create `apps/admin/src/pages/ModerationPage.vue`:

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { listTrustFlags, clearTrustFlag, type TrustFlagRow } from '../composables/useTrustFlags'

const router = useRouter()
const flags = ref<TrustFlagRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const includeCleared = ref(false)
const reasonFilter = ref<'' | 'PROFILE_UNVETTED' | 'SPAM_BURST'>('')

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const hasMore = computed(() => flags.value.length < total.value)

async function fetch(reset = true) {
  if (reset) {
    page.value = 1
    flags.value = []
  }
  loading.value = reset
  loadingMore.value = !reset
  error.value = null
  try {
    const res = await listTrustFlags({
      page: page.value,
      pageSize,
      activeOnly: !includeCleared.value,
      reason: reasonFilter.value || undefined,
    })
    flags.value = reset ? res.flags : [...flags.value, ...res.flags]
    total.value = res.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'failed to load'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value) return
  page.value++
  fetch(false)
}

function isAdminFlag(f: TrustFlagRow) {
  return f.flaggedBy.startsWith('admin:')
}

function reasonBadgeClass(f: TrustFlagRow) {
  if (f.flaggedBy.startsWith('admin:')) return 'badge bg-danger'
  if (f.flaggedBy.startsWith('heuristic:')) return 'badge bg-warning text-dark'
  return 'badge bg-secondary'
}

function evidenceSummary(f: TrustFlagRow) {
  const e = f.evidence as Record<string, unknown> | null
  if (!e) return '—'
  if (typeof e.note === 'string') return e.note.length > 60 ? e.note.slice(0, 60) + '…' : e.note
  if (typeof e.countAtFlagTime === 'number') return `count=${e.countAtFlagTime}`
  if (typeof e.source === 'string') return String(e.source)
  return '—'
}

function openProfile(profileId: string) {
  router.push({ path: '/profiles', query: { profileId } })
}

const pendingClearId = ref<string | null>(null)
const clearError = ref<string | null>(null)
const clearing = ref(false)

function askClear(f: TrustFlagRow) {
  pendingClearId.value = f.id
  clearError.value = null
}

async function confirmClear() {
  if (!pendingClearId.value) return
  clearing.value = true
  try {
    await clearTrustFlag(pendingClearId.value)
    await fetch(true)
    pendingClearId.value = null
  } catch (err) {
    clearError.value = err instanceof Error ? err.message : 'clear failed'
  } finally {
    clearing.value = false
  }
}

onMounted(() => {
  fetch(true)
  observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) loadMore() }, { rootMargin: '200px' })
  if (sentinel.value) observer.observe(sentinel.value)
})

onUnmounted(() => { observer?.disconnect() })
</script>

<template>
  <div>
    <div class="d-flex align-items-baseline mb-4">
      <h2 class="mb-0">Moderation</h2>
      <span class="text-muted ms-auto">{{ total }} flag{{ total === 1 ? '' : 's' }}</span>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div class="mb-3 d-flex flex-wrap gap-2 align-items-center">
      <select v-model="reasonFilter" class="form-select" style="max-width: 220px" @change="fetch(true)">
        <option value="">All reasons</option>
        <option value="PROFILE_UNVETTED">PROFILE_UNVETTED</option>
        <option value="SPAM_BURST">SPAM_BURST</option>
      </select>
      <div class="form-check">
        <input id="include-cleared" v-model="includeCleared" type="checkbox" class="form-check-input" @change="fetch(true)" />
        <label for="include-cleared" class="form-check-label">Include cleared</label>
      </div>
    </div>

    <div class="table-container p-3">
      <div v-if="loading" class="text-muted">Loading...</div>
      <table v-else class="table table-hover mb-0">
        <thead>
          <tr>
            <th>Profile</th>
            <th>Reason</th>
            <th>FlaggedBy</th>
            <th>FlaggedAt</th>
            <th>Status</th>
            <th>Evidence</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in flags" :key="f.id" :class="{ 'table-secondary': f.clearedAt !== null }">
            <td>
              <a href="#" @click.prevent="openProfile(f.profileId)">{{ f.profile.publicName || f.profileId }}</a>
              <div class="small text-muted"><code>{{ f.profileId }}</code></div>
            </td>
            <td><span :class="reasonBadgeClass(f)">{{ f.reason }}</span></td>
            <td><code>{{ f.flaggedBy }}</code></td>
            <td :title="f.flaggedAt">{{ new Date(f.flaggedAt).toLocaleString() }}</td>
            <td>
              <span v-if="f.clearedAt" class="text-muted">
                cleared {{ new Date(f.clearedAt).toLocaleDateString() }} by <code>{{ f.clearedBy }}</code>
              </span>
              <span v-else class="badge bg-success">Active</span>
            </td>
            <td>{{ evidenceSummary(f) }}</td>
            <td>
              <button v-if="!f.clearedAt && isAdminFlag(f)"
                class="btn btn-sm btn-outline-primary"
                @click="askClear(f)">
                Clear
              </button>
            </td>
          </tr>
          <tr v-if="flags.length === 0">
            <td colspan="7" class="text-center text-muted">No flags</td>
          </tr>
        </tbody>
      </table>

      <div ref="sentinel" class="text-center text-muted py-2">
        <span v-if="loadingMore">Loading more...</span>
      </div>
    </div>

    <!-- Confirm clear modal -->
    <div v-if="pendingClearId" class="modal d-block" tabindex="-1" @click.self="pendingClearId = null">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">Clear quarantine?</h5></div>
          <div class="modal-body">
            <p>This will lift the manual quarantine and release any held messages.</p>
            <div v-if="clearError" class="alert alert-danger">{{ clearError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="clearing" @click="pendingClearId = null">Cancel</button>
            <button class="btn btn-primary" :disabled="clearing" @click="confirmClear">
              {{ clearing ? 'Clearing...' : 'Clear quarantine' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="pendingClearId" class="modal-backdrop show"></div>
  </div>
</template>
```

- [ ] **Step 4: Verify dev build**

```bash
pnpm --filter admin run type-check
```

Expected: PASS.

- [ ] **Step 5: Sanity-check in browser** (visual confirmation only — no automated test yet)

Run `pnpm dev`, open `https://localhost:5174/moderation`. Expect: page loads, sidebar shows Moderation between Profiles and Tags, empty table on a fresh dev DB. Manually create a flag via psql to confirm it appears.

```bash
docker compose exec db psql -U appuser -d app -c "INSERT INTO \"ProfileTrustFlag\" (id, \"profileId\", reason, \"flaggedAt\", evidence, \"flaggedBy\") SELECT gen_random_uuid()::text, id, 'PROFILE_UNVETTED', NOW(), '{\"note\": \"test\"}', 'admin:manual' FROM \"Profile\" LIMIT 1;"
```

Reload the moderation page; expect one row.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/router.ts apps/admin/src/App.vue apps/admin/src/pages/ModerationPage.vue
git commit -m "feat(admin): add Moderation page with list, filters, and clear flow"
```

---

## Task 14: Frontend — ensure `@vue/test-utils` is available, then test ModerationPage

**Files:**

- Modify: `apps/admin/package.json` (only if @vue/test-utils not already hoisted)
- Create: `apps/admin/src/pages/__tests__/ModerationPage.spec.ts`

- [ ] **Step 1: Check whether `@vue/test-utils` is resolvable**

```bash
pnpm --filter admin exec node -e "require.resolve('@vue/test-utils')"
```

Expected: prints a path. If it errors with "Cannot find module", proceed to step 2; otherwise skip to step 3.

- [ ] **Step 2: Add `@vue/test-utils` and `happy-dom`**

Match the version used by frontend (`apps/frontend/package.json` lists it). Then:

```bash
pnpm --filter admin add -D @vue/test-utils happy-dom
```

Add a `vitest` block to `apps/admin/vite.config.ts` (or create `apps/admin/vitest.config.ts`):

```ts
test: {
  environment: 'happy-dom',
  globals: false,
}
```

(Mirror the equivalent block from `apps/frontend/vite.config.ts` — don't invent the config from scratch.)

- [ ] **Step 3: Write component tests**

Create `apps/admin/src/pages/__tests__/ModerationPage.spec.ts`:

```ts
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../composables/useTrustFlags', () => ({
  listTrustFlags: vi.fn(),
  clearTrustFlag: vi.fn(),
  flagProfile: vi.fn(),
}))

import * as api from '../../composables/useTrustFlags'
import ModerationPage from '../ModerationPage.vue'

const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

const sampleFlags = [
  {
    id: 'f1',
    profileId: 'p1',
    reason: 'PROFILE_UNVETTED' as const,
    flaggedAt: '2026-04-25T10:00:00Z',
    flaggedBy: 'admin:manual',
    clearedAt: null,
    clearedBy: null,
    evidence: { note: 'manual hold' },
    profile: { id: 'p1', publicName: 'Alice', country: 'US', cityName: 'NYC' },
  },
  {
    id: 'f2',
    profileId: 'p2',
    reason: 'SPAM_BURST' as const,
    flaggedAt: '2026-04-24T10:00:00Z',
    flaggedBy: 'heuristic:spam_burst',
    clearedAt: null,
    clearedBy: null,
    evidence: { countAtFlagTime: 5 },
    profile: { id: 'p2', publicName: 'Bob', country: 'US', cityName: 'LA' },
  },
]

describe('ModerationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(api.listTrustFlags as any).mockResolvedValue({ success: true, flags: sampleFlags, total: 2, page: 1, pageSize: 25 })
  })

  it('renders flags returned by the API', async () => {
    const wrapper = mount(ModerationPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
  })

  it('shows Clear button only on admin flags', async () => {
    const wrapper = mount(ModerationPage)
    await flushPromises()
    const buttons = wrapper.findAll('button').filter((b) => b.text() === 'Clear')
    expect(buttons).toHaveLength(1)
  })

  it('calls clearTrustFlag and refetches on confirm', async () => {
    ;(api.clearTrustFlag as any).mockResolvedValue({ success: true })
    const wrapper = mount(ModerationPage)
    await flushPromises()

    await wrapper.findAll('button').filter((b) => b.text() === 'Clear')[0].trigger('click')
    await wrapper.findAll('button').filter((b) => b.text().includes('Clear quarantine'))[0].trigger('click')
    await flushPromises()

    expect(api.clearTrustFlag).toHaveBeenCalledWith('f1')
    expect(api.listTrustFlags).toHaveBeenCalledTimes(2) // initial load + refetch after clear
  })

  it('refetches with activeOnly=false when "Include cleared" is toggled', async () => {
    const wrapper = mount(ModerationPage)
    await flushPromises()

    await wrapper.find('input#include-cleared').setValue(true)
    await flushPromises()

    const calls = (api.listTrustFlags as any).mock.calls
    expect(calls[calls.length - 1][0].activeOnly).toBe(false)
  })
})
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter admin test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/package.json apps/admin/vite.config.ts apps/admin/src/pages/__tests__/ModerationPage.spec.ts
git commit -m "test(admin): cover ModerationPage rendering and clear flow"
```

---

## Task 15: Frontend — ProfilesPage interface + table-warning class

**Files:**

- Modify: `apps/admin/src/pages/ProfilesPage.vue`
- Create: `apps/admin/src/pages/__tests__/ProfilesPage.spec.ts`

- [ ] **Step 1: Update the `AdminProfile` interface**

In `apps/admin/src/pages/ProfilesPage.vue`, add `hasActiveTrustFlag: boolean` to the `AdminProfile` interface (alongside `isReported`, `isBlocked`, etc.):

```ts
interface AdminProfile {
  // ...existing fields...
  hasActiveTrustFlag: boolean
}
```

- [ ] **Step 2: Apply `table-warning` to flagged rows**

Find the `<tr v-for="profile in sortedProfiles" ...>` element and add a `:class` binding:

```vue
<tr
  v-for="profile in sortedProfiles"
  :key="profile.id"
  :class="{ 'table-warning': profile.hasActiveTrustFlag }"
  style="cursor: pointer"
  @click="viewProfile(profile)"
>
```

- [ ] **Step 3: Write component test**

Create `apps/admin/src/pages/__tests__/ProfilesPage.spec.ts`:

```ts
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../composables/useApi', () => {
  const call = vi.fn()
  const apiRequest = vi.fn()
  return {
    useApi: () => ({ call, loading: { value: false }, error: { value: null } }),
    apiRequest,
  }
})

vi.mock('../../composables/useTrustFlags', () => ({
  flagProfile: vi.fn(),
  clearTrustFlag: vi.fn(),
}))

import * as useApiMod from '../../composables/useApi'
import ProfilesPage from '../ProfilesPage.vue'

const baseProfile = {
  id: 'p1', publicName: 'Alice', country: 'US', cityName: 'NYC',
  isSocialActive: true, isDatingActive: false, isActive: true,
  isReported: false, isBlocked: false, isOnboarded: true,
  gender: 'F', createdAt: '2026-01-01T00:00:00Z', userId: 'u1',
  user: { email: 'a@b.com', phonenumber: null }, activitySummary: null,
}

describe('ProfilesPage — trust flag indicator', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('applies table-warning class to flagged rows', async () => {
    const flagged = { ...baseProfile, id: 'p2', publicName: 'Bob', hasActiveTrustFlag: true }
    const unflagged = { ...baseProfile, hasActiveTrustFlag: false }

    ;(useApiMod.useApi() as any).call.mockResolvedValue({
      success: true, profiles: [flagged, unflagged], total: 2, page: 1, pageSize: 25,
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].classes()).toContain('table-warning')
    expect(rows[1].classes()).not.toContain('table-warning')
  })
})
```

- [ ] **Step 4: Run test**

```bash
pnpm --filter admin test ProfilesPage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/ProfilesPage.vue apps/admin/src/pages/__tests__/ProfilesPage.spec.ts
git commit -m "feat(admin): highlight rows of profiles with active trust flags"
```

---

## Task 16: Frontend — ProfilesPage detail modal Trust section

**Files:**

- Modify: `apps/admin/src/pages/ProfilesPage.vue`
- Modify: `apps/admin/src/pages/__tests__/ProfilesPage.spec.ts`

- [ ] **Step 1: Extend the detail modal data type**

The detail modal currently uses `selectedProfile.value: AdminProfile | null` from the list. We need richer data (the actual flags) when opening. Refactor: when `viewProfile` is called, fetch full profile from `GET /admin/profiles/:id`:

In `ProfilesPage.vue`, add a new ref + helper:

```ts
import { apiRequest } from '../composables/useApi'

interface AdminProfileDetail extends AdminProfile {
  trustFlags: Array<{
    id: string
    reason: 'PROFILE_UNVETTED' | 'SPAM_BURST'
    flaggedAt: string
    flaggedBy: string
    evidence: unknown
  }>
}

const selectedProfileDetail = ref<AdminProfileDetail | null>(null)
const detailLoading = ref(false)

async function viewProfile(profile: AdminProfile) {
  selectedProfile.value = profile
  selectedProfileDetail.value = null
  detailLoading.value = true
  try {
    const res = await apiRequest<{ success: true; profile: AdminProfileDetail }>(`/admin/profiles/${profile.id}`)
    selectedProfileDetail.value = res.profile
  } finally {
    detailLoading.value = false
  }
}

const activeAdminFlag = computed(() =>
  selectedProfileDetail.value?.trustFlags.find((f) => f.flaggedBy.startsWith('admin:')) ?? null
)
const activeFlags = computed(() => selectedProfileDetail.value?.trustFlags ?? [])
```

- [ ] **Step 2: Render the Trust section in the existing modal body**

In the modal body, after the closing `</dl>`, add:

```vue
<div class="mt-3" v-if="detailLoading">
  <span class="text-muted">Loading trust info...</span>
</div>
<div class="mt-3" v-else-if="activeFlags.length > 0">
  <h6>Active trust flags</h6>
  <div v-for="f in activeFlags" :key="f.id" class="border rounded p-2 mb-2">
    <div><strong>{{ f.reason }}</strong> <code class="ms-2 small">{{ f.flaggedBy }}</code></div>
    <div class="small text-muted">{{ new Date(f.flaggedAt).toLocaleString() }}</div>
    <div v-if="(f.evidence as any)?.note" class="small">Note: {{ (f.evidence as any).note }}</div>
  </div>
</div>
<div class="mt-3" v-else>
  <span class="text-muted small">No active trust flags.</span>
</div>
```

- [ ] **Step 3: Add test for the Trust section**

Append to `ProfilesPage.spec.ts`:

```ts
describe('ProfilesPage — detail modal Trust section', () => {
  it('shows active flags when profile has them', async () => {
    const profile = { ...baseProfile, hasActiveTrustFlag: true }
    ;(useApiMod.useApi() as any).call.mockResolvedValue({
      success: true, profiles: [profile], total: 1, page: 1, pageSize: 25,
    })
    ;(useApiMod.apiRequest as any).mockResolvedValue({
      success: true,
      profile: {
        ...profile,
        trustFlags: [{ id: 'f1', reason: 'PROFILE_UNVETTED', flaggedAt: '2026-04-25T10:00:00Z', flaggedBy: 'admin:manual', evidence: { note: 'manual hold' } }],
      },
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Active trust flags')
    expect(wrapper.text()).toContain('manual hold')
  })

  it('shows "No active trust flags" when profile is clean', async () => {
    const profile = { ...baseProfile, hasActiveTrustFlag: false }
    ;(useApiMod.useApi() as any).call.mockResolvedValue({
      success: true, profiles: [profile], total: 1, page: 1, pageSize: 25,
    })
    ;(useApiMod.apiRequest as any).mockResolvedValue({
      success: true, profile: { ...profile, trustFlags: [] },
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('No active trust flags')
  })
})
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter admin test ProfilesPage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/ProfilesPage.vue apps/admin/src/pages/__tests__/ProfilesPage.spec.ts
git commit -m "feat(admin): display active trust flags in ProfilesPage detail modal"
```

---

## Task 17: Frontend — ProfilesPage detail modal Quarantine flow

**Files:**

- Modify: `apps/admin/src/pages/ProfilesPage.vue`
- Modify: `apps/admin/src/pages/__tests__/ProfilesPage.spec.ts`

- [ ] **Step 1: Add quarantine state + handler in script**

```ts
import { flagProfile } from '../composables/useTrustFlags'

const quarantineOpen = ref(false)
const quarantineNote = ref('')
const quarantineSubmitting = ref(false)
const quarantineError = ref<string | null>(null)

function openQuarantineForm() {
  quarantineOpen.value = true
  quarantineNote.value = ''
  quarantineError.value = null
}

function cancelQuarantine() {
  quarantineOpen.value = false
}

async function submitQuarantine() {
  if (!selectedProfile.value || quarantineNote.value.trim().length === 0) return
  quarantineSubmitting.value = true
  quarantineError.value = null
  try {
    const res = await flagProfile(selectedProfile.value.id, quarantineNote.value.trim())
    // Optimistically update list + detail
    selectedProfile.value = { ...selectedProfile.value, hasActiveTrustFlag: true }
    const idx = profiles.value.findIndex((p) => p.id === selectedProfile.value!.id)
    if (idx >= 0) profiles.value[idx] = { ...profiles.value[idx], hasActiveTrustFlag: true }
    if (selectedProfileDetail.value) {
      selectedProfileDetail.value = {
        ...selectedProfileDetail.value,
        trustFlags: [...selectedProfileDetail.value.trustFlags, { ...res.flag, flaggedAt: res.flag.flaggedAt }],
      }
    }
    quarantineOpen.value = false
  } catch (err) {
    quarantineError.value = err instanceof Error ? err.message : 'failed to quarantine'
  } finally {
    quarantineSubmitting.value = false
  }
}
```

- [ ] **Step 2: Add the Quarantine button + inline form in modal footer**

Find the existing modal footer (`<div class="modal-footer">` containing the Close button). Replace with:

```vue
<div class="modal-footer">
  <div v-if="!quarantineOpen && !activeAdminFlag" class="me-auto">
    <button class="btn btn-warning" @click="openQuarantineForm">Quarantine</button>
  </div>
  <div v-if="quarantineOpen" class="w-100">
    <div v-if="quarantineError" class="alert alert-danger">{{ quarantineError }}</div>
    <textarea
      v-model="quarantineNote"
      class="form-control mb-2"
      rows="3"
      placeholder="Reason for manual quarantine (1-1000 chars)"
      :disabled="quarantineSubmitting"
    />
    <div class="d-flex justify-content-end gap-2">
      <button class="btn btn-secondary" :disabled="quarantineSubmitting" @click="cancelQuarantine">Cancel</button>
      <button
        class="btn btn-warning"
        :disabled="quarantineSubmitting || quarantineNote.trim().length === 0"
        @click="submitQuarantine"
      >
        {{ quarantineSubmitting ? 'Submitting...' : 'Confirm quarantine' }}
      </button>
    </div>
  </div>
  <button v-if="!quarantineOpen" class="btn btn-secondary" @click="selectedProfile = null">Close</button>
</div>
```

- [ ] **Step 3: Test the quarantine flow**

Append to `ProfilesPage.spec.ts`:

```ts
import { flagProfile as flagProfileMock } from '../../composables/useTrustFlags'

it('posts quarantine note and updates row to flagged', async () => {
  const profile = { ...baseProfile, hasActiveTrustFlag: false }
  ;(useApiMod.useApi() as any).call.mockResolvedValue({
    success: true, profiles: [profile], total: 1, page: 1, pageSize: 25,
  })
  ;(useApiMod.apiRequest as any).mockResolvedValue({
    success: true, profile: { ...profile, trustFlags: [] },
  })
  ;(flagProfileMock as any).mockResolvedValue({
    success: true,
    flag: { id: 'fNew', profileId: profile.id, reason: 'PROFILE_UNVETTED', flaggedAt: '2026-04-25T11:00:00Z', flaggedBy: 'admin:manual', evidence: { note: 'sketchy' } },
  })

  const wrapper = mount(ProfilesPage)
  await flushPromises()
  await wrapper.find('tbody tr').trigger('click')
  await flushPromises()

  await wrapper.findAll('button').filter((b) => b.text() === 'Quarantine')[0].trigger('click')
  await wrapper.find('textarea').setValue('sketchy')
  await wrapper.findAll('button').filter((b) => b.text().includes('Confirm quarantine'))[0].trigger('click')
  await flushPromises()

  expect(flagProfileMock).toHaveBeenCalledWith(profile.id, 'sketchy')
  expect(wrapper.find('tbody tr').classes()).toContain('table-warning')
})
```

- [ ] **Step 4: Run test**

```bash
pnpm --filter admin test ProfilesPage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/ProfilesPage.vue apps/admin/src/pages/__tests__/ProfilesPage.spec.ts
git commit -m "feat(admin): allow manual quarantine from ProfilesPage detail modal"
```

---

## Task 18: Frontend — ProfilesPage detail modal Clear quarantine flow

**Files:**

- Modify: `apps/admin/src/pages/ProfilesPage.vue`
- Modify: `apps/admin/src/pages/__tests__/ProfilesPage.spec.ts`

- [ ] **Step 1: Add clear-quarantine state + handler**

```ts
import { clearTrustFlag } from '../composables/useTrustFlags'

const clearConfirmOpen = ref(false)
const clearSubmitting = ref(false)
const clearErrorDetail = ref<string | null>(null)

function askClearQuarantine() {
  clearConfirmOpen.value = true
  clearErrorDetail.value = null
}

async function confirmClearQuarantine() {
  if (!activeAdminFlag.value || !selectedProfile.value) return
  clearSubmitting.value = true
  clearErrorDetail.value = null
  try {
    await clearTrustFlag(activeAdminFlag.value.id)
    if (selectedProfileDetail.value) {
      const remaining = selectedProfileDetail.value.trustFlags.filter((f) => f.id !== activeAdminFlag.value!.id)
      selectedProfileDetail.value = { ...selectedProfileDetail.value, trustFlags: remaining }
      // Update list-row indicator only if no other flags remain
      if (remaining.length === 0) {
        selectedProfile.value = { ...selectedProfile.value, hasActiveTrustFlag: false }
        const idx = profiles.value.findIndex((p) => p.id === selectedProfile.value!.id)
        if (idx >= 0) profiles.value[idx] = { ...profiles.value[idx], hasActiveTrustFlag: false }
      }
    }
    clearConfirmOpen.value = false
  } catch (err) {
    clearErrorDetail.value = err instanceof Error ? err.message : 'clear failed'
  } finally {
    clearSubmitting.value = false
  }
}
```

- [ ] **Step 2: Add the Clear button in modal footer + confirm dialog**

Inside the `<div class="modal-footer">`, alongside the existing Quarantine block:

```vue
<button v-if="!quarantineOpen && activeAdminFlag" class="btn btn-outline-primary me-auto" @click="askClearQuarantine">
  Clear quarantine
</button>
```

Add a confirm dialog (anywhere outside the existing modal, sibling element):

```vue
<div v-if="clearConfirmOpen" class="modal d-block" tabindex="-1" @click.self="clearConfirmOpen = false">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Clear quarantine?</h5></div>
      <div class="modal-body">
        <p>Lift the manual quarantine on {{ selectedProfile?.publicName || selectedProfile?.id }}?</p>
        <div v-if="clearErrorDetail" class="alert alert-danger">{{ clearErrorDetail }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" :disabled="clearSubmitting" @click="clearConfirmOpen = false">Cancel</button>
        <button class="btn btn-primary" :disabled="clearSubmitting" @click="confirmClearQuarantine">
          {{ clearSubmitting ? 'Clearing...' : 'Clear quarantine' }}
        </button>
      </div>
    </div>
  </div>
</div>
<div v-if="clearConfirmOpen" class="modal-backdrop show"></div>
```

- [ ] **Step 3: Test the clear flow**

Append to `ProfilesPage.spec.ts`:

```ts
import { clearTrustFlag as clearTrustFlagMock } from '../../composables/useTrustFlags'

it('clears admin flag and updates row when no other flags remain', async () => {
  const profile = { ...baseProfile, hasActiveTrustFlag: true }
  ;(useApiMod.useApi() as any).call.mockResolvedValue({
    success: true, profiles: [profile], total: 1, page: 1, pageSize: 25,
  })
  ;(useApiMod.apiRequest as any).mockResolvedValue({
    success: true,
    profile: { ...profile, trustFlags: [{ id: 'fAdmin', reason: 'PROFILE_UNVETTED', flaggedAt: '2026-04-25T10:00:00Z', flaggedBy: 'admin:manual', evidence: { note: 'hold' } }] },
  })
  ;(clearTrustFlagMock as any).mockResolvedValue({ success: true })

  const wrapper = mount(ProfilesPage)
  await flushPromises()
  await wrapper.find('tbody tr').trigger('click')
  await flushPromises()

  await wrapper.findAll('button').filter((b) => b.text() === 'Clear quarantine')[0].trigger('click')
  await wrapper.findAll('button').filter((b) => b.text().includes('Clear quarantine') && !b.text().includes('Cancel'))[1].trigger('click')
  await flushPromises()

  expect(clearTrustFlagMock).toHaveBeenCalledWith('fAdmin')
  expect(wrapper.find('tbody tr').classes()).not.toContain('table-warning')
})

it('does not show Clear quarantine for system-only flags', async () => {
  const profile = { ...baseProfile, hasActiveTrustFlag: true }
  ;(useApiMod.useApi() as any).call.mockResolvedValue({
    success: true, profiles: [profile], total: 1, page: 1, pageSize: 25,
  })
  ;(useApiMod.apiRequest as any).mockResolvedValue({
    success: true,
    profile: { ...profile, trustFlags: [{ id: 'fSys', reason: 'PROFILE_UNVETTED', flaggedAt: '2026-04-25T10:00:00Z', flaggedBy: 'system:profile_create', evidence: {} }] },
  })

  const wrapper = mount(ProfilesPage)
  await flushPromises()
  await wrapper.find('tbody tr').trigger('click')
  await flushPromises()

  const clearButtons = wrapper.findAll('button').filter((b) => b.text() === 'Clear quarantine')
  expect(clearButtons).toHaveLength(0)
})
```

- [ ] **Step 4: Run test**

```bash
pnpm --filter admin test ProfilesPage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/ProfilesPage.vue apps/admin/src/pages/__tests__/ProfilesPage.spec.ts
git commit -m "feat(admin): allow clearing admin-set quarantine from ProfilesPage detail modal"
```

---

## Task 19: Frontend — Moderation → Profiles deep-link

**Files:**

- Modify: `apps/admin/src/pages/ProfilesPage.vue`
- Modify: `apps/admin/src/pages/__tests__/ProfilesPage.spec.ts`

- [ ] **Step 1: Watch the route for `?profileId=` and auto-open the modal**

In `ProfilesPage.vue`'s script:

```ts
import { useRoute } from 'vue-router'

const route = useRoute()

async function openProfileById(id: string) {
  // Fast path: already in the visible list
  const inList = profiles.value.find((p) => p.id === id)
  if (inList) {
    return viewProfile(inList)
  }
  // Slow path: fetch by id
  detailLoading.value = true
  try {
    const res = await apiRequest<{ success: true; profile: AdminProfileDetail }>(`/admin/profiles/${id}`)
    selectedProfile.value = res.profile
    selectedProfileDetail.value = res.profile
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  // ...existing onMounted body...
  if (typeof route.query.profileId === 'string') {
    openProfileById(route.query.profileId)
  }
})

watch(
  () => route.query.profileId,
  (id) => { if (typeof id === 'string') openProfileById(id) }
)
```

- [ ] **Step 2: Test the deep-link**

Append to `ProfilesPage.spec.ts`:

```ts
const mockRoute = { query: { profileId: undefined as string | undefined } }
vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}))

it('auto-opens the modal for ?profileId=', async () => {
  mockRoute.query.profileId = 'p-deep'
  ;(useApiMod.useApi() as any).call.mockResolvedValue({
    success: true, profiles: [], total: 0, page: 1, pageSize: 25,
  })
  ;(useApiMod.apiRequest as any).mockResolvedValue({
    success: true,
    profile: { ...baseProfile, id: 'p-deep', publicName: 'Deep', hasActiveTrustFlag: false, trustFlags: [] },
  })

  const wrapper = mount(ProfilesPage)
  await flushPromises()

  expect(wrapper.text()).toContain('Profile Detail')
  expect(wrapper.text()).toContain('Deep')

  mockRoute.query.profileId = undefined
})
```

(Note: this test requires hoisting the `useRoute` mock above the existing one in the file — make a single combined `vue-router` mock that includes both `useRoute` and any earlier `useRouter`. Re-check the existing mocks and consolidate.)

- [ ] **Step 3: Run test**

```bash
pnpm --filter admin test ProfilesPage
```

Expected: PASS.

- [ ] **Step 4: Manually verify in browser**

Run `pnpm dev`, open `https://localhost:5174/moderation`, click a flag's profile name → should navigate to `/profiles?profileId=...` and open the detail modal automatically.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/ProfilesPage.vue apps/admin/src/pages/__tests__/ProfilesPage.spec.ts
git commit -m "feat(admin): auto-open detail modal on /profiles?profileId= deep-link"
```

---

## Task 20: Final verification + changeset + format

**Files:**

- Create: `.changeset/<adjective-noun-verb>.md`
- Format: only files modified in this branch

- [ ] **Step 1: Run the full CI suite**

```bash
pnpm run ci:test
```

Expected: PASS for install / prisma / lint / type-check / build / tests / i18n.

If any step fails, fix it and re-run before proceeding.

- [ ] **Step 2: Create the changeset**

Pick three random kebab-case words and write the file directly (changeset CLI is interactive-only):

```bash
cat > .changeset/admin-moderation-feature.md << 'EOF'
---
'@opencupid/backend': minor
'@opencupid/admin': minor
---

Expose profile-trust quarantine in the admin GUI: new Moderation page, manual flag/clear flow from ProfilesPage detail modal, and a clearedBy column for symmetric audit on ProfileTrustFlag.
EOF
```

- [ ] **Step 3: Format only the files this branch touched**

Use git to compute the list — never `pnpm format` on the whole tree:

```bash
git diff --name-only main...HEAD -- '*.ts' '*.tsx' '*.vue' '*.json' '*.md' | xargs pnpm exec prettier --write
```

- [ ] **Step 4: Commit changeset + format**

```bash
git add .changeset
git diff --name-only HEAD | xargs git add
git commit -m "chore: add changeset and format moderation feature files"
```

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin feat/admin-moderation
gh pr create --title "Admin moderation: expose profile-trust quarantine in admin GUI" --body "$(cat <<'EOF'
## Summary

- Adds Moderation page to the admin GUI listing currently-flagged profiles (with optional history view via "Include cleared" toggle)
- Allows admins to manually quarantine and clear-quarantine profiles from the ProfilesPage detail modal
- Adds clearedBy column to ProfileTrustFlag for symmetric audit
- Workers leave admin-set flags immune to auto-clear (filter on flaggedBy prefix)

Spec: docs/superpowers/specs/2026-04-25-admin-moderation-design.md
Follow-up to: #1368

## Test plan

- [x] pnpm --filter backend test
- [x] pnpm --filter admin test
- [x] pnpm type-check
- [x] pnpm lint
- [x] pnpm run ci:test
- [ ] Manual: flag a profile from /profiles detail modal, verify table-warning row class appears, verify Moderation page lists it, verify clear flow updates both pages

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Watch CI in the background**

Dispatch a subagent to monitor CI and report when it finishes. Do not block on it.

---

## Self-review

**Spec coverage check:** Walked through each section of the spec.

- ✅ Goal — covered by Tasks 1–19 collectively.
- ✅ Non-goals — none implemented (manual SPAM_BURST, per-admin identity, bulk ops are explicitly absent from tasks).
- ✅ Decisions 1-6 — all encoded in the implementation.
- ✅ Schema change — Task 1.
- ✅ flaggedBy/clearedBy conventions — encoded in Tasks 2 (auto-clear sites), 5 (clearFlag), 6 (flagProfile), 8 (clear endpoint), 9 (flag endpoint).
- ✅ Existing call site updates — Tasks 2 (clearedBy population) and 3 (admin filter).
- ✅ Service methods — Tasks 4, 5, 6.
- ✅ API endpoints — Tasks 7, 8, 9. Modified `GET /profiles` — Task 10. New `GET /profiles/:id` — Task 11 (added beyond the spec to support the deep-link UX in spec section "ModerationPage / Columns").
- ✅ Frontend — Tasks 12 (composable), 13 (page + sidebar + route), 14 (tests), 15-18 (ProfilesPage), 19 (deep-link).
- ✅ Tests — every task has TDD steps; bulk-suite verification in Task 20.
- ✅ Out of scope — confirmed nothing leaks into a task.

**Type consistency check:** `TrustFlagRow`, `AdminProfile`, `AdminProfileDetail`, `ClearFlagError` — types defined in their first task and reused unchanged in later tasks. `flagProfile` returns the same shape used by the route response payload and the frontend mock fixtures. `listTrustFlags` return type matches the wire shape used by the composable.

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / "add appropriate error handling" markers. Two phrasings worth noting:

- Task 14 step 2: "Mirror the equivalent block from `apps/frontend/vite.config.ts`" — this is direction to copy a proven config, not a placeholder.
- Task 10 step 3: "Match the existing select/map style of the handler — adapt the field-stripping pattern to whatever the handler currently uses." — this is necessary because the existing handler uses a non-trivial mapping pattern (segment, lastSeenAt) that's adjacent to the change; reproducing the whole handler verbatim would risk drift. The instruction is bounded ("strip `_count` from the wire") and the engineer has the file in front of them.

**Minor risk flagged for execution:** Task 11 step 3 places the `/profiles/:id` route after `/profiles/countries`. If the engineer reorders, Fastify's static-route precedence may break the countries endpoint. The plan calls this out; the executing-plans skill should re-verify by running the full route test suite after Task 11 (Task 11 step 5 already runs `pnpm --filter backend test`).

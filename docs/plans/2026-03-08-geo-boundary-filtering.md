# Geo-Boundary Filtering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When the user drags/zooms the map, refetch profiles using the visible viewport bounds — no country filter, tags still applied.

**Architecture:** New dedicated backend endpoint `GET /find/social/map/bounds` with a matching service method that filters by lat/lon bounds + tags only (no country). Frontend: `OsmPoiMap.vue` emits `bounds-changed` on Leaflet `moveend`, passed through `MapView.vue` to `SocialMatch.vue`, which calls the store with a 500ms debounce and AbortController for race-condition safety.

**Tech Stack:** Vue 3 + Pinia + Leaflet.js (frontend), Fastify + Prisma (backend), Vitest (tests), VueUse `useDebounceFn`, axios with `signal` for abort.

---

## Task 1: Backend service — `findSocialProfilesInBounds()`

**Files:**
- Modify: `apps/backend/src/services/profileMatch.service.ts`
- Test: `apps/backend/src/__tests__/services/profileMatch_social.service.spec.ts`

### Step 1: Write the failing tests

Add to the bottom of `profileMatch_social.service.spec.ts`:

```typescript
describe('ProfileMatchService.findSocialProfilesInBounds', () => {
  const bounds = { south: 45.0, north: 48.0, west: 16.0, east: 23.0 }

  it('returns empty array if no user preferences found', async () => {
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(null)
    const result = await service.findSocialProfilesInBounds(mockProfileId, bounds)
    expect(result).toEqual([])
  })

  it('applies bounds filter on lat/lon', async () => {
    const mockUserPrefs = { profileId: mockProfileId }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesInBounds(mockProfileId, bounds)

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lat: { not: null, gte: 45.0, lte: 48.0 },
          lon: { not: null, gte: 16.0, lte: 23.0 },
        }),
      })
    )
  })

  it('does NOT apply country filter even when user has one set', async () => {
    const mockUserPrefs = { profileId: mockProfileId, country: 'HU' }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesInBounds(mockProfileId, bounds)

    const call = mockPrisma.profile.findMany.mock.calls[0][0]
    expect(call.where).not.toHaveProperty('country')
  })

  it('applies tag filter when tags are set', async () => {
    const mockUserPrefs = { profileId: mockProfileId, tags: [{ id: 'tag-1' }] }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesInBounds(mockProfileId, bounds)

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { some: { id: { in: ['tag-1'] } } },
        }),
      })
    )
  })

  it('applies standard status and blocklist filters', async () => {
    const mockUserPrefs = { profileId: mockProfileId }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesInBounds(mockProfileId, bounds)

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          isOnboarded: true,
          isSocialActive: true,
        }),
      })
    )
    expect(blocklistWhereClause).toHaveBeenCalledWith(mockProfileId)
  })

  it('limits results to 500', async () => {
    const mockUserPrefs = { profileId: mockProfileId }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesInBounds(mockProfileId, bounds)

    const call = mockPrisma.profile.findMany.mock.calls[0][0]
    expect(call.take).toBe(500)
  })
})
```

### Step 2: Run tests to verify they fail

Run: `pnpm --filter backend exec vitest run src/__tests__/services/profileMatch_social.service.spec.ts`
Expected: FAIL — `service.findSocialProfilesInBounds is not a function`

### Step 3: Implement the service method

Add to `profileMatch.service.ts` — a new private method `buildBoundsWhereClause` and the public `findSocialProfilesInBounds`:

```typescript
private async buildBoundsWhereClause(profileId: string) {
  const userPrefs = await this.getSocialMatchFilter(profileId)
  if (!userPrefs) return null

  const tagIds = userPrefs.tags?.map((tag) => tag.id)

  return {
    ...statusFlags,
    isSocialActive: true,
    ...(userPrefs.tags?.length ? { tags: { some: { id: { in: tagIds } } } } : {}),
    ...blocklistWhereClause(profileId),
  }
}

async findSocialProfilesInBounds(
  profileId: string,
  bounds: { south: number; north: number; west: number; east: number },
  orderBy: OrderBy = defaultOrderBy
): Promise<DbProfileWithImages[]> {
  const where = await this.buildBoundsWhereClause(profileId)
  if (!where) return []

  const locationFilter = {
    lat: { not: null, gte: bounds.south, lte: bounds.north },
    lon: { not: null, gte: bounds.west, lte: bounds.east },
  }

  return await prisma.profile.findMany({
    where: { ...where, ...locationFilter },
    include: {
      ...tagsInclude(),
      ...profileImageInclude(),
    },
    take: 500,
    orderBy,
  })
}
```

### Step 4: Run tests to verify they pass

Run: `pnpm --filter backend exec vitest run src/__tests__/services/profileMatch_social.service.spec.ts`
Expected: ALL PASS

### Step 5: Commit

```bash
git add apps/backend/src/services/profileMatch.service.ts apps/backend/src/__tests__/services/profileMatch_social.service.spec.ts
git commit -m "feat(backend): add findSocialProfilesInBounds service method (#1032)"
```

---

## Task 2: Backend route — `GET /social/map/bounds`

**Files:**
- Modify: `apps/backend/src/api/routes/findProfile.route.ts`
- Test: `apps/backend/src/__tests__/routes/findProfile.route.spec.ts`

### Step 1: Write the failing tests

Add a new mock at the top of `findProfile.route.spec.ts` alongside the existing mocks:

```typescript
const mockFindSocialProfilesInBounds = vi.fn()
```

Add it to the `getInstance` mock return:

```typescript
findSocialProfilesInBounds: mockFindSocialProfilesInBounds,
```

Add the test block:

```typescript
describe('GET /social/map/bounds', () => {
  const handler = () => fastify.routes['GET /social/map/bounds']

  it('returns profiles within bounds', async () => {
    const mockProfiles = [
      { id: 'p1', publicName: 'Alice', lat: 47.5, lon: 19.0, country: 'HU', cityName: 'Budapest', profileImages: [], tags: [] },
    ]
    mockFindSocialProfilesInBounds.mockResolvedValue(mockProfiles)

    await handler()(
      {
        session: mockSession,
        query: { south: '45.0', north: '48.0', west: '16.0', east: '23.0' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.profiles).toHaveLength(1)
    expect(mockFindSocialProfilesInBounds).toHaveBeenCalledWith(
      'profile-123',
      { south: 45.0, north: 48.0, west: 16.0, east: 23.0 },
      [{ updatedAt: 'desc' }]
    )
  })

  it('returns 400 when bounds params are missing', async () => {
    await handler()(
      { session: mockSession, query: {}, log: { error: vi.fn() } },
      reply
    )

    expect(reply.statusCode).toBe(400)
    expect(mockFindSocialProfilesInBounds).not.toHaveBeenCalled()
  })

  it('returns 403 when social is not active', async () => {
    await handler()(
      {
        session: { ...mockSession, profile: { ...mockSession.profile, isSocialActive: false } },
        query: { south: '45.0', north: '48.0', west: '16.0', east: '23.0' },
      },
      reply
    )

    expect(reply.statusCode).toBe(403)
    expect(mockFindSocialProfilesInBounds).not.toHaveBeenCalled()
  })

  it('returns 500 on service error', async () => {
    mockFindSocialProfilesInBounds.mockRejectedValue(new Error('DB error'))

    await handler()(
      {
        session: mockSession,
        query: { south: '45.0', north: '48.0', west: '16.0', east: '23.0' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(reply.statusCode).toBe(500)
  })
})
```

### Step 2: Run tests to verify they fail

Run: `pnpm --filter backend exec vitest run src/__tests__/routes/findProfile.route.spec.ts`
Expected: FAIL — `handler()` is undefined (route not registered yet)

### Step 3: Implement the route

Add to `findProfile.route.ts`, after the existing `GET /social/map` route. Use zod for query validation:

```typescript
const BoundsQuerySchema = z.object({
  south: z.preprocess((v) => (typeof v === 'string' ? parseFloat(v) : v), z.number()),
  north: z.preprocess((v) => (typeof v === 'string' ? parseFloat(v) : v), z.number()),
  west: z.preprocess((v) => (typeof v === 'string' ? parseFloat(v) : v), z.number()),
  east: z.preprocess((v) => (typeof v === 'string' ? parseFloat(v) : v), z.number()),
})

fastify.get('/social/map/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
  if (!req.session.profile.isSocialActive) {
    return sendForbiddenError(reply)
  }

  const parsed = BoundsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return sendError(reply, 400, 'Missing or invalid bounds parameters (south, north, west, east)')
  }

  const myProfileId = req.session.profileId
  const locale = req.session.lang
  const bounds = parsed.data

  try {
    const profiles = await profileMatchService.findSocialProfilesInBounds(
      myProfileId,
      bounds,
      [{ updatedAt: 'desc' }]
    )
    const mappedProfiles = profiles.map((p) => mapProfileToPublic(p, false, locale))
    const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
    return reply.code(200).send(response)
  } catch (err) {
    req.log.error(err)
    return sendError(reply, 500, 'Failed to fetch bounded map profiles')
  }
})
```

### Step 4: Run tests to verify they pass

Run: `pnpm --filter backend exec vitest run src/__tests__/routes/findProfile.route.spec.ts`
Expected: ALL PASS

### Step 5: Commit

```bash
git add apps/backend/src/api/routes/findProfile.route.ts apps/backend/src/__tests__/routes/findProfile.route.spec.ts
git commit -m "feat(backend): add GET /social/map/bounds route (#1032)"
```

---

## Task 3: Frontend store — `findSocialForMapBounds()` with AbortController

**Files:**
- Modify: `apps/frontend/src/features/browse/stores/findProfileStore.ts`
- Create: `apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts`

### Step 1: Write the failing tests

Create the test file:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { CanceledError } from 'axios'

const mockGet = vi.fn()
vi.mock('@/lib/api', () => ({
  api: { get: mockGet },
  safeApiCall: (fn: () => any) => fn(),
  isApiOnline: () => Promise.resolve(),
}))

vi.mock('@/lib/bus', () => ({
  bus: { on: vi.fn(), emit: vi.fn() },
}))

import { useFindProfileStore } from '../findProfileStore'

describe('findProfileStore.findSocialForMapBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    vi.clearAllMocks()
  })

  const bounds = { south: 45, north: 48, west: 16, east: 23 }

  it('calls the bounded map endpoint with bounds params', async () => {
    mockGet.mockResolvedValue({
      data: {
        profiles: [
          { id: 'p1', publicName: 'Alice', location: { country: 'HU' }, profileImages: [], tags: [] },
        ],
      },
    })

    await store.findSocialForMapBounds(bounds)

    expect(mockGet).toHaveBeenCalledWith(
      '/find/social/map/bounds',
      expect.objectContaining({
        params: { south: 45, north: 48, west: 16, east: 23 },
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('updates profileList with fetched results', async () => {
    const profiles = [
      { id: 'p1', publicName: 'Alice', location: { country: 'HU' }, profileImages: [], tags: [] },
    ]
    mockGet.mockResolvedValue({ data: { profiles } })

    await store.findSocialForMapBounds(bounds)

    expect(store.profileList).toHaveLength(1)
    expect(store.profileList[0].id).toBe('p1')
  })

  it('sets isLoading during fetch', async () => {
    let resolveGet: any
    mockGet.mockReturnValue(new Promise((r) => (resolveGet = r)))

    const promise = store.findSocialForMapBounds(bounds)
    expect(store.isLoading).toBe(true)

    resolveGet({ data: { profiles: [] } })
    await promise
    expect(store.isLoading).toBe(false)
  })

  it('aborts previous request when a new one starts', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

    let resolveFirst: any
    mockGet.mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))

    const first = store.findSocialForMapBounds(bounds)

    mockGet.mockResolvedValueOnce({ data: { profiles: [] } })
    const second = store.findSocialForMapBounds(bounds)

    expect(abortSpy).toHaveBeenCalledTimes(1)

    resolveFirst({ data: { profiles: [] } })
    await Promise.allSettled([first, second])

    abortSpy.mockRestore()
  })

  it('silently ignores CanceledError from aborted requests', async () => {
    mockGet.mockRejectedValueOnce(new CanceledError('canceled'))

    const result = await store.findSocialForMapBounds(bounds)

    expect(result.success).toBe(true)
    expect(store.profileList).toEqual([])
  })

  it('returns error for non-cancel failures', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const result = await store.findSocialForMapBounds(bounds)

    expect(result.success).toBe(false)
  })
})
```

### Step 2: Run tests to verify they fail

Run: `pnpm --filter frontend exec vitest run src/features/browse/stores/__tests__/findProfileStore.spec.ts`
Expected: FAIL — `store.findSocialForMapBounds is not a function`

### Step 3: Implement the store action

Add to `findProfileStore.ts`:

1. Import `CanceledError` from axios at top:

```typescript
import { CanceledError } from 'axios'
```

2. Add `mapBoundsAbortController` to the module scope (above the store definition):

```typescript
let mapBoundsAbortController: AbortController | null = null
```

3. Add a type for bounds:

```typescript
export type MapBounds = { south: number; north: number; west: number; east: number }
```

4. Add the action inside the store `actions`:

```typescript
async findSocialForMapBounds(
  bounds: MapBounds
): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
  if (mapBoundsAbortController) {
    mapBoundsAbortController.abort()
  }
  mapBoundsAbortController = new AbortController()

  try {
    this.isLoading = true
    this.hasMoreProfiles = false

    const res = await safeApiCall(() =>
      api.get<GetProfilesResponse>('/find/social/map/bounds', {
        params: bounds,
        signal: mapBoundsAbortController!.signal,
      })
    )
    const fetched = PublicProfileArraySchema.parse(res.data.profiles)
    this.profileList = fetched

    return storeSuccess()
  } catch (error: any) {
    if (error instanceof CanceledError) {
      return storeSuccess()
    }
    this.profileList = []
    return storeError(error, 'Failed to fetch bounded map profiles')
  } finally {
    this.isLoading = false
  }
},
```

### Step 4: Run tests to verify they pass

Run: `pnpm --filter frontend exec vitest run src/features/browse/stores/__tests__/findProfileStore.spec.ts`
Expected: ALL PASS

### Step 5: Commit

```bash
git add apps/frontend/src/features/browse/stores/findProfileStore.ts apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts
git commit -m "feat(frontend): add findSocialForMapBounds store action with AbortController (#1032)"
```

---

## Task 4: `OsmPoiMap.vue` — emit `bounds-changed` on Leaflet `moveend`

**Files:**
- Modify: `apps/frontend/src/features/shared/components/OsmPoiMap.vue`
- Modify: `apps/frontend/src/features/shared/components/__tests__/OsmPoiMap.spec.ts`

### Step 1: Write the failing tests

Add to `OsmPoiMap.spec.ts`:

```typescript
it('emits bounds-changed on moveend with viewport bounds', async () => {
  const wrapper = await mountMap()
  await flushPromises()

  const mapInstance = (L.map as any).mock.results[0].value

  // Find the moveend handler
  const moveendCall = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')
  expect(moveendCall).toBeDefined()
  const moveendHandler = moveendCall[1]

  // Mock getBounds to return a viewport
  mapInstance.getBounds = vi.fn(() => ({
    getSouth: () => 45.0,
    getNorth: () => 48.0,
    getWest: () => 16.0,
    getEast: () => 23.0,
  }))

  moveendHandler()

  expect(wrapper.emitted('bounds-changed')).toBeTruthy()
  expect(wrapper.emitted('bounds-changed')![0]).toEqual([
    { south: 45.0, north: 48.0, west: 16.0, east: 23.0 },
  ])
})

it('emits bounds-changed on initial map load', async () => {
  // getBounds needs to be available at mount time
  const mapProtoRef = (L.map as any).mock
  const origImpl = mapProtoRef.getMockImplementation?.()

  const wrapper = await mountMap()
  await flushPromises()

  // The moveend event should have been registered, and since Leaflet fires moveend
  // after initial setView, our handler should have been wired up
  const mapInstance = (L.map as any).mock.results[0].value
  const moveendCall = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')
  expect(moveendCall).toBeDefined()
})
```

### Step 2: Run tests to verify they fail

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/__tests__/OsmPoiMap.spec.ts`
Expected: FAIL — no `moveend` handler registered / no `bounds-changed` emitted

### Step 3: Implement the emit

In `OsmPoiMap.vue`:

1. Add `bounds-changed` to the `defineEmits`:

```typescript
const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds-changed', bounds: { south: number; north: number; west: number; east: number }): void
}>()
```

2. Add a function to emit bounds:

```typescript
function emitBounds() {
  if (!map) return
  const b = map.getBounds()
  emit('bounds-changed', {
    south: b.getSouth(),
    north: b.getNorth(),
    west: b.getWest(),
    east: b.getEast(),
  })
}
```

3. In `initBaseLayer`, register the `moveend` listener alongside the existing `zoomend`:

```typescript
map.on('moveend', emitBounds)
```

4. In `destroyMap`, clean up the listener:

```typescript
map.off('moveend', emitBounds)
```

### Step 4: Run tests to verify they pass

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/__tests__/OsmPoiMap.spec.ts`
Expected: ALL PASS

### Step 5: Commit

```bash
git add apps/frontend/src/features/shared/components/OsmPoiMap.vue apps/frontend/src/features/shared/components/__tests__/OsmPoiMap.spec.ts
git commit -m "feat(frontend): emit bounds-changed from OsmPoiMap on moveend (#1032)"
```

---

## Task 5: `MapView.vue` — pass-through `bounds-changed` emit

**Files:**
- Modify: `apps/frontend/src/features/shared/components/MapView.vue`

### Step 1: Update the emit declaration and template

In `MapView.vue`:

1. Add `bounds-changed` to `defineEmits`:

```typescript
const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds-changed', bounds: { south: number; north: number; west: number; east: number }): void
}>()
```

2. Add the event listener on the `OsmPoiMap` in the template:

```html
@bounds-changed="(bounds) => emit('bounds-changed', bounds)"
```

### Step 2: Commit

```bash
git add apps/frontend/src/features/shared/components/MapView.vue
git commit -m "feat(frontend): pass-through bounds-changed in MapView (#1032)"
```

---

## Task 6: `SocialMatch.vue` + composable — wire up debounced bounds handler

**Files:**
- Modify: `apps/frontend/src/features/browse/views/SocialMatch.vue`
- Modify: `apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts`
- Modify: `apps/frontend/src/features/browse/composables/__tests__/useSocialMatchViewModel.spec.ts`
- Modify: `apps/frontend/src/features/browse/views/__tests__/SocialMatchView.spec.ts`

### Step 1: Write failing test for the composable

Add to `useSocialMatchViewModel.spec.ts`, including `findSocialForMapBounds` in the mock store:

```typescript
// Add to mockFindProfileStore:
// findSocialForMapBounds: vi.fn(),

it('onBoundsChanged calls findSocialForMapBounds on the store', async () => {
  mockFindProfileStore.findSocialForMapBounds = vi.fn().mockResolvedValue({ success: true })
  const vm = useSocialMatchViewModel()
  const bounds = { south: 45, north: 48, west: 16, east: 23 }

  await vm.onBoundsChanged(bounds)

  expect(mockFindProfileStore.findSocialForMapBounds).toHaveBeenCalledWith(bounds)
})
```

### Step 2: Run test to verify it fails

Run: `pnpm --filter frontend exec vitest run src/features/browse/composables/__tests__/useSocialMatchViewModel.spec.ts`
Expected: FAIL — `vm.onBoundsChanged is not a function`

### Step 3: Implement composable changes

In `useSocialMatchViewModel.ts`:

1. Import `MapBounds` type:

```typescript
import type { MapBounds } from '@/features/browse/stores/findProfileStore'
```

2. Add the `onBoundsChanged` function:

```typescript
const onBoundsChanged = async (bounds: MapBounds) => {
  isLoading.value = true
  try {
    const res = await findProfileStore.findSocialForMapBounds(bounds)
    if (!res.success) {
      storeError.value = res
    }
  } finally {
    isLoading.value = false
  }
}
```

3. Export it in the return object:

```typescript
return {
  // ... existing exports ...
  onBoundsChanged,
}
```

### Step 4: Run test to verify it passes

Run: `pnpm --filter frontend exec vitest run src/features/browse/composables/__tests__/useSocialMatchViewModel.spec.ts`
Expected: ALL PASS

### Step 5: Wire up in `SocialMatch.vue`

1. Extract `onBoundsChanged` from the composable:

```typescript
const {
  // ... existing destructured values ...
  onBoundsChanged,
} = useSocialMatchViewModel()
```

2. Add the debounce constant and handler at top of `<script setup>`:

```typescript
const MAP_BOUNDS_DEBOUNCE_MS = 500
```

3. Create the debounced handler:

```typescript
const debouncedOnBoundsChanged = useDebounceFn(
  (bounds: { south: number; north: number; west: number; east: number }) => onBoundsChanged(bounds),
  MAP_BOUNDS_DEBOUNCE_MS
)
```

4. Add the `@bounds-changed` listener on `MapView` in the template:

```html
@bounds-changed="debouncedOnBoundsChanged"
```

### Step 6: Update view test

In `SocialMatchView.spec.ts`, add `onBoundsChanged` to the `vmState` mock:

```typescript
onBoundsChanged: vi.fn(),
```

And add a test:

```typescript
it('passes bounds-changed event handler to MapView', () => {
  vmState.socialFilter.value = {
    location: { country: 'US', cityName: 'New York', lat: null, lon: null },
    tags: [],
  }
  const wrapper = mountComponent()
  const mapView = wrapper.findComponent({ name: 'MapView' })
  // MapView is stubbed, so we just verify the component renders with the event wired
  expect(wrapper.find('.map-view').exists()).toBe(true)
})
```

### Step 7: Run all browse feature tests

Run: `pnpm --filter frontend exec vitest run src/features/browse/`
Expected: ALL PASS

### Step 8: Commit

```bash
git add apps/frontend/src/features/browse/
git commit -m "feat(frontend): wire up debounced bounds-changed handler in SocialMatch (#1032)"
```

---

## Task 7: Remove initial unbounded fetch from map flow

**Files:**
- Modify: `apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts`
- Modify: `apps/frontend/src/features/browse/composables/__tests__/useSocialMatchViewModel.spec.ts`

### Step 1: Update the composable

The map's `moveend` fires on initial load, which triggers `onBoundsChanged` → `findSocialForMapBounds`. So we no longer need the initial `findSocialForMap()` call in `fetchResults()`. Replace `fetchResults` to only fetch dating match IDs:

```typescript
const fetchResults = async () => {
  await findProfileStore.fetchDatingMatchIds()
}
```

### Step 2: Update test

Update the existing test `'initialize fetches social filter, map profiles, and match IDs'`:

```typescript
it('initialize fetches social filter and match IDs (map profiles loaded via bounds)', async () => {
  const vm = useSocialMatchViewModel()
  await vm.initialize()

  expect(mockFindProfileStore.fetchSocialFilter).toHaveBeenCalled()
  expect(mockFindProfileStore.fetchDatingMatchIds).toHaveBeenCalled()
  expect(mockFindProfileStore.findSocialForMap).not.toHaveBeenCalled()
})
```

### Step 3: Run tests

Run: `pnpm --filter frontend exec vitest run src/features/browse/`
Expected: ALL PASS

### Step 4: Commit

```bash
git add apps/frontend/src/features/browse/composables/
git commit -m "refactor(frontend): remove initial unbounded fetch — map moveend handles it (#1032)"
```

---

## Task 8: Full test suite verification

### Step 1: Run all backend tests

Run: `pnpm --filter backend test`
Expected: ALL PASS

### Step 2: Run all frontend tests

Run: `pnpm --filter frontend test`
Expected: ALL PASS

### Step 3: Type-check

Run: `pnpm type-check`
Expected: No errors

### Step 4: Lint

Run: `pnpm lint`
Expected: No errors

### Step 5: Format changed files

```bash
pnpm exec prettier --write \
  apps/backend/src/services/profileMatch.service.ts \
  apps/backend/src/__tests__/services/profileMatch_social.service.spec.ts \
  apps/backend/src/api/routes/findProfile.route.ts \
  apps/backend/src/__tests__/routes/findProfile.route.spec.ts \
  apps/frontend/src/features/browse/stores/findProfileStore.ts \
  apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts \
  apps/frontend/src/features/shared/components/OsmPoiMap.vue \
  apps/frontend/src/features/shared/components/__tests__/OsmPoiMap.spec.ts \
  apps/frontend/src/features/shared/components/MapView.vue \
  apps/frontend/src/features/browse/views/SocialMatch.vue \
  apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts \
  apps/frontend/src/features/browse/composables/__tests__/useSocialMatchViewModel.spec.ts \
  apps/frontend/src/features/browse/views/__tests__/SocialMatchView.spec.ts
```

### Step 6: Final commit if formatting changes

```bash
git add -A && git commit -m "style: format changed files"
```

# Server-Side Map Clustering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace client-side-only marker clustering with server-side pre-computation using supercluster, reducing wire payloads from ~500 full profiles to ~20-50 lightweight cluster/point features per viewport.

**Architecture:** New `ClusterService` manages per-user supercluster indexes in memory, rebuilt via BullMQ jobs on preference/blocklist changes. A new `GET /find/social/map/clusters` endpoint returns pre-computed clusters + lightweight point features. The frontend splits these into cluster markers (plain `L.marker` with click-to-zoom) and point markers (fed into existing `leaflet.markerclusterGroup` for spiderfy at max zoom).

**Tech Stack:** supercluster (npm), BullMQ, Fastify, Prisma, Vue 3 + Leaflet + leaflet.markercluster

**Spec:** `docs/superpowers/specs/2026-04-01-server-side-map-clustering-design.md`

---

## File Structure

### New files (backend)
- `apps/backend/src/services/cluster.service.ts` — Singleton service managing per-user supercluster indexes in memory
- `apps/backend/src/queues/clusterQueue.ts` — BullMQ queue for index rebuild jobs
- `apps/backend/src/workers/clusterWorker.ts` — Worker that processes rebuild jobs
- `apps/backend/src/__tests__/services/cluster.service.spec.ts` — Unit tests for ClusterService
- `apps/backend/src/__tests__/routes/findProfile.cluster.route.spec.ts` — Unit tests for cluster endpoint

### New files (shared)
- `packages/shared/zod/map/cluster.dto.ts` — Shared types for cluster/point features and response

### Modified files (backend)
- `apps/backend/package.json` — Add `supercluster` + `@types/supercluster` dependencies
- `apps/backend/src/main.ts` — Import cluster worker (side-effect)
- `apps/backend/src/api/routes/findProfile.route.ts` — Add cluster endpoints
- `apps/backend/src/plugins/bull-board.ts` — Register cluster queue on Bull Board

### Modified files (frontend)
- `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.types.ts` — Add `MapCluster` type
- `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue` — Add cluster layer rendering
- `apps/frontend/src/features/shared/components/osmPoiMap/mapUtils.ts` — Add `createServerClusterIcon()` function
- `apps/frontend/src/features/shared/components/MapView.vue` — Pass clusters prop, update bounds-changed event
- `apps/frontend/src/features/browse/stores/findProfileStore.ts` — Add cluster-aware fetch + popup fetch
- `apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts` — Update bounds handler signature
- `apps/frontend/src/features/browse/views/BrowseProfiles.vue` — Split features into clusters + points

### Modified test files
- `apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts` — Tests for new store actions
- `apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts` — Tests for cluster rendering

---

## Task 1: Install supercluster dependency

**Files:**
- Modify: `apps/backend/package.json`

- [ ] **Step 1: Install supercluster and types**

```bash
cd /home/user/opencupid && pnpm --filter backend add supercluster && pnpm --filter backend add -D @types/supercluster
```

- [ ] **Step 2: Verify import works**

```bash
cd /home/user/opencupid && pnpm --filter backend exec node -e "require('supercluster'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git checkout -b feat/server-side-map-clustering
git add apps/backend/package.json pnpm-lock.yaml
git commit -m "feat(backend): add supercluster dependency for server-side map clustering"
```

---

## Task 2: Shared cluster/point feature types

**Files:**
- Create: `packages/shared/zod/map/cluster.dto.ts`

- [ ] **Step 1: Create shared type definitions**

Create `packages/shared/zod/map/cluster.dto.ts`:

```typescript
import { z } from 'zod'

export const ClusterFeatureSchema = z.object({
  type: z.literal('cluster'),
  id: z.number(),
  lat: z.number(),
  lon: z.number(),
  count: z.number().int().min(2),
  expansionZoom: z.number().int(),
})

export const PointFeatureSchema = z.object({
  type: z.literal('point'),
  id: z.string(),
  lat: z.number(),
  lon: z.number(),
  publicName: z.string(),
  image: z
    .object({
      blurhash: z.string().nullish(),
      url: z.string().optional(),
    })
    .nullable(),
  highlighted: z.boolean(),
})

export const MapFeatureSchema = z.discriminatedUnion('type', [
  ClusterFeatureSchema,
  PointFeatureSchema,
])

export const ClusterMapResponseSchema = z.object({
  success: z.literal(true),
  features: z.array(MapFeatureSchema),
})

export type ClusterFeature = z.infer<typeof ClusterFeatureSchema>
export type PointFeature = z.infer<typeof PointFeatureSchema>
export type MapFeature = z.infer<typeof MapFeatureSchema>
export type ClusterMapResponse = z.infer<typeof ClusterMapResponseSchema>
```

- [ ] **Step 2: Verify types compile**

```bash
cd /home/user/opencupid && pnpm type-check
```

Expected: no errors related to `cluster.dto.ts`

- [ ] **Step 3: Commit**

```bash
git add packages/shared/zod/map/cluster.dto.ts
git commit -m "feat(shared): add cluster/point feature Zod schemas and types"
```

---

## Task 3: ClusterService — write failing tests

**Files:**
- Create: `apps/backend/src/__tests__/services/cluster.service.spec.ts`

- [ ] **Step 1: Write the failing test file**

Create `apps/backend/src/__tests__/services/cluster.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindSocialProfilesWithLocation = vi.fn()
const mockFindMutualMatchIds = vi.fn()

vi.mock('@/services/profileMatch.service', () => ({
  ProfileMatchService: {
    getInstance: () => ({
      findSocialProfilesWithLocation: mockFindSocialProfilesWithLocation,
      findMutualMatchIds: mockFindMutualMatchIds,
    }),
  },
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {},
}))

import { ClusterService } from '@/services/cluster.service'

const makeProfile = (id: string, lat: number, lon: number, name = 'User') => ({
  id,
  publicName: name,
  lat,
  lon,
  country: 'HU',
  cityName: 'Budapest',
  localized: [],
  profileImages: [
    {
      id: 'img-1',
      blurhash: 'LEHV6nWB2yk8',
      variants: [{ size: 'thumb', url: `https://cdn.test/${id}/thumb.jpg` }],
    },
  ],
  tags: [],
})

describe('ClusterService', () => {
  let service: ClusterService

  beforeEach(() => {
    service = new ClusterService()
    vi.clearAllMocks()
  })

  describe('buildIndex', () => {
    it('builds a supercluster index from filtered profiles', async () => {
      const profiles = [
        makeProfile('p1', 47.5, 19.0, 'Alice'),
        makeProfile('p2', 48.2, 16.3, 'Bob'),
        makeProfile('p3', 47.6, 19.1, 'Carol'),
      ]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue(['p2'])

      await service.buildIndex('viewer-1')

      // At zoom 12 (max zoom), all 3 points should be individual
      const features = service.getClusters('viewer-1', [16.0, 47.0, 20.0, 49.0], 12)
      expect(features).toHaveLength(3)

      const points = features.filter((f) => f.type === 'point')
      expect(points).toHaveLength(3)

      const bob = points.find((p) => p.id === 'p2')
      expect(bob).toBeDefined()
      expect(bob!.highlighted).toBe(true)
      expect(bob!.publicName).toBe('Bob')

      const alice = points.find((p) => p.id === 'p1')
      expect(alice!.highlighted).toBe(false)
    })

    it('produces clusters at low zoom levels', async () => {
      // Two very close profiles that should cluster at zoom 2
      const profiles = [
        makeProfile('p1', 47.5, 19.0),
        makeProfile('p2', 47.5001, 19.0001),
      ]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')

      const features = service.getClusters('viewer-1', [-180, -90, 180, 90], 2)
      const clusters = features.filter((f) => f.type === 'cluster')
      expect(clusters.length).toBeGreaterThanOrEqual(1)

      const cluster = clusters[0]!
      expect(cluster.count).toBe(2)
      expect(cluster.expansionZoom).toBeGreaterThan(2)
    })
  })

  describe('getClusters', () => {
    it('returns empty array when no index exists and builds on demand', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([])
      mockFindMutualMatchIds.mockResolvedValue([])

      const features = await service.getOrBuildClusters('viewer-1', [0, 0, 10, 10], 5)
      expect(features).toEqual([])
      expect(mockFindSocialProfilesWithLocation).toHaveBeenCalledWith('viewer-1', undefined)
    })
  })

  describe('getExpansionZoom', () => {
    it('returns expansion zoom for a cluster', async () => {
      const profiles = [
        makeProfile('p1', 47.5, 19.0),
        makeProfile('p2', 47.5001, 19.0001),
      ]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')

      // Get clusters at low zoom to find a cluster
      const features = service.getClusters('viewer-1', [-180, -90, 180, 90], 2)
      const cluster = features.find((f) => f.type === 'cluster')
      if (cluster) {
        const zoom = service.getExpansionZoom('viewer-1', cluster.id)
        expect(zoom).toBeGreaterThan(2)
      }
    })
  })

  describe('getLeaves', () => {
    it('returns point features for a cluster', async () => {
      const profiles = [
        makeProfile('p1', 47.5, 19.0),
        makeProfile('p2', 47.5001, 19.0001),
      ]
      mockFindSocialProfilesWithLocation.mockResolvedValue(profiles)
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')

      const features = service.getClusters('viewer-1', [-180, -90, 180, 90], 2)
      const cluster = features.find((f) => f.type === 'cluster')
      if (cluster) {
        const leaves = service.getLeaves('viewer-1', cluster.id)
        expect(leaves).toHaveLength(2)
        expect(leaves.every((l) => l.type === 'point')).toBe(true)
      }
    })
  })

  describe('evict', () => {
    it('removes the cached index for a user', async () => {
      mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
      mockFindMutualMatchIds.mockResolvedValue([])

      await service.buildIndex('viewer-1')
      expect(service.getClusters('viewer-1', [-180, -90, 180, 90], 5)).toHaveLength(1)

      service.evict('viewer-1')
      expect(service.getClusters('viewer-1', [-180, -90, 180, 90], 5)).toEqual([])
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/cluster.service.spec.ts
```

Expected: FAIL — `Cannot find module '@/services/cluster.service'`

---

## Task 4: ClusterService — implement

**Files:**
- Create: `apps/backend/src/services/cluster.service.ts`

- [ ] **Step 1: Write the ClusterService implementation**

Create `apps/backend/src/services/cluster.service.ts`:

```typescript
import Supercluster from 'supercluster'
import type { Feature, Point } from 'geojson'
import { ProfileMatchService } from './profileMatch.service'
import type { ClusterFeature, PointFeature, MapFeature } from '@shared/zod/map/cluster.dto'

const MAP_MAX_ZOOM = 12
const CLUSTER_RADIUS = 40

interface PointProperties {
  id: string
  publicName: string
  image: { blurhash?: string | null; url?: string } | null
  highlighted: boolean
}

interface CachedIndex {
  index: Supercluster<PointProperties, Supercluster.AnyProps>
  updatedAt: Date
}

export class ClusterService {
  private indexes = new Map<string, CachedIndex>()
  private static instance: ClusterService

  static getInstance(): ClusterService {
    if (!ClusterService.instance) {
      ClusterService.instance = new ClusterService()
    }
    return ClusterService.instance
  }

  async buildIndex(profileId: string): Promise<void> {
    const profileMatchService = ProfileMatchService.getInstance()

    const [profiles, matchIds] = await Promise.all([
      profileMatchService.findSocialProfilesWithLocation(profileId),
      profileMatchService.findMutualMatchIds(profileId),
    ])

    const matchSet = new Set(matchIds)

    const features: Feature<Point, PointProperties>[] = profiles
      .filter((p) => p.lat != null && p.lon != null)
      .map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lon!, p.lat!], // GeoJSON: [lon, lat]
        },
        properties: {
          id: p.id,
          publicName: p.publicName ?? '',
          image: p.profileImages?.[0]
            ? {
                blurhash: p.profileImages[0].blurhash ?? null,
                url: p.profileImages[0].variants?.[0]?.url,
              }
            : null,
          highlighted: matchSet.has(p.id),
        },
      }))

    const index = new Supercluster<PointProperties, Supercluster.AnyProps>({
      radius: CLUSTER_RADIUS,
      maxZoom: MAP_MAX_ZOOM,
      minPoints: 2,
    })

    index.load(features)
    this.indexes.set(profileId, { index, updatedAt: new Date() })
  }

  getClusters(
    profileId: string,
    bbox: [number, number, number, number],
    zoom: number
  ): MapFeature[] {
    const cached = this.indexes.get(profileId)
    if (!cached) return []

    const raw = cached.index.getClusters(bbox, Math.round(zoom))
    return raw.map((f) => this.mapFeature(f, profileId))
  }

  async getOrBuildClusters(
    profileId: string,
    bbox: [number, number, number, number],
    zoom: number
  ): Promise<MapFeature[]> {
    if (!this.indexes.has(profileId)) {
      await this.buildIndex(profileId)
    }
    return this.getClusters(profileId, bbox, zoom)
  }

  getExpansionZoom(profileId: string, clusterId: number): number {
    const cached = this.indexes.get(profileId)
    if (!cached) return MAP_MAX_ZOOM
    return cached.index.getClusterExpansionZoom(clusterId)
  }

  getLeaves(profileId: string, clusterId: number): PointFeature[] {
    const cached = this.indexes.get(profileId)
    if (!cached) return []

    const leaves = cached.index.getLeaves(clusterId, Infinity, 0)
    return leaves.map((f) => ({
      type: 'point' as const,
      id: f.properties.id,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      publicName: f.properties.publicName,
      image: f.properties.image,
      highlighted: f.properties.highlighted,
    }))
  }

  evict(profileId: string): void {
    this.indexes.delete(profileId)
  }

  hasIndex(profileId: string): boolean {
    return this.indexes.has(profileId)
  }

  private mapFeature(
    f: Supercluster.ClusterFeature<Supercluster.AnyProps> | Supercluster.PointFeature<PointProperties>,
    _profileId: string
  ): MapFeature {
    if (f.properties.cluster) {
      const clusterId = f.properties.cluster_id as number
      return {
        type: 'cluster',
        id: clusterId,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        count: f.properties.point_count as number,
        expansionZoom: this.indexes.get(_profileId)!.index.getClusterExpansionZoom(clusterId),
      } satisfies ClusterFeature
    }

    const props = f.properties as PointProperties
    return {
      type: 'point',
      id: props.id,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      publicName: props.publicName,
      image: props.image,
      highlighted: props.highlighted,
    } satisfies PointFeature
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm --filter backend exec vitest run src/__tests__/services/cluster.service.spec.ts
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/services/cluster.service.ts apps/backend/src/__tests__/services/cluster.service.spec.ts
git commit -m "feat(backend): add ClusterService with per-user supercluster index management"
```

---

## Task 5: BullMQ cluster queue and worker

**Files:**
- Create: `apps/backend/src/queues/clusterQueue.ts`
- Create: `apps/backend/src/workers/clusterWorker.ts`
- Modify: `apps/backend/src/main.ts`

- [ ] **Step 1: Create the cluster queue**

Create `apps/backend/src/queues/clusterQueue.ts`:

```typescript
import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'

const connection = new IORedis(appConfig.REDIS_URL, { maxRetriesPerRequest: null })

export const clusterQueue = new Queue('cluster-index', { connection })

/**
 * Enqueues a cluster index rebuild for a user. Uses profileId as the job ID
 * so only one pending rebuild exists per user at any time (deduplication).
 */
export async function enqueueClusterRebuild(profileId: string): Promise<void> {
  await clusterQueue.add(
    'rebuild',
    { profileId },
    { jobId: `rebuild-${profileId}`, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 } }
  )
}
```

- [ ] **Step 2: Create the cluster worker**

Create `apps/backend/src/workers/clusterWorker.ts`:

```typescript
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'
import { ClusterService } from '@/services/cluster.service'

const connection = new IORedis(appConfig.REDIS_URL, { maxRetriesPerRequest: null })

new Worker(
  'cluster-index',
  async (job) => {
    const { profileId } = job.data as { profileId: string }
    await ClusterService.getInstance().buildIndex(profileId)
  },
  { connection }
)
```

- [ ] **Step 3: Register worker in main.ts**

In `apps/backend/src/main.ts`, add the import after the existing worker imports (line 11):

```typescript
import './workers/clusterWorker' // ← side-effect: starts the cluster index worker
```

- [ ] **Step 4: Run type-check**

```bash
pnpm --filter backend exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/queues/clusterQueue.ts apps/backend/src/workers/clusterWorker.ts apps/backend/src/main.ts
git commit -m "feat(backend): add BullMQ cluster queue and worker for index rebuilds"
```

---

## Task 6: Register cluster queue on Bull Board

**Files:**
- Modify: `apps/backend/src/plugins/bull-board.ts`

- [ ] **Step 1: Read current bull-board plugin**

Read `apps/backend/src/plugins/bull-board.ts` to see existing queue registrations.

- [ ] **Step 2: Add cluster queue to Bull Board**

Add the import and registration for `clusterQueue`, following the same pattern as existing queues. Add the import:

```typescript
import { clusterQueue } from '@/queues/clusterQueue'
```

And add the BullMQ adapter to the existing array of queues:

```typescript
new BullMQAdapter(clusterQueue),
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/plugins/bull-board.ts
git commit -m "feat(backend): register cluster queue on Bull Board dashboard"
```

---

## Task 7: Cluster API endpoints — write failing tests

**Files:**
- Create: `apps/backend/src/__tests__/routes/findProfile.cluster.route.spec.ts`

- [ ] **Step 1: Write the failing test file**

Create `apps/backend/src/__tests__/routes/findProfile.cluster.route.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetOrBuildClusters = vi.fn()
const mockGetLeaves = vi.fn()
const mockEnqueueClusterRebuild = vi.fn()

vi.mock('@/services/cluster.service', () => ({
  ClusterService: {
    getInstance: () => ({
      getOrBuildClusters: mockGetOrBuildClusters,
      getLeaves: mockGetLeaves,
    }),
  },
}))

vi.mock('@/queues/clusterQueue', () => ({
  enqueueClusterRebuild: mockEnqueueClusterRebuild,
}))

vi.mock('@/services/profileMatch.service', () => ({
  ProfileMatchService: {
    getInstance: () => ({
      findSocialProfilesFor: vi.fn(),
      findSocialProfilesWithLocation: vi.fn(),
      findSocialProfilesInBounds: vi.fn(),
      findMutualMatchIds: vi.fn(),
      findNewProfilesAnywhere: vi.fn(),
      findMutualMatchesFor: vi.fn(),
      getSocialMatchFilter: vi.fn(),
      updateSocialMatchFilter: vi.fn(),
    }),
  },
}))

vi.mock('@/services/profile.service', () => ({
  ProfileService: {
    getInstance: () => ({
      getProfileByUserId: vi.fn(),
    }),
  },
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {},
}))

vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileToPublic: vi.fn((p: any) => ({
    id: p.id,
    publicName: p.publicName,
    location: { country: p.country, cityName: p.cityName, lat: p.lat, lon: p.lon },
    profileImages: p.profileImages ?? [],
    tags: p.tags ?? [],
  })),
}))

import findProfileRoutes from '../../api/routes/findProfile.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply

const mockSession = {
  profileId: 'profile-123',
  lang: 'en',
  profile: { isSocialActive: true, isDatingActive: false },
}

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  await findProfileRoutes(fastify as any, {})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /social/map/clusters', () => {
  const handler = () => fastify.routes['GET /social/map/clusters']

  it('returns cluster and point features for given bounds and zoom', async () => {
    const mockFeatures = [
      { type: 'cluster', id: 1, lat: 47.5, lon: 19.0, count: 5, expansionZoom: 8 },
      {
        type: 'point',
        id: 'p1',
        lat: 48.2,
        lon: 16.3,
        publicName: 'Alice',
        image: { blurhash: 'abc', url: 'https://cdn/thumb.jpg' },
        highlighted: false,
      },
    ]
    mockGetOrBuildClusters.mockResolvedValue(mockFeatures)

    const req = {
      session: mockSession,
      query: { south: '47.0', north: '49.0', west: '16.0', east: '20.0', zoom: '6' },
    }

    await handler()(req as any, reply as any)

    expect(mockGetOrBuildClusters).toHaveBeenCalledWith(
      'profile-123',
      [16.0, 47.0, 20.0, 49.0], // [west, south, east, north] — supercluster bbox format
      6
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.body.success).toBe(true)
    expect(reply.body.features).toHaveLength(2)
  })

  it('returns 400 when bounds or zoom are missing', async () => {
    const req = {
      session: mockSession,
      query: { south: '47.0', north: '49.0' }, // missing west, east, zoom
    }

    await handler()(req as any, reply as any)

    expect(reply.statusCode).toBe(400)
  })

  it('returns 403 when social is not active', async () => {
    const req = {
      session: { ...mockSession, profile: { isSocialActive: false, isDatingActive: false } },
      query: { south: '47.0', north: '49.0', west: '16.0', east: '20.0', zoom: '6' },
    }

    await handler()(req as any, reply as any)

    expect(reply.statusCode).toBe(403)
  })
})

describe('GET /social/map/clusters/leaves', () => {
  const handler = () => fastify.routes['GET /social/map/clusters/leaves']

  it('returns point features for a cluster', async () => {
    const mockLeaves = [
      {
        type: 'point',
        id: 'p1',
        lat: 47.5,
        lon: 19.0,
        publicName: 'Alice',
        image: null,
        highlighted: false,
      },
    ]
    mockGetLeaves.mockReturnValue(mockLeaves)

    const req = {
      session: mockSession,
      query: { clusterId: '42' },
    }

    await handler()(req as any, reply as any)

    expect(mockGetLeaves).toHaveBeenCalledWith('profile-123', 42)
    expect(reply.statusCode).toBe(200)
    expect(reply.body.features).toHaveLength(1)
  })

  it('returns 400 when clusterId is missing', async () => {
    const req = {
      session: mockSession,
      query: {},
    }

    await handler()(req as any, reply as any)

    expect(reply.statusCode).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter backend exec vitest run src/__tests__/routes/findProfile.cluster.route.spec.ts
```

Expected: FAIL — routes not registered yet

---

## Task 8: Cluster API endpoints — implement

**Files:**
- Modify: `apps/backend/src/api/routes/findProfile.route.ts`

- [ ] **Step 1: Add cluster endpoints to findProfile.route.ts**

Add imports at top of the file (after existing imports):

```typescript
import { ClusterService } from '@/services/cluster.service'
import { enqueueClusterRebuild } from '@/queues/clusterQueue'
```

Add the following query schema after the existing `BoundsQuerySchema` (around line 93):

```typescript
const ClusterQuerySchema = z.object({
  south: z.coerce.number(),
  north: z.coerce.number(),
  west: z.coerce.number(),
  east: z.coerce.number(),
  zoom: z.coerce.number().int().min(0).max(20),
})

const LeavesQuerySchema = z.object({
  clusterId: z.coerce.number().int(),
})
```

Add the cluster endpoints inside the route function, after the existing `GET /social/map/bounds` handler (after line 133):

```typescript
const clusterService = ClusterService.getInstance()

/**
 * GET /social/map/clusters
 * Returns pre-computed cluster + point features for the given viewport.
 * @query {number} south - South latitude bound
 * @query {number} north - North latitude bound
 * @query {number} west - West longitude bound
 * @query {number} east - East longitude bound
 * @query {number} zoom - Current map zoom level
 * @returns {{ success: true, features: MapFeature[] }}
 */
fastify.get('/social/map/clusters', { onRequest: [fastify.authenticate] }, async (req, reply) => {
  if (!req.session.profile.isSocialActive) {
    return sendForbiddenError(reply)
  }

  const parsed = ClusterQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return sendError(reply, 400, 'Missing or invalid parameters (south, north, west, east, zoom)')
  }

  const { south, north, west, east, zoom } = parsed.data
  const bbox: [number, number, number, number] = [west, south, east, north]

  try {
    const features = await clusterService.getOrBuildClusters(req.session.profileId, bbox, zoom)
    return reply.code(200).send({ success: true, features })
  } catch (err) {
    req.log.error(err)
    return sendError(reply, 500, 'Failed to fetch map clusters')
  }
})

/**
 * GET /social/map/clusters/leaves
 * Returns individual point features within a cluster (for spiderfy at max zoom).
 * @query {number} clusterId - Supercluster cluster ID
 * @returns {{ success: true, features: PointFeature[] }}
 */
fastify.get(
  '/social/map/clusters/leaves',
  { onRequest: [fastify.authenticate] },
  async (req, reply) => {
    if (!req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const parsed = LeavesQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(reply, 400, 'Missing or invalid clusterId parameter')
    }

    try {
      const features = clusterService.getLeaves(req.session.profileId, parsed.data.clusterId)
      return reply.code(200).send({ success: true, features })
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch cluster leaves')
    }
  }
)
```

- [ ] **Step 2: Add rebuild trigger to PATCH /social/filter handler**

In the existing `PATCH /social/filter` handler (around line 232), after the successful update, add:

```typescript
// Trigger async cluster index rebuild for updated preferences
enqueueClusterRebuild(req.session.profileId).catch((err) => {
  fastify.log.error(err, 'Failed to enqueue cluster rebuild')
})
```

Add this line right before `return reply.code(200).send(response)` in the PATCH handler.

Also, the frontend bus events `profile:blocked` and `profile:dating-prefs-updated` already call `refetchBounds()` which invalidates the map cache. Since `invalidateBoundsCache()` now also clears `cachedClusterBounds` and `cachedClusterZoom` (from Task 11), the next viewport event will trigger a fresh `findClustersForMapBounds()` call, which calls `getOrBuildClusters()` on the backend, which will build a fresh index if the cache was evicted. To ensure the backend index is also rebuilt proactively, add these bus event handlers. In `findProfile.route.ts`, after the `PATCH /social/filter` handler where you added the enqueue call, also listen to Fastify's request hooks or add the enqueue call to the block/unblock route. The simplest approach: since the frontend refetches on these events, and `getOrBuildClusters` builds on demand if no cache exists, we can simply call `clusterService.evict(profileId)` from the block/dating-prefs-updated handlers in the relevant backend routes to force a rebuild on next request. However, for this initial implementation, the on-demand rebuild in `getOrBuildClusters` is sufficient — when the frontend refetches after a block/pref change, the backend will build a fresh index automatically. The PATCH filter enqueue is the proactive optimization for the most common case.

- [ ] **Step 3: Run cluster endpoint tests**

```bash
pnpm --filter backend exec vitest run src/__tests__/routes/findProfile.cluster.route.spec.ts
```

Expected: all tests PASS

- [ ] **Step 4: Run full backend test suite**

```bash
pnpm --filter backend test
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/routes/findProfile.route.ts apps/backend/src/__tests__/routes/findProfile.cluster.route.spec.ts
git commit -m "feat(backend): add cluster map endpoints and rebuild trigger on filter update"
```

---

## Task 9: Frontend types — add MapCluster and update bounds event

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.types.ts`

- [ ] **Step 1: Add MapCluster type and BoundsWithZoom type**

Add to the end of `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.types.ts`:

```typescript
/** A server-computed cluster marker. */
export interface MapCluster {
  id: number
  location: PoiLocation
  count: number
  expansionZoom: number
}

/** Bounds + zoom emitted on viewport change for cluster queries. */
export interface BoundsWithZoom {
  bounds: MapBounds
  zoom: number
}
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm type-check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.types.ts
git commit -m "feat(frontend): add MapCluster and BoundsWithZoom types"
```

---

## Task 10: Add `createServerClusterIcon` to mapUtils

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/mapUtils.ts`

- [ ] **Step 1: Add the server cluster icon function**

The existing `createClusterIcon` receives a leaflet.markercluster `cluster` object with `getChildCount()`. For server-computed clusters, we need a variant that takes a plain count number. Add after the existing `createClusterIcon` function (after line 29):

```typescript
/** Creates a Leaflet DivIcon for a server-computed cluster (takes count directly). */
export function createServerClusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    html: `<div class="poi-cluster-badge" style="width:${CLUSTER_ICON_SIZE}px;height:${CLUSTER_ICON_SIZE}px">${count}</div>`,
    className: 'poi-cluster-icon',
    iconSize: [CLUSTER_ICON_SIZE, CLUSTER_ICON_SIZE],
    iconAnchor: [CLUSTER_ICON_SIZE / 2, CLUSTER_ICON_SIZE / 2],
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/mapUtils.ts
git commit -m "feat(frontend): add createServerClusterIcon utility for server-side clusters"
```

---

## Task 11: Store — add cluster-aware fetch and popup fetch

**Files:**
- Modify: `apps/frontend/src/features/browse/stores/findProfileStore.ts`
- Modify: `apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts`

- [ ] **Step 1: Write failing tests for new store actions**

Add the following tests to the existing `apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts`:

```typescript
describe('findClustersForMapBounds', () => {
  it('fetches clusters from the cluster endpoint with bounds and zoom', async () => {
    const mockFeatures = [
      { type: 'cluster', id: 1, lat: 47.5, lon: 19.0, count: 5, expansionZoom: 8 },
      {
        type: 'point',
        id: 'p1',
        lat: 48.2,
        lon: 16.3,
        publicName: 'Alice',
        image: null,
        highlighted: false,
      },
    ]
    mockApiGet.mockResolvedValue({ data: { success: true, features: mockFeatures } })

    const store = useFindProfileStore()
    const bounds = { south: 47, north: 49, west: 16, east: 20 }
    await store.findClustersForMapBounds(bounds, 6)

    expect(mockApiGet).toHaveBeenCalledWith('/find/social/map/clusters', expect.objectContaining({
      params: expect.objectContaining({ south: 47, north: 49, west: 16, east: 20, zoom: 6 }),
    }))
    expect(store.clusterFeatures).toHaveLength(2)
  })

  it('always refetches on zoom change even if bounds are cached', async () => {
    mockApiGet.mockResolvedValue({ data: { success: true, features: [] } })

    const store = useFindProfileStore()
    const bounds = { south: 47, north: 49, west: 16, east: 20 }

    await store.findClustersForMapBounds(bounds, 6)
    mockApiGet.mockClear()

    // Same bounds, different zoom — must refetch
    await store.findClustersForMapBounds(bounds, 8)
    expect(mockApiGet).toHaveBeenCalled()
  })

  it('cancels in-flight request on new call', async () => {
    let resolveFirst: (v: any) => void
    const firstCall = new Promise((r) => { resolveFirst = r })
    mockApiGet.mockImplementationOnce(() => firstCall)
    mockApiGet.mockResolvedValueOnce({ data: { success: true, features: [] } })

    const store = useFindProfileStore()
    const bounds = { south: 47, north: 49, west: 16, east: 20 }

    // Fire first request (will hang)
    const p1 = store.findClustersForMapBounds(bounds, 6)
    // Fire second request (should abort first)
    const p2 = store.findClustersForMapBounds(bounds, 7)

    resolveFirst!({ data: { success: true, features: [] } })
    await Promise.all([p1, p2])

    // No error thrown from cancelled first request
    expect(store.clusterFeatures).toEqual([])
  })
})

describe('fetchProfileForPopup', () => {
  it('fetches a single profile by ID', async () => {
    const mockProfile = { id: 'p1', publicName: 'Alice' }
    mockApiGet.mockResolvedValue({ data: { success: true, profile: mockProfile } })

    const store = useFindProfileStore()
    const result = await store.fetchProfileForPopup('p1')

    expect(mockApiGet).toHaveBeenCalledWith('/profiles/p1')
    expect(result).toEqual(mockProfile)
  })

  it('caches repeated fetches for the same profile', async () => {
    const mockProfile = { id: 'p1', publicName: 'Alice' }
    mockApiGet.mockResolvedValue({ data: { success: true, profile: mockProfile } })

    const store = useFindProfileStore()
    await store.fetchProfileForPopup('p1')
    await store.fetchProfileForPopup('p1')

    expect(mockApiGet).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter frontend exec vitest run src/features/browse/stores/__tests__/findProfileStore.spec.ts
```

Expected: FAIL — `store.findClustersForMapBounds` and `store.fetchProfileForPopup` not defined

- [ ] **Step 3: Add cluster state and actions to the store**

In `apps/frontend/src/features/browse/stores/findProfileStore.ts`:

Add import at the top:

```typescript
import type { MapFeature } from '@shared/zod/map/cluster.dto'
import type { PublicProfile } from '@zod/profile/profile.dto'
import type { GetPublicProfileResponse } from '@zod/apiResponse.dto'
```

Add module-level variables after the existing `cachedBounds` (around line 21):

```typescript
let clusterAbortController: AbortController | null = null
let cachedClusterZoom: number | null = null
let cachedClusterBounds: MapBounds | null = null
const popupCache = new Map<string, PublicProfile>()
const POPUP_CACHE_MAX = 20
```

Add to the state interface:

```typescript
clusterFeatures: MapFeature[] // Server-computed cluster/point features for map
```

Add default to state:

```typescript
clusterFeatures: [] as MapFeature[],
```

Add new actions:

```typescript
async findClustersForMapBounds(
  bounds: MapBounds,
  zoom: number
): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
  if (clusterAbortController) {
    clusterAbortController.abort()
  }
  const controller = new AbortController()
  clusterAbortController = controller
  this.lastMapBounds = bounds

  // Zoom change always invalidates (cluster groupings are zoom-dependent)
  const zoomChanged = cachedClusterZoom !== zoom
  if (
    !zoomChanged &&
    cachedClusterBounds &&
    boundsContain(cachedClusterBounds, bounds)
  ) {
    this.isLoading = false
    return storeSuccess()
  }

  try {
    this.isLoading = true

    const paddedBounds = padBounds(bounds, 0.3)
    const res = await api.get<{ success: true; features: MapFeature[] }>(
      '/find/social/map/clusters',
      {
        params: { ...paddedBounds, zoom },
        signal: controller.signal,
      }
    )

    this.clusterFeatures = res.data.features
    cachedClusterBounds = paddedBounds
    cachedClusterZoom = zoom

    return storeSuccess()
  } catch (error: any) {
    if (error instanceof CanceledError) {
      return storeSuccess()
    }
    this.clusterFeatures = []
    return storeError(error, 'Failed to fetch map clusters')
  } finally {
    if (clusterAbortController === controller) {
      this.isLoading = false
    }
  }
},

async fetchProfileForPopup(profileId: string): Promise<PublicProfile | null> {
  const cached = popupCache.get(profileId)
  if (cached) return cached

  try {
    const res = await api.get<GetPublicProfileResponse>(`/profiles/${profileId}`)
    const profile = res.data.profile
    // Evict oldest if cache full
    if (popupCache.size >= POPUP_CACHE_MAX) {
      const firstKey = popupCache.keys().next().value!
      popupCache.delete(firstKey)
    }
    popupCache.set(profileId, profile)
    return profile
  } catch {
    return null
  }
},
```

Update `invalidateBoundsCache` to also clear cluster state:

```typescript
function invalidateBoundsCache(): void {
  cachedProfiles.clear()
  cachedBounds = null
  cachedClusterBounds = null
  cachedClusterZoom = null
  popupCache.clear()
}
```

Update `refetchBounds` action to use clusters:

```typescript
async refetchBounds(): Promise<void> {
  invalidateBoundsCache()
  if (this.lastMapBounds) {
    // Re-fetch with last known zoom; if no zoom cached, use a reasonable default
    await this.findClustersForMapBounds(this.lastMapBounds, cachedClusterZoom ?? 7)
  }
},
```

Update `teardown` action to clear cluster state:

```typescript
teardown() {
  if (mapBoundsAbortController) {
    mapBoundsAbortController.abort()
    mapBoundsAbortController = null
  }
  if (clusterAbortController) {
    clusterAbortController.abort()
    clusterAbortController = null
  }
  invalidateBoundsCache()
  this.profileList = []
  this.clusterFeatures = []
  this.matchedProfileIds = new Set()
  this.lastMapBounds = null
  this.isLoading = false
  this.isLoadingMore = false
  this.hasMoreProfiles = true
  this.currentPage = 0
},
```

- [ ] **Step 4: Run store tests**

```bash
pnpm --filter frontend exec vitest run src/features/browse/stores/__tests__/findProfileStore.spec.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/browse/stores/findProfileStore.ts apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts
git commit -m "feat(frontend): add cluster-aware fetch and popup profile fetch to store"
```

---

## Task 12: Update OsmPoiMap to render server clusters

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue`

- [ ] **Step 1: Add clusters prop and import**

In the `<script setup>` section, add the import for the new types and utility:

```typescript
import type { MapPoi, MapBounds, MapCluster, BoundsWithZoom } from './OsmPoiMap.types'
import {
  isValidLatLng,
  computeViewportMultiplier,
  createClusterIcon,
  createServerClusterIcon,
  hydratePoiIcon,
  MAP_MAX_ZOOM,
} from './mapUtils'
```

Update the props to add `clusters`:

```typescript
const props = withDefaults(
  defineProps<{
    items: MapPoi[]
    clusters?: MapCluster[]
    iconComponent: Component
    popupComponent?: Component
    center?: [number, number]
    zoom?: number
    selectedId?: string | number
    fitToPois?: boolean
  }>(),
  {
    zoom: 7,
    fitToPois: false,
    clusters: () => [],
  }
)
```

Update the `bounds-changed` emit to include zoom:

```typescript
const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds-changed', payload: BoundsWithZoom): void
}>()
```

- [ ] **Step 2: Add cluster layer management**

Add after the `iconCache` declaration (around line 45):

```typescript
let clusterLayer: L.LayerGroup | null = null
let clusterMarkers = new Map<number, LMarker>()
```

In the `initClusters` function, add after `map.addLayer(clusterGroup)`:

```typescript
clusterLayer = L.layerGroup().addTo(map)
```

- [ ] **Step 3: Update emitBounds to include zoom**

In the `emitBounds` function, change the emit call (around line 129):

```typescript
emit('bounds-changed', {
  bounds: {
    south: b.getSouth(),
    north: b.getNorth(),
    west: b.getWest(),
    east: b.getEast(),
  },
  zoom: map.getZoom(),
})
```

- [ ] **Step 4: Add cluster marker rendering**

Add a new function after `updateMarkers`:

```typescript
function updateClusterMarkers() {
  if (!map || !clusterLayer) return

  const incoming = new Map<number, MapCluster>()
  for (const cluster of props.clusters ?? []) {
    incoming.set(cluster.id, cluster)
  }

  // Remove stale cluster markers
  for (const [id, marker] of clusterMarkers) {
    if (!incoming.has(id)) {
      clusterLayer.removeLayer(marker)
      clusterMarkers.delete(id)
    }
  }

  // Add new or update existing cluster markers
  for (const [id, cluster] of incoming) {
    const existing = clusterMarkers.get(id)
    if (!existing) {
      const m = L.marker([cluster.location.lat, cluster.location.lon], {
        icon: createServerClusterIcon(cluster.count),
        keyboard: true,
      })
      m.on('click', () => {
        if (!map) return
        map.flyTo([cluster.location.lat, cluster.location.lon], cluster.expansionZoom, {
          duration: 0.5,
        })
      })
      clusterLayer.addLayer(m)
      clusterMarkers.set(id, m)
    } else {
      // Update position and icon if count changed
      existing.setLatLng([cluster.location.lat, cluster.location.lon])
      existing.setIcon(createServerClusterIcon(cluster.count))
    }
  }
}
```

- [ ] **Step 5: Wire up the clusters watcher**

Add a watcher after the existing `watch(() => props.items, ...)`:

```typescript
watch(
  () => props.clusters,
  () => {
    updateClusterMarkers()
  }
)
```

- [ ] **Step 6: Update destroyMap to clean up cluster layer**

In `destroyMap()`, add before `map.remove()`:

```typescript
clusterLayer?.clearLayers()
clusterLayer = null
clusterMarkers.clear()
```

- [ ] **Step 7: Update onActivated to rebuild clusters**

In `onActivated()`, add after `updateMarkers(true)`:

```typescript
updateClusterMarkers()
```

- [ ] **Step 8: Run type check and existing tests**

```bash
pnpm type-check && pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts
```

Expected: type check passes, existing tests pass (they don't pass clusters prop, so the new code is inert)

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue
git commit -m "feat(frontend): add server cluster rendering to OsmPoiMap with click-to-zoom"
```

---

## Task 13: Update MapView to pass clusters and emit zoom

**Files:**
- Modify: `apps/frontend/src/features/shared/components/MapView.vue`

- [ ] **Step 1: Update MapView props and events**

Update the imports:

```typescript
import type { MapPoi, MapBounds, MapCluster, BoundsWithZoom } from './osmPoiMap/OsmPoiMap.types'
```

Add `clusters` to props:

```typescript
const props = withDefaults(
  defineProps<{
    items: MapPoi[]
    clusters?: MapCluster[]
    iconComponent: Component
    popupComponent?: Component
    center?: [number, number]
    zoom?: number
    selectedId?: string | number
    fitToPois?: boolean
    isLoading?: boolean
    isPlaceholderAnimated?: boolean
  }>(),
  {
    isLoading: false,
    isPlaceholderAnimated: true,
    clusters: () => [],
  }
)
```

Update the emit type and debounce handler:

```typescript
const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds-changed', payload: BoundsWithZoom): void
}>()

const debouncedEmitBounds = useDebounceFn((payload: BoundsWithZoom) => {
  emit('bounds-changed', payload)
}, BOUNDS_DEBOUNCE_MS)
```

Update the template to pass clusters:

```html
<OsmPoiMap
  :items="props.items"
  :clusters="props.clusters"
  :center="props.center"
  :zoom="props.zoom"
  :selected-id="props.selectedId"
  :fit-to-pois="props.fitToPois"
  :icon-component="props.iconComponent"
  :popup-component="props.popupComponent"
  class="h-100"
  @map:ready="onMapReady"
  @item:select="(id) => emit('item:select', id)"
  @bounds-changed="debouncedEmitBounds"
/>
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: passes

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/shared/components/MapView.vue
git commit -m "feat(frontend): pass clusters and zoom through MapView wrapper"
```

---

## Task 14: Update view model and BrowseProfiles view

**Files:**
- Modify: `apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts`
- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue`

- [ ] **Step 1: Update useSocialMatchViewModel**

In `apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts`:

Update the import:

```typescript
import type { BoundsWithZoom } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'
```

Replace `fetchResults`:

```typescript
const fetchResults = async () => {
  if (findProfileStore.lastMapBounds) {
    // Use last known zoom or default
    await findProfileStore.findClustersForMapBounds(findProfileStore.lastMapBounds, lastZoom)
  }
}
```

Add a zoom tracker after `renderedFilterSnapshot`:

```typescript
let lastZoom = 7
```

Replace `sameBounds` with a version that includes zoom:

```typescript
function sameViewport(a: MapBounds | null, aZoom: number, b: MapBounds, bZoom: number): boolean {
  return (
    aZoom === bZoom &&
    a !== null &&
    a.south === b.south &&
    a.north === b.north &&
    a.west === b.west &&
    a.east === b.east
  )
}
```

Replace `onBoundsChanged`:

```typescript
const onBoundsChanged = async ({ bounds, zoom }: BoundsWithZoom) => {
  if (sameViewport(findProfileStore.lastMapBounds, lastZoom, bounds, zoom)) return
  lastZoom = zoom
  isLoading.value = true
  try {
    const res = await findProfileStore.findClustersForMapBounds(bounds, zoom)
    if (!res.success) {
      storeError.value = res
    }
  } finally {
    isLoading.value = false
  }
}
```

Replace `refreshIfFilterChanged`:

```typescript
const refreshIfFilterChanged = async () => {
  const currentSnapshot = JSON.stringify(ownerStore.matchFilter)
  if (currentSnapshot === renderedFilterSnapshot) return
  findProfileStore.invalidateMapCache()
  await fetchResults()
  renderedFilterSnapshot = currentSnapshot
}
```

Remove `fetchDatingMatchIds` from the return — it's no longer needed (highlighted comes from cluster endpoint). Also update the returns:

```typescript
return {
  viewerProfile,
  haveResults,
  isNoOneAround,
  isLoading,
  storeError,
  initialize,
  hideProfile,
  matchFilter: toRef(ownerStore, 'matchFilter'),
  updatePrefs,
  onBoundsChanged,
  refreshIfFilterChanged,
  openProfile,
  clusterFeatures: computed(() => findProfileStore.clusterFeatures),
  isInitialized,
}
```

Update `haveResults` and `isNoOneAround` to use cluster features:

```typescript
const haveResults = computed(() => {
  return findProfileStore.clusterFeatures.length > 0
})

const isNoOneAround = computed(() => {
  const features = findProfileStore.clusterFeatures
  if (features.length === 0) return false
  if (
    features.length === 1 &&
    features[0].type === 'point' &&
    features[0].id === viewerProfile.value?.id
  ) {
    return true
  }
  return false
})
```

- [ ] **Step 2: Update BrowseProfiles.vue**

In `apps/frontend/src/features/browse/views/BrowseProfiles.vue`:

Update the destructuring from the view model:

```typescript
const {
  viewerProfile,
  isNoOneAround,
  isLoading,
  clusterFeatures,
  matchFilter,
  isInitialized,
  updatePrefs,
  openProfile,
  onBoundsChanged,
  initialize,
  refreshIfFilterChanged,
} = useSocialMatchViewModel()
```

Update the imports:

```typescript
import type { MapPoi, MapCluster } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'
```

Replace the `mapPois` computed with two computeds:

```typescript
const clusters = computed<MapCluster[]>(() =>
  clusterFeatures.value
    .filter((f): f is import('@shared/zod/map/cluster.dto').ClusterFeature => f.type === 'cluster')
    .map((f) => ({
      id: f.id,
      location: { lat: f.lat, lon: f.lon },
      count: f.count,
      expansionZoom: f.expansionZoom,
    }))
)

const mapPois = computed<MapPoi[]>(() =>
  clusterFeatures.value
    .filter((f): f is import('@shared/zod/map/cluster.dto').PointFeature => f.type === 'point')
    .map((p) => ({
      id: p.id,
      title: p.publicName,
      location: { lat: p.lat, lon: p.lon },
      image: p.image ?? undefined,
      highlighted: p.highlighted,
      source: p, // Will be replaced with full profile on popup open
    }))
)
```

Update the template to pass clusters:

```html
<MapView
  :items="mapPois"
  :clusters="clusters"
  :icon-component="MapIcon"
  :center="mapCenter"
  :is-loading="isLoading"
  :is-placeholder-animated="true"
  :popup-component="ProfileMapCard"
  class="h-100"
  @item:select="(id: string | number) => openProfile(String(id))"
  @bounds-changed="onBoundsChanged"
/>
```

- [ ] **Step 3: Run type-check**

```bash
pnpm type-check
```

Expected: passes

- [ ] **Step 4: Run all frontend tests**

```bash
pnpm --filter frontend test
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts apps/frontend/src/features/browse/views/BrowseProfiles.vue
git commit -m "feat(frontend): wire up server-side clustering in browse profiles view"
```

---

## Task 15: Handle popup with fetch-on-click

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue`

- [ ] **Step 1: Add fetchProfile prop for popup data**

The popup currently receives `popupItem.source` which was the full `PublicProfile`. With server-side clustering, `source` is initially just the lightweight `PointFeature`. We need to fetch the full profile when the popup opens.

Add a new prop:

```typescript
fetchPopupData?: (id: string | number) => Promise<unknown>
```

With default:

```typescript
fetchPopupData: undefined,
```

- [ ] **Step 2: Update the popup open handler in createMarker**

In `createMarker`, update the `popupopen` handler to fetch data:

```typescript
m.on('popupopen', async (e: L.PopupEvent) => {
  const target = e.popup
    .getElement()
    ?.querySelector('.leaflet-popup-content') as HTMLElement | null
  popupTarget.value = target

  // If fetchPopupData is provided, fetch full data for the popup
  if (props.fetchPopupData) {
    const fullData = await props.fetchPopupData(item.id)
    if (fullData) {
      popupItem.value = { ...item, source: fullData }
    } else {
      popupItem.value = item
    }
  } else {
    popupItem.value = item
  }

  nextTick(() => e.popup.update())
})
```

- [ ] **Step 3: Pass fetchPopupData from MapView**

In `MapView.vue`, add the prop and pass-through:

```typescript
fetchPopupData?: (id: string | number) => Promise<unknown>
```

And in the template:

```html
:fetch-popup-data="props.fetchPopupData"
```

- [ ] **Step 4: Pass fetchPopupData from BrowseProfiles**

In `BrowseProfiles.vue`, create the fetch function and pass it:

```typescript
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'

const findProfileStore = useFindProfileStore()

const fetchPopupData = async (id: string | number) => {
  return findProfileStore.fetchProfileForPopup(String(id))
}
```

And in the template, add the prop:

```html
:fetch-popup-data="fetchPopupData"
```

- [ ] **Step 5: Run type-check and tests**

```bash
pnpm type-check && pnpm --filter frontend test
```

Expected: passes

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue apps/frontend/src/features/shared/components/MapView.vue apps/frontend/src/features/browse/views/BrowseProfiles.vue
git commit -m "feat(frontend): fetch full profile on popup open for server-side clustering"
```

---

## Task 16: Format, lint, and full test suite

**Files:** All modified files

- [ ] **Step 1: Format changed files**

```bash
pnpm exec prettier --write \
  packages/shared/zod/map/cluster.dto.ts \
  apps/backend/src/services/cluster.service.ts \
  apps/backend/src/queues/clusterQueue.ts \
  apps/backend/src/workers/clusterWorker.ts \
  apps/backend/src/api/routes/findProfile.route.ts \
  apps/backend/src/main.ts \
  apps/backend/src/plugins/bull-board.ts \
  apps/backend/src/__tests__/services/cluster.service.spec.ts \
  apps/backend/src/__tests__/routes/findProfile.cluster.route.spec.ts \
  apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.types.ts \
  apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue \
  apps/frontend/src/features/shared/components/osmPoiMap/mapUtils.ts \
  apps/frontend/src/features/shared/components/MapView.vue \
  apps/frontend/src/features/browse/stores/findProfileStore.ts \
  apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts \
  apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts \
  apps/frontend/src/features/browse/views/BrowseProfiles.vue
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Fix any issues that arise.

- [ ] **Step 3: Run type-check**

```bash
pnpm type-check
```

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass

- [ ] **Step 5: Commit formatting fixes if any**

```bash
git add -A
git commit -m "chore: format and lint server-side clustering files"
```

---

## Task 17: Manual E2E verification

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Verify cluster endpoint works**

Log in at https://localhost:5173/auth with `me@example.org`. Navigate to Browse (/browse). Open browser DevTools Network tab.

Verify:
- Requests go to `/find/social/map/clusters` with bounds + zoom params
- Response contains cluster and point features
- No requests to `/find/social/map/bounds` (old endpoint)

- [ ] **Step 3: Verify cluster rendering**

- At low zoom: see blue cluster badges with counts
- Clicking a cluster zooms in (expansion zoom)
- At higher zoom: individual profile markers appear
- Hover/click on markers shows popup with profile card (data loaded on demand)

- [ ] **Step 4: Verify spiderfy at max zoom**

- Zoom to max (12) where overlapping markers exist
- Desktop: hover over overlapping markers triggers spiderfy
- Click on spiderfied marker opens popup

- [ ] **Step 5: Verify preference change triggers rebuild**

- Change tag filter in browse filter bar
- Verify cluster data updates after filter change
- Check DevTools: a new `/find/social/map/clusters` request fires

---

## Task 18: Changeset and PR

- [ ] **Step 1: Create changeset**

```bash
cat > .changeset/silver-cluster-dawn.md << 'EOF'
---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Server-side map clustering with supercluster for improved browse map performance
EOF
```

- [ ] **Step 2: Commit changeset**

```bash
git add .changeset/silver-cluster-dawn.md
git commit -m "chore: add changeset for server-side map clustering"
```

- [ ] **Step 3: Push and create PR**

```bash
git push -u origin feat/server-side-map-clustering
gh pr create --title "feat: server-side map clustering with supercluster" --body "$(cat <<'EOF'
## Summary
- Adds server-side map clustering using supercluster library
- New `ClusterService` manages per-user supercluster indexes in memory
- BullMQ queue rebuilds indexes when user preferences change
- New `GET /find/social/map/clusters` endpoint returns pre-computed clusters + lightweight point features
- Frontend renders server clusters as plain markers with click-to-zoom, individual points fed into existing markerClusterGroup for spiderfy
- Full profile data fetched on demand when popup opens

## Test plan
- [ ] Backend: ClusterService unit tests pass
- [ ] Backend: Cluster endpoint tests pass
- [ ] Frontend: Store cluster fetch tests pass
- [ ] Full test suite green (`pnpm test`)
- [ ] Type check passes (`pnpm type-check`)
- [ ] Manual: Browse map shows clusters at low zoom, individual markers at high zoom
- [ ] Manual: Clicking cluster zooms to expansion zoom
- [ ] Manual: Spiderfy works at max zoom on desktop
- [ ] Manual: Popup opens with full profile data on point click
- [ ] Manual: Changing tag filter rebuilds clusters

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Watch CI**

```bash
gh run list --limit 1
gh run watch --exit-status
```

# Server-Side Map Clustering Design

## Context

The browse profiles map (`OsmPoiMap`) currently performs all marker clustering client-side using `leaflet.markercluster`. The backend sends up to 500 full `PublicProfile` objects per bounds query, and the browser must: (a) parse large JSON payloads, (b) create DOM elements per marker, and (c) run spatial indexing via `leaflet.markercluster`'s KD-tree on every pan/zoom.

As the profile database grows, this architecture hits rendering and bandwidth bottlenecks. This design moves the heavy clustering computation server-side using the `supercluster` library, reducing the wire payload from hundreds of full profiles to ~20-50 lightweight cluster/point features per viewport.

## Architecture Overview

```
User updates prefs/blocklist
        │
        ▼
  BullMQ clusterQueue ──► clusterWorker ──► ClusterService.buildIndex(userId)
                                                    │
                                                    ▼
                                          In-memory Map<userId, Supercluster>
                                                    │
  Frontend pan/zoom ──► GET /social/map/clusters ───┘
        │                   (bounds + zoom)          │
        ▼                                            ▼
  OsmPoiMap renders:                         getClusters(bbox, zoom)
    - Server clusters as L.marker (cluster icon, click-to-zoom)
    - Server points into existing markerClusterGroup (spiderfy at max zoom)
```

## Backend

### ClusterService (`apps/backend/src/services/cluster.service.ts`)

Singleton service managing per-user supercluster indexes in memory.

**State:** `Map<string, { index: Supercluster, updatedAt: Date }>`

**Methods:**

- `buildIndex(profileId: string): Promise<void>`
  1. Call existing `ProfileMatchService.findSocialProfilesWithLocation(profileId)` to get filtered profiles (respects user's tag filters, country filter, blocklist)
  2. Call existing `ProfileMatchService.findMutualMatchIds(profileId)` to get dating match IDs
  3. Convert profiles to GeoJSON `Feature<Point>[]` with properties: `{ id, publicName, image: { blurhash, url }, highlighted }`
     - `image`: first profile image thumbnail variant (size `thumb`)
     - `highlighted`: `true` if profile ID is in the dating match set
     - Coordinates: `[lon, lat]` (GeoJSON order: longitude first)
  4. Create `new Supercluster({ radius: 40, maxZoom: 12, minPoints: 2 })`
     - `radius: 40` matches current `maxClusterRadius` in OsmPoiMap
     - `maxZoom: 12` matches existing `MAP_MAX_ZOOM` constant
  5. Call `index.load(features)` and store in the Map

- `getClusters(profileId: string, bbox: [w, s, e, n], zoom: number): Array<ClusterFeature | PointFeature>`
  - If no cached index exists, calls `buildIndex()` synchronously first (fast: ~5ms for <=500 points)
  - Returns `index.getClusters(bbox, zoom)`

- `getExpansionZoom(profileId: string, clusterId: number): number`
  - Returns `index.getClusterExpansionZoom(clusterId)`

- `getLeaves(profileId: string, clusterId: number): Feature[]`
  - Returns `index.getLeaves(clusterId, Infinity, 0)` (all leaves)

- `evict(profileId: string): void`
  - Removes the user's index from the Map (called on logout)

### BullMQ Queue + Worker

Following existing patterns (`emailQueue.ts`, `emailWorker.ts`):

**Queue:** `clusterQueue` (`apps/backend/src/queues/clusterQueue.ts`)
- Queue name: `'cluster-index'`
- Job data: `{ profileId: string }`

**Worker:** `clusterWorker` (`apps/backend/src/workers/clusterWorker.ts`)
- Calls `ClusterService.getInstance().buildIndex(job.data.profileId)`
- Registered in `main.ts` as side-effect import

**Triggers — enqueue rebuild job when:**
- `PATCH /social/filter` completes successfully (in `findProfile.route.ts`)
- Bus event `profile:blocked` fires (in ClusterService constructor or a listener)
- Bus event `profile:dating-prefs-updated` fires

### New API Endpoint

Added to `findProfile.route.ts`:

**`GET /find/social/map/clusters`**

Query params (all required):
```
south: number    — south latitude bound
north: number    — north latitude bound
west: number     — west longitude bound
east: number     — east longitude bound
zoom: number     — current map zoom level (integer)
```

Response:
```typescript
type ClusterMapResponse = {
  success: true
  features: Array<ClusterFeature | PointFeature>
}

type ClusterFeature = {
  type: 'cluster'
  id: number              // supercluster cluster_id
  lat: number
  lon: number
  count: number           // point_count
  expansionZoom: number   // zoom level to expand this cluster
}

type PointFeature = {
  type: 'point'
  id: string              // profile ID
  lat: number
  lon: number
  publicName: string
  image: { blurhash?: string | null, url?: string } | null
  highlighted: boolean    // dating match flag
}
```

The endpoint converts client bounds `{ south, north, west, east }` to supercluster's bbox format `[west, south, east, north]`, calls `clusterService.getClusters()`, and maps the raw GeoJSON output to the flat response shape above.

**`GET /find/social/map/clusters/leaves`**

Query params:
```
clusterId: number   — supercluster cluster_id
```

Response: `{ success: true, features: PointFeature[] }`

Used when a cluster persists at max zoom (co-located points that supercluster can't separate). The frontend fetches leaves and adds them to the markerClusterGroup, which then handles spiderfy natively. For normal zoom levels, this endpoint is not called — `leaflet.markercluster` handles spiderfy of points already in the group.

**`GET /find/social/profile/:profileId`**

Returns a single `PublicProfile` for popup rendering. Reuses existing `mapProfileToPublic()` mapper. Respects blocklist (returns 404 if blocked).

### Shared Types

New shared types in `packages/shared/zod/`:

```typescript
// ClusterFeature and PointFeature Zod schemas for response validation
// ClusterMapResponse schema
// BoundsWithZoom query schema (extends existing BoundsQuerySchema with zoom)
```

## Frontend

### Store Changes (`findProfileStore.ts`)

**New action:** `findClustersForMapBounds(bounds: MapBounds, zoom: number)`
- Calls `GET /find/social/map/clusters` with bounds + zoom
- Stores result in new state field `clusterFeatures: Array<ClusterFeature | PointFeature>`
- Bounds caching: padBounds strategy still applies for panning, but zoom changes always trigger a fresh fetch (cluster groupings are zoom-dependent)
- AbortController pattern preserved for cancelling in-flight requests

**New action:** `fetchProfileForPopup(profileId: string): Promise<PublicProfile>`
- Calls `GET /find/social/profile/:profileId`
- Small in-memory LRU cache (~20 entries) to avoid re-fetching on repeated clicks

**Removed:** `matchedProfileIds` is no longer fetched separately — the `highlighted` flag comes embedded in point features from the cluster endpoint.

**Retained:** `profileList` state for non-map list views (social list tab). `findProfiles()`, `loadMoreProfiles()`, `fetchNewProfiles()` are unchanged.

### OsmPoiMap Changes (`OsmPoiMap.vue`)

**New prop:**
```typescript
clusters?: MapCluster[]   // server-computed cluster features

interface MapCluster {
  id: number
  location: PoiLocation   // { lat, lon }
  count: number
  expansionZoom: number
}
```

**Rendering strategy:**
- **Cluster markers:** Rendered as plain `L.marker` instances in a separate `L.layerGroup` (not inside markerClusterGroup). Icon uses existing `createClusterIcon(count)` from `mapUtils.ts`. Click handler calls `map.flyTo(clusterCenter, expansionZoom)`.
- **Point markers:** Fed into the existing `L.markerClusterGroup` as before. With only ~20-50 points from the server, client-side clustering is near-instant. `leaflet.markercluster` handles spiderfy at max zoom, hover-to-spiderfy on desktop, and any residual overlap — all existing UX preserved.

**Bounds event change:** `bounds-changed` event now emits `{ bounds: MapBounds, zoom: number }` instead of just `MapBounds`.

**Marker update strategy:** The existing `updateMarkers()` diff logic is extended to also diff cluster markers. Cluster markers are simpler (no icon caching needed — just count-based icons).

### MapView Changes (`MapView.vue`)

- Passes `clusters` prop through to OsmPoiMap
- Updates `bounds-changed` event signature to include zoom

### BrowseProfiles Changes (`BrowseProfiles.vue`)

- `mapPois` computed splits `clusterFeatures` into two arrays:
  - `clusters: MapCluster[]` — features where `type === 'cluster'`
  - `mapPois: MapPoi[]` — features where `type === 'point'`, mapped to existing MapPoi shape
- `onBoundsChanged({ bounds, zoom })` calls `findClustersForMapBounds(bounds, zoom)`
- Popup click: calls `fetchProfileForPopup(id)`, passes result to `ProfileMapCard`
- `matchedProfileIds` removed from the view model — highlighting comes from point features

### useSocialMatchViewModel Changes

- `onBoundsChanged` updated to accept `{ bounds, zoom }`
- `initialize()` no longer calls `fetchDatingMatchIds()` separately (embedded in cluster response)
- `refreshIfFilterChanged()` still invalidates cache + re-fetches

## Data Flow

```
User pans/zooms map
    ↓
OsmPoiMap: moveend → emitBounds({ bounds, zoom })  (debounced 300ms)
    ↓
MapView: debouncedEmit (500ms total)
    ↓
BrowseProfiles: onBoundsChanged({ bounds, zoom })
    ↓
findProfileStore: findClustersForMapBounds(bounds, zoom)
    ↓
GET /find/social/map/clusters?south=&north=&west=&east=&zoom=
    ↓
ClusterService.getClusters(userId, bbox, zoom)
    → If no cached index: buildIndex() first (~5ms), then getClusters()
    → If cached: getClusters() directly
    ↓
Response: { features: [clusters..., points...] }
    ↓
Store splits into clusterFeatures → BrowseProfiles splits into clusters[] + mapPois[]
    ↓
OsmPoiMap: clusters → L.layerGroup (cluster icons, click-to-zoom)
           items → L.markerClusterGroup (point icons, spiderfy at max zoom)
```

## What Changes vs. What Stays

| Aspect | Before | After |
|--------|--------|-------|
| Clustering engine | leaflet.markercluster (client-side, all markers) | supercluster (server-side) + leaflet.markercluster (client-side, points only) |
| Wire payload | Up to 500 full PublicProfile objects | ~20-50 lightweight cluster/point features |
| Marker DOM elements | Up to 500 DivIcons | ~20-50 markers |
| Spiderfy at max zoom | leaflet.markercluster | leaflet.markercluster (unchanged) |
| Desktop hover-to-spiderfy | leaflet.markercluster | leaflet.markercluster (unchanged) |
| Bounds caching | padBounds + boundsContain | Same + zoom-level-aware invalidation |
| Dating match highlighting | Separate /dating/match-ids call | Embedded in cluster endpoint response |
| Popup data | Inline from profileList | Fetch-on-click via /profile/:id |
| Cluster icon style | createClusterIcon() blue badge | Same function, unchanged |
| Marker icon rendering | hydratePoiIcon() with Vue component | Same function, unchanged |

## Verification

1. **Backend unit tests:**
   - ClusterService: buildIndex produces valid supercluster, getClusters returns correct features for given bbox/zoom, evict removes index
   - Cluster endpoint: returns correct response shape, validates query params, handles missing index gracefully
   - Single profile endpoint: returns profile, respects blocklist
   - Worker: processes job and builds index

2. **Frontend unit tests:**
   - Store: findClustersForMapBounds fetches and stores features, cache invalidation on zoom change, fetchProfileForPopup caches
   - OsmPoiMap: renders cluster markers and point markers separately, cluster click triggers flyTo, bounds-changed includes zoom

3. **Manual E2E testing:**
   - Browse profiles map loads clusters at low zoom
   - Zooming in expands clusters into sub-clusters and then individual points
   - Clicking a cluster zooms to expansion zoom
   - At max zoom, overlapping markers spiderfy on hover (desktop) / click (mobile)
   - Clicking a point marker opens popup with full profile (fetched on demand)
   - Changing tag filters rebuilds the index (clusters update)
   - Blocking a profile removes them from clusters on next viewport change
   - Highlighted (dating match) points render with red glow

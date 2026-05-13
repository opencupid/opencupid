# Unified bounds feed for `NearbyFeatures`

**Status:** approved
**Date:** 2026-05-13
**Branch (anticipated):** `feat/unified-nearby-feed`

## Goal & non-goals

**Goal:** Replace the post-only bottom strip on `BrowseProfiles` with a unified feed that shows posts, events, and communities inside the current map viewport, sorted by recency, with kind-specific teasers.

**Non-goals:**

- No backend hydration with kind-specific content rows. The existing `UserContentMetadata` shape is enough for the teasers.
- No change to the map cluster pipeline (`/findProfile/cluster` / `findProfileStore.fetchBounds`).
- No change to the detail-panel routing.
- No change to CRUD flows.
- No change to the global `/content/feed` endpoint.

## Context

`BrowseProfiles.vue` currently calls two endpoints on every map pan/zoom:

1. `findProfileStore.fetchBounds(...)` — cluster features for map markers (kind-agnostic, server-side clustered).
2. `userContentStore.fetchPostsInBounds(bounds)` — post-only metadata for the `NearbyFeatures` bottom strip.

The second fetch is needlessly kind-specific. The backend already has a kind-agnostic `GET /content/bounds` route (`apps/backend/src/api/routes/content.route.ts:35-41`) returning `UserContentMetadata[]` via the kind-neutral `UserContentService.findInBounds`. The post-only path is a redundant kind-locked shim layered on top of the same data.

## Architecture

The change is mostly **deletion + rewiring** on the frontend with a small **limit/order** addition on the backend.

```
[backend]
  prisma.userContent (single table; kind discriminator)
    └─ UserContentService.findInBounds(box, { limit, orderBy: createdAt desc })   ← extended
         └─ GET /content/bounds → { items: UserContentMetadata[] }                 ← already exists
              [DELETE GET /content/posts/bounds]                                   ← removed
              [DELETE PostService.findInBoundsHydrated]                            ← removed

[frontend]
  OsmPoiMap @bounds:changed
    └─ useBrowseViewModel.onBoundsChanged
         ├─ findProfileStore.fetchBounds(...)   (cluster markers — unchanged)
         └─ userContentStore.fetchFeedInBounds(bounds)   ← new, replaces fetchPostsInBounds
              └─ state.feedItems: UserContentMetadata[]   ← replaces postSummaries
                   └─ <NearbyFeatures :items="contentStore.feedItems"
                                       @item:select="onNearbyItemSelect" />
                        ├─ kind === 'post'      → <PostIt> (existing)
                        ├─ kind === 'event'     → <EventTeaser> (new)
                        └─ kind === 'community' → <CommunityTeaser> (new)
```

The cluster fetch and the bounds-summary fetch stay separate. Clusters return aggregated point counts keyed by a supercluster index; summaries return flat metadata for visible rows. Different shapes, different lifecycles.

## Components & file changes

### Backend — 2 files modified, 2 files deleted

| File | Change |
| --- | --- |
| `apps/backend/src/services/userContent.service.ts` | `findInBounds(box, opts?: { limit?: number })` — add `take` (default 50), `orderBy: [{ createdAt: 'desc' }, { id: 'asc' }]`. |
| `apps/backend/src/api/routes/content.route.ts` | `/bounds` handler — pass `{ limit: 50 }` (hardcoded default for now; future PR can lift to query param). |
| `apps/backend/src/api/routes/content/post.route.ts` | Delete the `/bounds` route. Drop any imports that become unused (`BoundsQuerySchema`, `mapPostSummary`). |
| `apps/backend/src/services/post.service.ts` | Delete `findInBoundsHydrated`. Delete `attachPostContent` if no other caller depends on it (verify with grep). |

### Shared DTO

| File | Change |
| --- | --- |
| `packages/shared/zod/post/post.dto.ts` | Delete `PostSummarySchema` and `PostSummary` *if and only if* no other caller references them. Verify with workspace grep first. |
| `packages/shared/zod/apiResponse.dto.ts` | Delete `PostSummariesResponse` under the same condition. |

### Frontend — 4 files modified, 2 files added

| File | Change |
| --- | --- |
| `apps/frontend/src/features/userContent/stores/userContentStore.ts` | Replace `postSummaries: PostSummary[]` with `feedItems: UserContentMetadata[]`. Replace `fetchPostsInBounds` with `fetchFeedInBounds(bounds)` calling `/content/bounds`. |
| `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts` | `onBoundsChanged` calls `fetchFeedInBounds` instead of `fetchPostsInBounds`. |
| `apps/frontend/src/features/browse/components/NearbyFeatures.vue` | Prop `posts: PostSummary[]` → `items: UserContentMetadata[]`. Event `post:select` → `item:select`. Dispatch by `item.kind` via `<component :is>`. |
| `apps/frontend/src/features/browse/views/BrowseProfiles.vue` | Bind `:items="contentStore.feedItems"`. Replace `onNearbyPostSelect` with `onNearbyItemSelect` that dispatches on `kind` (mirror existing `handleMarkerSelect` at lines 236–243). |
| **NEW** `apps/frontend/src/features/events/components/EventTeaser.vue` | Thin presentational card. Renders `content` as a single-line title; styling can borrow from the event marker palette. |
| **NEW** `apps/frontend/src/features/community/components/CommunityTeaser.vue` | Same shape as `EventTeaser` with community styling. |

`<PostIt>` keeps serving as the post teaser. New teasers live under each feature's own directory, not in `browse/` — each feature owns its presentation.

## Data flow on a single map pan

1. User pans the map.
2. `OsmPoiMap` emits `@bounds:changed` with `{ bounds, zoom }`.
3. `useBrowseViewModel.onBoundsChanged` fires two parallel requests:
   - `findProfileStore.fetchBounds(bounds, zoom)` — cluster features for markers (unchanged).
   - `userContentStore.fetchFeedInBounds(bounds)` — `GET /content/bounds?north=…&south=…&east=…&west=…` → `UserContentMetadata[]`, sorted `createdAt desc`, capped at 50.
4. Store replaces `feedItems` wholesale. Viewport state is authoritative; this matches the current `postSummaries` overwrite behaviour.
5. `NearbyFeatures` re-renders. For each item it dispatches to `<PostIt>` / `<EventTeaser>` / `<CommunityTeaser>` via `<component :is>`.
6. Clicking a teaser emits `item:select` with the metadata row. `BrowseProfiles` routes by `kind`:
   - `post` → `PublicPost` route
   - `event` → `PublicEvent` route
   - `community` → `PublicCommunity` route
   - Map's `highlightedLocation` is set from `item.location` to recenter (same UX as today's `onNearbyPostSelect`).

## Error handling

- The backend route already has `BoundsQuerySchema.safeParse` returning 400 on invalid bounds. No new failure modes.
- The store's existing `storeError` / `storeSuccess` envelope wraps the new action identically. Error toasts surface through the same caller path.
- The teaser dispatch in `NearbyFeatures` is exhaustive over `ContentKind` (`'post' | 'event' | 'community'`). TypeScript narrows via the discriminator; a future fourth kind triggers a compile error rather than a silent skip.

## Testing

| Layer | Test |
| --- | --- |
| Backend route | Add or extend `__tests__/routes/content.bounds.route.spec.ts`: assert limit cap, `createdAt desc` ordering, mixed-kind response. |
| Backend route (cleanup) | Delete `/content/posts/bounds` cases from `post.route.spec.ts`. |
| Frontend store | `userContentStore.spec.ts`: rename `fetchPostsInBounds` cases to `fetchFeedInBounds`; assert `feedItems` is populated from the response. |
| Frontend component | `NearbyFeatures.spec.ts`: feed mixed kinds; assert the right teaser renders for each `kind`; assert `item:select` emits the full metadata row. |
| Frontend integration | `BrowseProfiles.spec.ts`: assert kind-dispatching navigation from `NearbyFeatures` matches `handleMarkerSelect` semantics. |

Existing kind-locked tests for `/content/posts/bounds` are deleted, not migrated.

## Risks & migrations

- **Hidden caller of `/content/posts/bounds` or `PostSummary`.** Before deleting, run a workspace grep for both. If a third caller exists, keep the symbols and add a deprecation comment instead of deleting.
- **Sort stability under recency tie.** Secondary `orderBy: { id: 'asc' }` keeps ordering deterministic when many rows share the same `createdAt` (rare in production, common in seed/import scenarios).
- **Empty-state UX.** `NearbyFeatures` is already `v-if="items.length > 0"`. Mixed feed makes it more likely to be non-empty in dense areas. Acceptable — the existing behaviour is "show when there's stuff to show".
- **Payload size in dense viewports.** The 50-row cap is a guard rail; revisit if real-world density makes the strip feel arbitrary (e.g. when 200+ items genuinely live in a single viewport).

## Out of scope (deferred follow-ups)

- Richer per-kind summary fields (event `startsAt`/`venue`, community `memberCount`, post `type`). When required, add `PublicUserContentSummary` as a discriminated union with the polymorphic hydrator pattern used by `findByProfileIdOwner` — but only when concrete UX needs them.
- Infinite scroll / pagination on the bottom strip. Today's behaviour is "show current viewport"; expanding beyond 50 rows is a separate UX question.
- Filtering the strip independently of the map (e.g. "show only events in the strip"). The `selectedLayers` filter today drives map clusters; mirroring it onto `/content/bounds` is straightforward but distinct.

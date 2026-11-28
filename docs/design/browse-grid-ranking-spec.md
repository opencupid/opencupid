# Browse grid ranking: activity, compatibility and distance

Status: draft, 2026-11-28

## Problem

The browse grid (`GET /find/list`) shows profiles in a fixed order. Most of them
are inactive, so people who write to the first profiles they see often wait for
a reply that never comes.

- **Current sort:** `ClusterService.getOrBuildList`
  (`apps/backend/src/services/cluster.service.ts:244`, added in #1566) sorts by
  `distanceKm` from the **bbox centre**, ascending, with `id` as the tie-break.
  Nothing else is used. The same viewport always gives the same order, across
  sessions and days. Only panning the map changes it.
- **72% of browsable profiles are dormant** (prod, 2026-11-28; social, visible,
  located, system profile excluded):

  | segment   | profiles | of which dating on |
  | --------- | -------: | -----------------: |
  | dormant   |      310 |                 77 |
  | returning |       88 |                 25 |
  | frequent  |       24 |                 20 |
  | new       |       10 |                  5 |

- **Case behind this spec:** a user deleted their account on 2026-11-27 after 1
  reply to 7 first messages (exit survey: "few people reply here"). 4 of the 7
  went to people who never logged in again. Across the platform, conversations
  started by men get a reply 37% of the time.

## Goals

1. The order is not static: it changes between visits, but stays stable within
   one browsing session so paging never repeats or skips anyone.
2. For a viewer with dating on, **mutually compatible profiles rank higher**,
   but as one input to the score, not as a fixed block on top. Compatibility
   counts for more than dormancy: being dormant does not cancel a profile's
   match bonus. A compatible profile that is far away can still be overtaken.
3. Everything is ordered by **activity-weighted randomness**, with **distance
   from the viewer's home** as a factor: closer ranks higher. For a viewer with
   dating off, that is the whole score.
4. **No activity data is shown to anyone.** No last-active date, segment,
   "online" badge or score appears in any response or in the UI.

## Not in scope

- The map: pins, clusters, `/clusters`, `/cluster-leaves` and the cluster
  index build (`ClusterService.buildIndex`, `findSocialProfilesWithLocation`)
  stay as they are. The ranking changes only the queries behind the list.
- Which profiles appear at all: dormant profiles are ranked lower, never
  removed.
- A new compatibility check. The existing yes/no eligibility check is reused
  as is.

## Ranking

### Inputs per item

| input         | source                                                                                                                                                                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `highlighted` | already computed: `findMutualMatchIds(viewer)` (mutual age/gender/kids fit, dating on for both; always empty when the viewer has dating off, because `DatingEligibleProfileSchema` requires `isDatingActive: true`)                                                                                                                                                                  |
| `segment`     | `ProfileActivitySummary.segment` (distilled nightly at 03:00 UTC with hysteresis; profiles without a row count as `dormant`)                                                                                                                                                                                                                                                         |
| `distanceKm`  | haversine distance from the **viewer's home** (`Profile.lat/lon`) to the item, loaded with the segment and cached per index version (see "Implementation"). Replaces today's per-request distance from the bbox centre. All 574 social profiles on prod have a location (2026-11-28), and `/find/list` requires social mode, so the viewer always has one and no fallback is needed. |
| `jitter`      | seeded pseudo-random number in [0, 1), see "Randomness"                                                                                                                                                                                                                                                                                                                              |

### Score

Every item gets one score and the list is sorted by it (descending), with `id`
as the final tie-break. There are no tiers.

```
a     = activity(segment)
score = W_ACT   * a
      + W_DIST  * proximity(distanceKm)
      + W_MATCH * match
      + W_RAND  * jitter

match:     1 if highlighted (mutually eligible), else 0
activity:  frequent 1.0 · new 0.8 · returning 0.7 · dormant 0.1
proximity: 1 / (1 + distanceKm / D0)      D0 = 25 km
weights:   W_ACT 0.35 · W_DIST 0.30 · W_MATCH 0.15 · W_RAND 0.20
```

- **Compatibility is a bonus, not a block.** Every match gets the same flat
  0.15, whatever its activity. Dormancy lowers the activity term only, so a
  dormant match ranks above an otherwise equal dormant non-match in about 97%
  of rotations, the same margin an active match has over an active non-match.
  The bonus is smaller than the randomness (0.20), so matches don't stick to
  the top and similar profiles still swap places from visit to visit.
- **Decided:** `W_MATCH` stays at 0.15.
- **There is no viewer-mode branch.** For a viewer with dating off, `match` is
  0 for everyone and the score reduces to activity + distance + randomness.
- `new` sits above `returning` on purpose: new members need early replies to
  stay, and they are the people most likely to answer.
- **Decided:** `dormant` never scores 0. Its activity stays at 0.1, so a dormant profile very close by can
  still beat an active one far away. Distance matters more than "not seen for
  14 days" when the area is thin.
- Posts, events and communities use their poster's segment. Content from
  someone who has stopped using the app is less useful too.
- The weights and `D0` are constants in one module (for example
  `@/services/browseRanking.ts`), so they can be tuned without touching the
  call sites.

#### Worked examples (viewer with dating on; distances from the viewer's home)

| profile                   | activity | proximity | match | score (no jitter) |
| ------------------------- | -------: | --------: | ----: | ----------------: |
| frequent, match, 20 km    |    0.350 |     0.167 | 0.150 |             0.667 |
| frequent, no match, 5 km  |    0.350 |     0.250 |     — |             0.600 |
| returning, match, 20 km   |    0.245 |     0.167 | 0.150 |             0.562 |
| frequent, no match, 20 km |    0.350 |     0.167 |     — |             0.517 |
| frequent, no match, 50 km |    0.350 |     0.100 |     — |             0.450 |
| dormant, match, 5 km      |    0.035 |     0.250 | 0.150 |             0.435 |
| dormant, no match, 5 km   |    0.035 |     0.250 |     — |             0.285 |

With `W_RAND` = 0.20, a lower-scored item overtakes a higher one in
(1 − gap / 0.20)² / 2 of rotations (never, once the gap is 0.20 or more):

- A match 20 km away against a non-match 5 km away (both frequent): the gap is
  0.067, so the closer non-match comes first in about 22% of rotations.
- A match against a non-match at the same distance and activity: the gap is
  0.15, so the match is overtaken in about 3% of rotations. Matches lead, but
  they don't own the top.
- A returning match against a frequent non-match at the same distance: the
  match leads by 0.045 and is overtaken in about 30% of rotations.
- A dormant match 5 km away against a frequent non-match 50 km away: nearly
  even (gap 0.015), so each comes first about half the time.
- A dormant match against a frequent non-match at the same distance: the
  activity gap (0.315) is bigger than the match bonus (0.15), so the active
  non-match leads by 0.165 and the dormant match comes first in only about 1.5%
  of rotations. Compatibility outweighs dormancy among dormant profiles and
  against farther active profiles, but it does not lift a dormant match above
  an equally close, frequently active person.

### Randomness

- **Seed:** the cluster index version (cache key plus build time), so each
  viewer and filter set gets its own shuffle. `jitter = FNV-1a(seed:itemId)`
  mapped to [0, 1), not `Math.random()` per call.
- **Rotation:** the cluster index lives for 30 minutes (`INDEX_TTL_MS`) and is
  rebuilt on demand, so the order rotates at most every 30 minutes per viewer
  and filter set. It changes between visits and stays the same while someone
  pages through it.
- **Pagination:** `offset` keeps working, because every page ranks the same
  points with the same seed and the same cached inputs. Panning changes only
  which items are inside the bbox. Items that stay in view keep their relative
  order.
- **Index rebuilt mid-session** (a TTL expiry, or `evict` after a profile
  change): the order can change between page 1 and page 2. This is accepted.
  The grid store already reloads from offset 0 whenever the query changes, and
  the same thing happens today when profiles are added or removed.

## Privacy

- `segment` and `score` stay on the server. They live only in
  `BrowseListService`'s cache, never in the cluster index's point properties,
  so they can't reach `/clusters` or `/cluster-leaves`. `ListRef` /
  `BrowseListItem` get no new fields.
- The order still says something: profiles near the top are probably active.
  That is coarse (one of four segments, mixed with distance and jitter) and is
  the point of the feature. Documented in `docs/PRIVACY.md`.
- The match bonus uses only data the viewer can already see: matches already
  get the map halo (`highlighted`).

## Implementation

The list's sort and paging move out of `ClusterService` into a new
`BrowseListService`. `ClusterService` keeps only what it shares with the map.

1. `ClusterService.getOrBuildList` becomes `getOrBuildPointsInBounds`: the same
   cached index and bbox filter, but no sort and no paging. It returns the
   points (kind, id, lat, lon, `highlighted`) and an opaque `indexVersion` that
   changes only when the index is rebuilt.
2. `browseRanking.service.ts`: the weights, `rankScore`, `rankListRefs` (pure)
   and `loadRankInputs`. The loader reads the viewer's home and each item's
   segment (a content item takes its poster's), then computes the home
   distance. It throws if the viewer has no home location, which can't happen
   for a social viewer.
3. `BrowseListService.getList`: gets the points, loads rank inputs only for
   points not cached yet for this `indexVersion` (panning brings in new
   ones), ranks with the `indexVersion` as seed, then slices the page. Cache
   entries expire after 30 minutes, with at most 200 kept, like the cluster
   index.
4. `GET /find/list` calls `BrowseListService.getList`. `ListRef` moves to
   `browseList.service.ts`. `ListRef.distanceKm` / `BrowseListItem.distanceKm`
   now means distance from the viewer's home. No UI component reads it today.
5. A change of home location is picked up straight away: profile updates
   already call `clusterService.evict(profileId)`, which gives the index a new
   version and so a fresh set of inputs.

### Tests

- `browseRanking` unit tests:
  - an active match outranks an otherwise equal non-match at equal jitter
  - a closer active non-match can outrank a farther match (no fixed top block)
  - a dormant match outranks an otherwise equal dormant non-match (flat
    match bonus, not scaled by activity)
  - distance is measured from the viewer's home, not the bbox centre:
    panning does not reorder items that stay in view
  - with no matches (viewer has dating off), the score is activity + distance +
    jitter
  - same seed gives the same order; a different seed gives a different order
  - closer items beat farther ones at equal activity and jitter
  - the order is total (stable `id` tie-break)
- `browseList.service` tests:
  - paging with the same index version gives no duplicates or gaps
  - inputs load once per index version, and only for new points
  - a new index version reshuffles
- `cluster.service` tests: `getOrBuildPointsInBounds` returns the in-bounds
  points, and the index version is stable until a rebuild

## Rollout and measurement

- One release; no data migration (the summary rows already exist).
- Watch, before and after, over 2–4 weeks:
  - share of first messages sent to `dormant` recipients (expect a sharp drop)
  - first-message reply rate, overall and for male initiators (baseline 37%)
  - median time to first reply

  All three come from `Conversation`, `Message` and `ProfileActivitySummary`;
  exclude the system profile.

## Decisions

- Compatibility is a flat bonus, not a tier, and it is not reduced by dormancy.
- `W_MATCH` = 0.15.
- Dormant profiles never score 0 (activity 0.1).
- Distance is measured from the viewer's home.

## Open questions

None.

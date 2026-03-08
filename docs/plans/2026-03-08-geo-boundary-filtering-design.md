# Geo-Boundary Filtering in Browse Map (#1032)

## Summary

Implement map viewport-based profile filtering: when the user drags/zooms the map, refetch profiles using the visible boundary as the geographic filter.

## Architecture

### Data flow

```
OsmPoiMap (Leaflet moveend, including initial load)
  -> emits @bounds-changed {south, north, west, east}
    -> MapView (pass-through emit)
      -> SocialMatch.vue (500ms debounce + AbortController)
        -> findProfileStore.findSocialForMapBounds(bounds)
          -> GET /find/social/map/bounds?south=&north=&west=&east=
            -> profileMatchService.findSocialProfilesInBounds(profileId, bounds)
              -> Prisma: lat/lon range + tags + exclusions (no country)
```

### Initial load

Map centers on the user's saved `SocialMatchFilter` location at default zoom. The Leaflet `moveend` event fires on initial load, emitting the first bounds and triggering the first bounded fetch. No unbounded fetch occurs.

### Filtering rules

- **Bounds**: sole geographic filter (replaces country for map queries).
- **Tags**: always applied when non-empty (from `SocialMatchFilter`).
- **Country**: not applied in the new bounded endpoint.
- **SocialMatchFilter location**: used only for initial map center; not updated on drag.

## New API endpoint

`GET /find/social/map/bounds` with required query params `south`, `north`, `west`, `east`.

Backed by a new service method `findSocialProfilesInBounds(profileId, bounds)` that applies:

- lat/lon range filtering within bounds
- tag filter from SocialMatchFilter (if non-empty)
- standard exclusions (blocked users, inactive profiles, status flags)
- no country filter

The existing `GET /find/social/map` remains unchanged for non-boundary use.

## Debounce and race conditions

- 500ms debounce on `bounds-changed` handler (constant `MAP_BOUNDS_DEBOUNCE_MS` at top of file).
- `AbortController` in the store: each `findSocialForMapBounds()` call aborts the previous in-flight request before starting a new one.

## Changes by file

| Layer | File | Change |
|-------|------|--------|
| Backend route | `findProfile.route.ts` | Add `GET /social/map/bounds` |
| Backend service | `profileMatch.service.ts` | Add `findSocialProfilesInBounds()` |
| Frontend store | `findProfileStore.ts` | Add `findSocialForMapBounds(bounds)` with AbortController |
| Frontend component | `OsmPoiMap.vue` | Emit `bounds-changed` on Leaflet `moveend` |
| Frontend component | `MapView.vue` | Pass-through `bounds-changed` emit |
| Frontend view | `SocialMatch.vue` | Handle `bounds-changed`, debounced store call |
| Tests | Various `__tests__/` | Store, route, service, component tests |

## Decisions

- AbortController (not request-ID tracking) for race condition handling -- cancels in-flight HTTP requests.
- Dedicated endpoint rather than adding a "skip country" flag to the existing endpoint -- cleaner separation.
- Generic `bounds-changed` emit from OsmPoiMap keeps the shared map component reusable.

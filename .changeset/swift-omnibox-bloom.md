---
'@opencupid/frontend': minor
'@opencupid/backend': minor
---

Search omnibox in the browse pill: a single input that searches in parallel across tags, profiles, posts, and geocoded locations. Selecting a result navigates to the detail panel and flies the map to the picked location.

- Frontend: extracts SearchInput / SearchResults / ProfileChipList; geocoding is biased to the viewer's country and capped at 5 candidates; type-safe Bootstrap-Vue-Next variant augmentation (incl. a `post-it` color for post chips).
- Backend: `PostSummary` and `ProfileSummary` now carry `location: LocationDTO` so the client can fly the map to a result; `extractLocation` shared across mappers.

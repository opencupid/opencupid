---
'@opencupid/frontend': patch
---

Replace singleton geocoding Pinia store with per-instance `useGeocoder` composable so concurrent call sites (SearchBar, LocationSelector) no longer share results.

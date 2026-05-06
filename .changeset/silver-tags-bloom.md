---
'@opencupid/frontend': minor
'@opencupid/backend': minor
---

Server-side filtering for the social map's people/posts layers. Adds a `kinds` query parameter to `/find/clusters` and `/find/cluster-leaves`, and replaces the planned client-side layer toggle with a button-group `<MapLayerControl>` that drives a refetch on change.

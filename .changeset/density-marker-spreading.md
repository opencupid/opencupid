---
'@opencupid/frontend': minor
'@opencupid/backend': minor
'@opencupid/shared': minor
---

Replace supercluster + overlapping-marker-spiderfier with density-based marker spreading on the map. The backend `/find/clusters` and `/find/cluster-leaves` endpoints are retired (deprecated empty shims remain for stale clients) and replaced by a single bounds-driven `/find/bounds` POI endpoint; the frontend lays colocated markers out on a deterministic spiral in pixel space at render time, with a zoom-responsive spread radius. Removes the `supercluster` and `ts-overlapping-marker-spiderfier-leaflet` dependencies.

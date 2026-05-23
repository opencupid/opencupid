---
'@opencupid/frontend': minor
---

Replace OMS spiderfier with density-based marker spreading on the POI map. Overlapping markers fan out in a deterministic zoom-responsive spiral so no click-to-expand is needed; spread radius compresses as the user zooms in and disables entirely at high zoom.

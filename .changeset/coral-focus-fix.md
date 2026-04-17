---
'@opencupid/frontend': patch
---

Fix transient focus-outline artifact on BOffcanvas panels (NearbyFeatures, DetailPanelOrchestrator). BootstrapVueNext auto-focused the panel root on open, painting a 2px focus-visible outline above the panel edge until the first state change moved focus away. Passing `:focus="false"` opts out of the auto-focus for these persistent/secondary panels where the ring isn't needed.

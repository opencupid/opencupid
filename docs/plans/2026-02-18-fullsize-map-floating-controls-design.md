# Design: Full-size Map with Floating Controls (Issue #478)

**Date:** 2026-02-18
**Scope:** `BrowseProfiles.vue`, `Posts.vue`

## Problem

In both views, the `OsmPoiMap` (map mode) is constrained to the height remaining *below* the toolbar. The request is for the map to occupy the entire `.list-view` container, with controls floating on top.

## Approach: Extract Map + Float Controls (Option B)

`.list-view` becomes `position: relative`. Two layers stack inside it:

- **Layer 1 — Map** (`z-index: 1`, `position: absolute; inset: 0`): fills edge-to-edge in map mode
- **Layer 2 — Controls** (`z-index: 10`, `position: absolute; top: 0; width: 100%`): floats above the map with a frosted-glass backdrop

In grid mode, both layers return to normal flex flow.

## BrowseProfiles.vue

### Template
- Add `isMapMode` computed: `viewModeModel === 'map' && isInitialized && haveResults`
- Add `map-mode` class to `.list-view` when `isMapMode`
- Wrap the controls `MiddleColumn` in a `div.controls-overlay`
- Move `OsmPoiMap` out of `BPlaceholderWrapper > div.overflow-auto`; make it a direct child of `.list-view`, shown with `v-if="isMapMode"`, class `map-fullscreen`
- Add `v-if="!isMapMode"` to `BPlaceholderWrapper` so grid/loading/no-access are hidden in map mode

### CSS
```scss
.list-view {
  position: relative;
  height: calc(100vh - $navbar-height);
}

.controls-overlay {
  position: relative;
  z-index: 10;
}

.map-mode .controls-overlay {
  position: absolute;
  top: 0; left: 0; right: 0;
  background: rgba(var(--bs-body-bg-rgb), 0.85);
  backdrop-filter: blur(4px);
}

.map-fullscreen {
  position: absolute;
  inset: 0;
  z-index: 1;
}
```

## Posts.vue

### Template
- Add `map-mode` class to `.list-view` when `viewMode === 'map'`
- Wrap `.posts-toolbar` in `div.controls-overlay`
- Replace the 4 per-tab `OsmPoiMap` instances with a single `OsmPoiMap` as a direct child of `.list-view`, class `map-fullscreen`, shown with `v-if="viewMode === 'map'"`, using existing `currentTabPosts` computed
- Add `v-if="viewMode !== 'map'"` to `.tab-content` wrapper so grid panes are hidden in map mode

### CSS
Same pattern as BrowseProfiles.vue. Remove the existing `.map-view { min-height: 500px }` rule (no longer needed).

## Out of Scope
- No logic/data changes
- No changes to `OsmPoiMap` component internals
- No changes to other views

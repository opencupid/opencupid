# Browse GUI Refactor — Design Spec

**Date:** 2026-04-03
**Status:** Approved wireframes compiled, awaiting implementation plan
**Wireframe references:** wireframe-2, wireframe-3, wireframe-4, wireframe-8, wireframe-10

---

## Overview

The existing app uses a traditional navbar + separate full-page routes for Browse (profiles), Posts, Inbox, My Profile, and Settings. This refactor replaces that model with a single persistent map view following mature mapping app conventions (Google Maps pattern): the map is always the canvas, controls float above it, and detail panels slide in without leaving the map.

The navbar is removed entirely. All navigation is surfaced through map overlay controls.

---

## 1. Unified Map View

### Current state

Two separate map views exist as independent routes:

- `/browse` → `BrowseProfiles.vue` using `MapView`, `MapIcon` (profile), `ProfileMapCard` (popup)
- `/posts` → `BrowsePosts.vue` using `MapView`, `MapIcon` (post), `PostMapPopup` (popup)

Each has its own filter bar, its own store, its own view model, and its own route.

### New design

A single `/browse` route renders one map containing both profiles and posts as co-located POI types. The map never unmounts — it is the persistent shell of the application.

**Marker types on the unified map:**
| Type | Visual | Source component |
|---|---|---|
| Profile | Circular avatar photo | `features/publicprofile/components/MapIcon.vue` |
| Post | Post-it note icon (rect + folded corner + anchor stem) | `features/posts/components/MapIcon.vue` (new shape) |
| Cluster | Circle with count + mini avatar/post-it hints | shared cluster renderer |

**Cluster behaviour:** Both profiles and posts contribute to a single count. The cluster bubble shows mini avatar circles (left) and post-it rects (right) as type hints. Click to zoom in and resolve to individual markers. The existing OverlappingMarkerSpiderfier logic is retained - spiderify() at maxzoom level.

**Hover popover (non-touch only):** Retain existing popover content. Appears on marker hover. Profile popover: avatar, name, location, 2–3 tag pills. Post popover: thumbnail, title, author byline, 1 tag pill. Click anywhere on popover or marker → opens offcanvas detail panel.

**Touch / click:** Bypasses popover, opens offcanvas detail directly.

### Affected components

- `BrowseProfiles.vue` — becomes the unified view, absorbs post data layer
- `BrowsePosts.vue` — route and view retired; functionality merged
- `MapView.vue` — receives mixed POI array; needs to support per-item icon component resolution
- `ProfileMapCard.vue` — becomes profile offcanvas trigger
- `PostMapPopup.vue` — becomes post offcanvas trigger
- `useSocialMatchViewModel` — extended or replaced with unified view model
- `usePostsViewModel` — folded into unified view model
- `findProfileStore` — retained
- `postStore` — retained

---

## 2. Unified Filter Bar

### Current state

`BrowseFilterBar.vue` renders two independent controls side by side: `LocationFilterInput` and `TagFilterSelector`. The filter bar sits in a `BrowseLayout` container above the map.

`BrowsePosts.vue` has a separate `PostFilterBar.vue` with its own location + tag controls.

### New design

A single pill-shaped control floats above the map (z-index overlay, positioned top-centre of the map region, to the right of the posts sidebar on >md).

**Structure (wireframe-2):**

```
[ 🔍  Kisszékely  ·  #Biokert ✕  #Főzés ✕  ▾ ]
```

- Location text is always the leftmost element, rendered by the existing `LocationFilterInput`
- Selected tag pills appear inline after a `·` separator
- `▾` opens a single dropdown panel with two sections:
  - **LOCATION** — current location with a "change ›" link
  - **TAGS IN AREA** — tag chips dynamically populated from current map bounds; updates on pan/zoom
- Empty state: placeholder text `Location or tags…`
- State B (selections active): tag pills with `✕` per tag + `Clear all` link at right
- On sm: tag pills are replaced by a count badge (e.g. `2`) — no room for inline pills

**Key behavioural change:** Tags are scoped to the current map bounds, not a global list. The tag dropdown content updates reactively as the user pans or zooms. Tags are sourced exclusively from profile results — posts do not carry independent tags.

### Affected components

- `BrowseFilterBar.vue` — redesigned as unified pill; `LocationFilterInput` retained internally
- `TagFilterSelector.vue` — replaced by component `TagSelector.vue`
- `BrowseLayout.vue` — filter bar slot moves from container-above-map to floating overlay
- `PostFilterBar.vue` — retired

### API changes

All existing backend routes remain unchanged. A new general bounds-based query endpoint is to be added alongside existing routes. This takes the same bound query parameters as the existing `*/bounds` routes (Post, Profile) and returns post, profile and tag data from the given geo boundary. Tag results are obtained from the tags associated with the Profile result.

---

## 3. Posts-in-View Sidebar

### Current state

No equivalent exists. Posts are browsed on a separate `/posts` route.

### New design

A fixed-width (~80px) single-column thumbnail strip on the left edge of the viewport, visible on >md only. Hidden on sm.

**Structure (wireframe-8):**

- Header: "Posts" label
- Body: single column of square thumbnails (~64×64px), 8px padding, 6px gap, scrollable
- Each cell: post photo thumbnail, or post-it note icon if the post has no image
- Active state: bold border on the thumbnail cell; corresponding post marker on map shows a dashed highlight ring
- Scroll position is independent; list updates when map bounds change

**Interaction model:**
| Event | List behaviour | Map behaviour |
|---|---|---|
| Click thumbnail | Cell becomes active (bold border) | `flyTo` that marker + highlight ring |
| Click post marker | Corresponding thumbnail scrolls into view | Opens post offcanvas detail |
| Map pan / zoom | List updates to posts in new bounds | Normal |
| No posts in bounds | Empty state message | — |

**Layout on >md (three-column flex row):**

```
[ Posts sidebar ~80px ] [ Offcanvas detail ~280px (conditional) ] [ Map (flex remainder) ]
```

The offcanvas opens between the sidebar and the map. The sidebar never collapses — it remains visible when the offcanvas is open. The map shrinks to fill remaining space; Leaflet `invalidateSize()` handles reflow.

### Affected components

- New component: `PostsSidebar.vue` (no equivalent today)
- `MapView.vue` — needs to accept and fire `flyTo` and marker-highlight events

---

## 4. Offcanvas Detail Panels

### Current state

Profile detail opens as a full-page route (`/profile/:profileId`). Post detail opens via a modal/overlay within `BrowsePosts.vue`. No offcanvas pattern exists on the browse view.

### New design

All detail views open as offcanvas panels — right side on >md, full screen on sm. Three panel types share the same container. Only one offcanvas panel (browse detail or user offcanvas) may be open at a time — opening one closes the other.

**Profile detail** (triggered by clicking a profile marker or popover):

- Hero image, name, location, tags, bio — scrollable
- On mobile: two CTAs at bottom

**Post detail** (triggered by clicking a post marker, popover, or sidebar thumbnail):

- Hero image, title, author row (avatar + `→ profile` link), tags, body — scrollable
- On mobile: two CTAs — "Full post →" and "Author profile"

**Clicking "→ profile" or "Author profile"** from a post detail: replaces post detail with profile detail within the same offcanvas (push navigation within panel).

### Affected components

- `ProfileMapCard.vue` — repurposed as offcanvas profile detail content
- `PostMapPopup.vue` — repurposed as offcanvas post detail content
- New component: `BrowseOffcanvas.vue` (shell managing which detail is active)
- `PublicProfileView.vue` — the `/profile/:profileId` route is retained for deep-link access; the offcanvas is the in-app surface

---

## 5. User Offcanvas (Profile + Inbox)

### Current state

Four separate full-page routes handle user content:

- `/me` → `MyProfile.vue` (with `MyProfileSecondaryNav`, `EditableFields`, `ProfileContent`)
- `/me/edit` → `MyProfile.vue` with `editMode: true` prop (separate route)
- `/settings` → `Settings.vue`
- `/inbox` → `Messaging.vue` (conversation list)
- `/inbox/:conversationId` → `ConversationView.vue` (message thread, `hideNavbar: true`)

Navigation between these is via the navbar and Vue Router.

### New design

Two independent offcanvas panels, both right-side on >md, full-screen on sm. Entry points are map overlay controls (top bar): inbox/notif icon and user avatar. No cross-panel navigation.

**Profile panel** (avatar entry point) — wireframe-10:

```text
Header:  [avatar]  Name  Location    ⚙  ✕
Tabs:    [ Profile ▂ ]  [ Posts ]
Content: tab-specific scrollable area
```

- **Profile tab:** MyProfile.vue re-housed, cold start bootstrap logic stripped from useMyProfileViewModel
- **Posts tab:** PostList.vue
- **Gear ⚙ icon:** Pushes Settings sub-view within the panel. Header becomes `‹ Settings`. Back returns to the previously active tab. Replaces `/settings` route as primary access point.
- Settings content: existing Settings.vue, page layout and cold start bootstrapping logic stripped

**Inbox panel** (inbox/notif icon entry point) — wireframe-10:

```text
Header:  Inbox  [3]  ✕
Body:    conversation list (scrollable, unread dots)
         ↓ tap row
         ‹ Name  ✕
         message thread (scrollable)
         [ Message…  ↑ ]  (pinned send bar)
```

- Conversation list and message thread both render within the panel — no route change.
- Back nav (`‹ Name`) returns to conversation list.
- Replaces `/inbox` and `/inbox/:conversationId` routes as primary in-app surface.

### Affected components

- `MyProfile.vue` — content re-housed in Profile panel Profile tab
- `EditableFields.vue` — retained; `EditSaveButton` pinned fixed to the bottom of the offcanvas panel (FAB-style, overlays scrollable content)
- `MyProfileSecondaryNav.vue` — retired; replaced by two-tab bar
- `Settings.vue` — content re-housed in Settings sub-view within Profile panel
- `Messaging.vue` — content re-housed in Inbox panel conversation list
- `ConversationView.vue` — content re-housed in Inbox panel message thread
- `MessagingNav.vue` — retired; back nav is panel-internal
- New component: `UserOffcanvas.vue` — shell with two named slots (profile, inbox) and entry-point prop. Reuse useNativeOffcanvas pattern from BrowsePosts.vue.

---

## 6. Routing Changes

### Routes retired as primary navigation surfaces

These routes become unreachable via normal in-app navigation once the navbar is removed. They may be retained as deep-link fallbacks or removed:

| Route                    | Replaced by                                   | Repurposed to                                           |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| `/me`                    | Profile panel — Profile tab                   | `/browse` → open Profile panel                          |
| `/me/edit`               | Profile panel — Profile tab (always editable) | deleted                                                 |
| `/settings`              | Profile panel — Settings sub-view             | deleted                                                 |
| `/inbox`                 | Inbox panel — conversation list               | `/browse` -> open Inbox panel                           |
| `/inbox/:conversationId` | Inbox panel — message thread                  | `/browse` -> open Inbox panel and specific conversation |
| `/posts`                 | Unified `/browse` map                         | deleted                                                 |

### Routes retained

| Route                                  | Status                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `/browse`                              | Unified map (expanded scope)                                              |
| `/profile/:profileId`                  | Retained for deep-link / share URLs                                       |
| `/home`                                | Route dropped; `UserHome.vue` kept; `/browse` becomes landing route       |
| `/onboarding`                          | Unchanged                                                                 |
| `/auth`, `/auth/logout`, `/magic-link` | Unchanged                                                                 |

---

## 7. Navbar Removal

The navbar (`$navbar-height` CSS variable is referenced in `BrowseLayout.vue`) is removed. The `BrowseLayout.vue` `list-view` height calculation `calc(100vh - $navbar-height)` becomes `100vh`. All `hideNavbar: true` route meta flags become the default.

Components that reference the navbar height variable will need to be updated.

---

## Summary of Architectural Shifts

| Dimension                    | Current                            | New                                |
| ---------------------------- | ---------------------------------- | ---------------------------------- |
| Map instances                | 2 (profiles map, posts map)        | 1 (unified)                        |
| Filter bars                  | 2 (BrowseFilterBar, PostFilterBar) | 1 (unified pill)                   |
| Primary navigation           | Vue Router + navbar                | Map overlay controls + offcanvas   |
| Profile/posts/inbox/settings | Full-page routes                   | Offcanvas panels (no route change) |
| Tag scope                    | Global list                        | Bounded to current map viewport    |
| Marker hover                 | Click to open popup                | Hover = popover, click = offcanvas |
| Edit profile                 | Separate route (`/me/edit`)        | Inline in Profile panel tab        |
| Conversation route           | Separate route with `hideNavbar`   | Panel-internal push nav            |
| Posts browse entry           | `/posts` route                     | Posts sidebar + unified map        |

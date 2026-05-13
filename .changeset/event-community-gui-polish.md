---
'@opencupid/frontend': minor
'@opencupid/shared': patch
---

GUI iteration on top of the Community feature (#1454):

- Tonal accent-color system (theme.scss): new `--bs-event` and `--bs-community` semantic tokens with formula-derived `-light` variants. Community map marker restyled to a colored circle with the embracing-figures icon.
- MapLayerControl: 2x2 grid with per-kind semantic outline colors (outline-event, outline-community, outline-post-it).
- Speed-dial refactored with @floating-ui/vue: placement auto-adapts to viewport room (opens upward by default, downward when there's no room above), repositions on scroll/resize. SpeedDial and UserContentCreateSpeedDial extracted as reusable components; the latter exposes triggerClass/actionClass props for re-skinning per call site.
- Owner-drawer toolbar gains the create speed-dial alongside the Inbox and Profile buttons.
- After any post/event/community CRUD, the BrowseProfiles map invalidates its cluster cache and refetches via a new `usercontent:mutated` bus event.
- Hungarian translations for the community.* i18n namespace (#1456).

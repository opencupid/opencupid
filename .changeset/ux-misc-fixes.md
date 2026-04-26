---
'@opencupid/backend': patch
'@opencupid/frontend': patch
---

UX & dev-ergonomics tweaks:

- Raise like rate limit from 5/min to 25/min so QA scenarios on mutual-match flows aren't throttled.
- Raise scope-toggle rate limit from 1/day to 5/day so users (and dev/QA) aren't locked out after a single accidental toggle.
- `PublicProfile.vue`: hide the `<ProfileInteractions>` row (message/like buttons) when the viewer is the target of the profile they're looking at. Belt-and-suspenders frontend guard for the self-view case already gated server-side via `interactionContext`.
- `publicNameValidation.ts`: lower the minimum public name length from 4 to 3 characters so 3-letter names (e.g. "Joe") are valid.
- `DatingModeDropdown.vue`: drop the `expanded` toggle class — the grid is now always shown when the dropdown is open, removing a redundant nested expand state.

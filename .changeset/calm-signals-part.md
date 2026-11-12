---
'@opencupid/frontend': minor
---

Tell a lost internet connection apart from an API outage: the "It's not you, it's us" overlay now only appears when the API is down while the user is connected, and a separate "You seem to be offline" overlay covers connection problems at the user's end. Gateway 502/503/504 answers are now recognised as an API outage. Both conditions are reported to Umami as `outage-api` and `outage-network` events.

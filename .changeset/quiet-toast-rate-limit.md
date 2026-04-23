---
'@opencupid/frontend': patch
'@opencupid/shared': patch
---

Route the 429 rate-limit toast through the existing `bus` + `AppNotifier` pattern so error-classification code stays UI-agnostic. The toast copy now lives under the translated `uicomponents.error.rate_limit` key (en + hu) instead of an inline English literal, and repeat 429s collapse into a single on-screen toast via a stable toast id.

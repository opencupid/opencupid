---
'@opencupid/frontend': patch
---

Pick the initial language from the browser's full `navigator.languages` preference list instead of only its first entry, so a visitor preferring `['de-AT', 'de', 'en']` gets English rather than the fallback (#995).

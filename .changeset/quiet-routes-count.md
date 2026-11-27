---
'@opencupid/frontend': patch
---

Count each page once in Umami: pageviews now come from the router, so a back navigation is counted and the next page is no longer counted twice; events are recorded against the page the user is actually on

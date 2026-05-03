---
'@opencupid/frontend': patch
---

Catch synchronous SecurityError thrown by the WebSocket constructor on iOS WebKit so the rest of the app keeps working when realtime can't connect.

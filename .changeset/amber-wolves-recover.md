---
'@opencupid/ingress': patch
'@opencupid/frontend': patch
---

Fix frontend not recovering from ApiError after docker compose pull + up (#880)

Root cause: nginx cached the old container IP at startup; after container hot-swap the IP changed and nginx returned 502 indefinitely. Added Docker's embedded DNS resolver (`127.0.0.11 valid=10s`) and switched all `proxy_pass` directives to use variables so nginx re-resolves service hostnames after container replacement.

Secondary fix: WebSocket now reconnects automatically when `api:online` fires (previously autoReconnect gave up after 3 retries and was never re-attempted).

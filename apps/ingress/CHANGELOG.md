# @opencupid/ingress

## 0.45.0

### Minor Changes

- e004f68: Add Bull Board queue monitoring dashboard, accessible from the admin sidebar at /bull-board

### Patch Changes

- e61503b: Deduplicate public CSP into nginx variable; add JWT_SECRET pre-flight check in entrypoint

## 0.44.1

## 0.44.0

### Minor Changes

- d1d0c5c: Replace Redis/Lua media auth with nginx-jwt-module for JWT signature verification on /user-content/ requests; fix post-onboarding 401 caused by session deletion on profile activation; fix refresh request 415 error caused by missing Content-Type header

## 0.43.0

### Minor Changes

- 405fb4f: Replace HMAC media auth with Redis session checking; migrate JWT from localStorage to cookie

## 0.42.2

## 0.42.1

### Patch Changes

- 9a044a6: Enable Colibri WebSocket on JVB for TCP fallback when UDP media transport fails

## 0.42.0

## 0.41.1

## 0.41.0

### Patch Changes

- f3f8c15: Allow `data:` images in the admin CSP to prevent avatar and placeholder image violations.

## 0.40.2

## 0.40.1

## 0.40.0

## 0.39.3

### Patch Changes

- 0f35d93: Fix CSP font-src violation by allowing data: URIs for inlined base64 fonts (#1184)

## 0.39.2

### Patch Changes

- c47e3f3: fix: migrate map tiles from deprecated HERE legacy API to HERE Maps v3 (#1182)

## 0.39.1

## 0.39.0

## 0.38.0

## 0.37.0

## 0.36.1

## 0.36.0

## 0.35.2

## 0.35.1

## 0.35.0

## 0.34.0

## 0.33.1

## 0.33.0

## 0.32.1

## 0.32.0

## 0.31.0

## 0.30.0

## 0.29.0

### Patch Changes

- 1d2286e: Signed cookie media auth — replaces per-URL HMAC query params with a single `__media_token` cookie (#1089)

## 0.28.0

## 0.27.0

## 0.26.0

## 0.25.0

## 0.24.0

## 0.23.1

## 0.23.0

## 0.17.3

### Patch Changes

- e19b607: Consolidate CSP allowed domains into single config option

## 0.17.2

### Patch Changes

- 3624003: Fix frontend not recovering from ApiError after docker compose pull + up (#880)

  Root cause: nginx cached the old container IP at startup; after container hot-swap the IP changed and nginx returned 502 indefinitely. Added Docker's embedded DNS resolver (`127.0.0.11 valid=10s`) and switched all `proxy_pass` directives to use variables so nginx re-resolves service hostnames after container replacement.

  Secondary fix: WebSocket now reconnects automatically when `api:online` fires (previously autoReconnect gave up after 3 retries and was never re-attempted).

## 0.17.1

### Patch Changes

- c6a448e: Improve robustness of ingress certbot setup (#911)
